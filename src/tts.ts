import { EventSource } from 'eventsource';
import { Base64 } from 'js-base64';

import { Transport } from './transport';
import { createWebsocket, createResolvablePromise } from './socket';
import { createErr, TtsConfig, TtsMessage } from './common';
import { createTrack } from './audio';

type Data = { audio: string; text: string; sampling_rate: number };

export type Sse = {
  send: (message: string) => Promise<TtsMessage>;
};

export type Socket = {
  send: (message: string) => AsyncGenerator<TtsMessage>;
  stop: () => void;
  close: () => Promise<void>;
};

export type OnMessage = (data: TtsMessage) => void;

export type SocketEvent = {
  send: (message: string) => void;
  onMessage: (cb: OnMessage) => void;
  waitForMessages: () => Promise<boolean>;
  close: () => Promise<void>;
};

const errClosed = () => {
  return createErr('TtsError', 'Socket already closed');
};

export class Tts {
  protected transport: Transport;

  constructor(transport: Transport) {
    this.transport = transport;
  }

  async sse(params: TtsConfig) {
    const finalUrl = this.transport.url(
      'https',
      `sse/speak/${params['lang_code'] || 'en'}`,
      { api_key: this.transport.config.apiKey }
    );
    const fetchFn = this.transport.fetch;
    const headers = this.transport.headers;

    const result: Sse = {
      async send(message) {
        return new Promise((resolve) => {
          const chunks: Data[] = [];

          const es = new EventSource(finalUrl, {
            fetch: (input, init) =>
              fetchFn(input, {
                ...init,
                method: 'POST',
                headers: {
                  ...(init ?? {}).headers,
                  ...headers
                },
                body: JSON.stringify({ ...params, text: message })
              })
          });

          es.addEventListener('error', () => {
            es.close();

            const bytes: Uint8Array[] = [];
            let text = '';
            let samplingRate = 0;
            let totalLength = 0;

            chunks.forEach((chunk) => {
              const chunkBytes = Base64.toUint8Array(chunk.audio);

              totalLength += chunkBytes.byteLength;
              text += chunk.text;
              samplingRate = chunk.sampling_rate;
              bytes.push(chunkBytes);
            });

            let offset = 0;
            const merged = new Uint8Array(totalLength);

            bytes.forEach((bytes) => {
              merged.set(bytes, offset);

              offset += bytes.byteLength;
            });

            resolve({
              sampling_rate: samplingRate,
              audio: merged,
              text,
              stop: true
            });
          });

          es.addEventListener('message', (event) => {
            const message = JSON.parse(event.data.toString()).data;

            chunks.push(message);
          });
        });
      }
    };

    return result;
  }

  protected url(params: Record<string, string | number>) {
    return this.transport.url('wss', `speak/${params['lang_code'] || 'en'}`, {
      ...params,
      api_key: this.transport.config.apiKey
    });
  }

  async websocketCb(params: TtsConfig): Promise<SocketEvent> {
    let wasClosed = false;
    let messageCount = 0;
    let messagesComplete = createResolvablePromise<boolean>();
    let messagesRejectTimeout: NodeJS.Timeout | undefined;

    let onMessage: OnMessage = () => {};

    const socket = await createWebsocket(this.url(params));

    socket.onMessage((message) => {
      const data = JSON.parse(message.data.toString()).data;

      onMessage({
        sampling_rate: data.sampling_rate,
        audio: Base64.toUint8Array(data.audio),
        text: data.text,
        stop: data.stop
      });

      if (data.stop) {
        messageCount--;
      }

      if (messageCount == 0) {
        clearTimeout(messagesRejectTimeout);
        messagesComplete[1](true);
        messagesComplete = createResolvablePromise();
      }
    });

    socket.onClose(() => {
      wasClosed = true;
      clearTimeout(messagesRejectTimeout);
      messagesComplete[1](messageCount == 0);
    });

    return {
      send(message) {
        if (wasClosed) {
          throw errClosed();
        }

        messageCount++;
        clearTimeout(messagesRejectTimeout);

        const delay = Math.min(message.length * 10 + 3000, 15 * 60 * 1000);
        messagesRejectTimeout = setTimeout(() => {
          messagesComplete[1](false);
        }, delay);

        socket.send(message);
      },
      async onMessage(cb) {
        onMessage = cb;
      },
      waitForMessages() {
        return messagesComplete[0];
      },
      async close() {
        wasClosed = true;
        return socket.close();
      }
    };
  }

  async websocket(params: TtsConfig): Promise<Socket> {
    let wasClosed = false;
    let pendings: TtsMessage[] | undefined;

    const socket = await createWebsocket(this.url(params));

    socket.onMessage((message) => {
      if (!pendings) {
        return;
      }

      const data = JSON.parse(message.data.toString()).data;

      pendings.push({
        sampling_rate: data.sampling_rate,
        audio: Base64.toUint8Array(data.audio),
        text: data.text,
        stop: data.stop
      });
    });

    socket.onClose(() => {
      wasClosed = true;
      pendings = undefined;
    });

    return {
      async *send(message) {
        if (wasClosed) {
          throw errClosed();
        }
        if (pendings) {
          throw createErr('TtsError', 'Still receiving the messages');
        }

        socket.send(message);

        pendings = [];

        try {
          while (true) {
            const message = pendings.shift();

            if (message) {
              yield message;

              if (message.stop) {
                break;
              }
            }

            await new Promise((resolve) => setTimeout(resolve, 5));
          }
        } finally {
          pendings = undefined;
        }
      },
      stop() {
        pendings = undefined;
      },
      async close() {
        pendings = undefined;
        wasClosed = true;
        return socket.close();
      }
    };
  }
}

export type Player = {
  play: (message: string) => void;
  stop: () => void;
  close: () => Promise<void>;
};

export class BrowserTts extends Tts {
  protected url(params: Record<string, string | number>) {
    return this.transport.urlJwt(
      'wss',
      `speak/${params['lang_code'] || 'en'}`,
      params
    );
  }

  async player(params: TtsConfig): Promise<Player> {
    const socket = await this.websocket(params);
    let audioCtx: AudioContext | undefined;

    const ctx = () => {
      if (!audioCtx) {
        duration = 0;
        audioCtx = new AudioContext({
          sampleRate: params.sampling_rate || 22050
        });
      }

      return audioCtx;
    };

    let duration = 0;
    let stoped = false;
    let tracks: AudioBufferSourceNode[] = [];

    return {
      async play(message: string) {
        tracks = [];
        stoped = false;

        for await (const chunk of socket.send(`${message.trim()} <STOP>`)) {
          if (stoped) {
            break;
          }

          const track = await createTrack(
            chunk.audio.buffer,
            ctx(),
            params.output_format,
            params.sampling_rate
          );
          tracks.push(track);

          track.connect(ctx().destination);

          duration = Math.max(ctx().currentTime, duration);

          track.start(duration);

          duration += track.buffer.duration;
        }

        const lastTrack = tracks[tracks.length - 1];

        if (lastTrack) {
          await new Promise<void>((resolve) => {
            lastTrack.onended = () => {
              const delay = (ctx().currentTime - duration) * 1000;

              if (delay < 1) {
                resolve();
              } else {
                setTimeout(() => resolve(), delay);
              }
            };
          });
        }
      },
      stop() {
        stoped = true;
        tracks.forEach((track) => track.stop());
        duration = ctx().currentTime;
      },
      async close() {
        await socket.close();
        await ctx().close();
      }
    };
  }
}
