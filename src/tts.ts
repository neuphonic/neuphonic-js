import { EventSource } from 'eventsource';
import { Base64 } from 'js-base64';

import { Transport } from './transport';
import { createWebsocket, createResolvablePromise, Resolvable } from './socket';
import { TtsConfig, TtsMessage } from './common';
import { createBuffer } from './audio';

type Data = { audio: string; text: string; sampling_rate: number };

export type Sse = {
  send: (message: string) => Promise<TtsMessage>;
};

export type Socket = {
  send: (message: string) => AsyncGenerator<TtsMessage>;
  close: () => Promise<void>;
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

            resolve({ sampling_rate: samplingRate, audio: merged, text });
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

  async websocket(params: TtsConfig): Promise<Socket> {
    let pending = false;
    let pendingMessage: Resolvable<TtsMessage> | undefined;

    const socket = await createWebsocket(this.url(params));

    socket.onMessage((message) => {
      if (!pendingMessage) {
        return;
      }

      const data = JSON.parse(message.data.toString()).data;

      pendingMessage[1]({
        sampling_rate: data.sampling_rate,
        audio: Base64.toUint8Array(data.audio),
        text: data.text
      });

      if (data.stop) {
        pending = false;
      } else {
        pendingMessage = createResolvablePromise();
      }
    });

    return {
      async *send(message) {
        if (pending) {
          throw new Error('Still receiving the messages');
        }

        socket.send(message);

        pending = true;
        pendingMessage = createResolvablePromise();

        while (pending) {
          yield await pendingMessage[0];
        }
      },
      async close() {
        return socket.close();
      }
    };
  }
}

export type Player = {
  play: (message: string) => void;
  stop: () => Promise<void>;
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

    let duration = 0;
    let ctx: AudioContext | undefined;

    return {
      async play(message: string) {
        return new Promise((resolve, reject) => {
          (async () => {
            try {
              if (!ctx) {
                ctx = new AudioContext();
              }

              for await (const chunk of socket.send(
                `${message.trim()} <STOP>`
              )) {
                const track = ctx.createBufferSource();
                track.buffer = createBuffer(
                  chunk.audio.buffer,
                  ctx,
                  params.sampling_rate || 22050
                );

                track.connect(ctx.destination);

                track.onended = () => {
                  if ((ctx?.currentTime ?? duration) >= duration) {
                    resolve();
                  }
                };

                duration = Math.max(ctx.currentTime, duration);

                track.start(duration);

                duration += track.buffer.duration;
              }
            } catch (err) {
              reject(err);
            }
          })();
        });
      },
      async stop() {
        await ctx?.close();
        ctx = undefined;
      },
      async close() {
        await socket.close();
        await ctx?.close();
        ctx = undefined;
      }
    };
  }
}
