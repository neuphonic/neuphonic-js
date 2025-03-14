import { EventSource } from 'eventsource';
import WebSocket from 'ws';
import { Base64 } from 'js-base64';

import { Transport } from './transport';

export type TtsConfig = {
  voice_id: string;
  speed?: number;
  temperature?: number;
  lang_code?: string;
  sampling_rate?: number;
  encoding?: string;
};

export type TtsMessage = {
  audio: Uint8Array;
  text: string;
  sampling_rate: number;
};

type Data = { audio: string; text: string; sampling_rate: number };

export type SseResult = {
  send: (message: string) => Promise<TtsMessage>;
};

export type SocketResult = {
  send: (message: string) => AsyncGenerator<TtsMessage>;
  close: () => Promise<void>;
};

type Resolvable<T> = [Promise<T>, (data: T) => void, (err: unknown) => void];

const createResolvablePromise = <T>(): Resolvable<T> => {
  let resolvePromise: (data: T) => void;
  let rejectPromise: (err: unknown) => void;

  const promise = new Promise<T>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });

  return [promise, resolvePromise!, rejectPromise!];
};

export class Tts {
  private transport: Transport;

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

    const result: SseResult = {
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

  async websocket(params: TtsConfig): Promise<SocketResult> {
    const finalUrl = this.transport.url(
      'wss',
      `speak/${params['lang_code'] || 'en'}`,
      { api_key: this.transport.config.apiKey }
    );

    return new Promise((resolveConnect, rejectConnectErr) => {
      const ws = new WebSocket(finalUrl);

      let connectErr = true;

      let pendingClose: Resolvable<void> | undefined;

      let pending = false;
      let pendingMessage: Resolvable<TtsMessage> | undefined;

      const result: SocketResult = {
        async *send(message) {
          if (pending) {
            throw new Error('Still receiving the messages');
          }

          ws.send(message);

          pending = true;
          pendingMessage = createResolvablePromise();

          while (pending) {
            yield await pendingMessage[0];
          }
        },
        async close() {
          if (pendingClose) {
            return pendingClose[0];
          }

          ws.close();
          pendingClose = createResolvablePromise();

          return pendingClose[0];
        }
      };

      ws.on('error', (err) => {
        if (connectErr) {
          rejectConnectErr(err);
        }
        if (pendingClose) {
          pendingClose[2](err);
        }
      });

      ws.on('open', () => {
        connectErr = false;
        resolveConnect(result);
      });

      ws.on('message', (data) => {
        if (!pendingMessage) {
          return;
        }

        const message = JSON.parse(data.toString()).data;

        pendingMessage[1]({
          sampling_rate: message.sampling_rate,
          audio: Base64.toUint8Array(message.audio),
          text: message.text
        });

        if (message.stop) {
          pending = false;
        } else {
          pendingMessage = createResolvablePromise();
        }
      });

      ws.on('close', function open() {
        if (!pendingClose) {
          pendingClose = createResolvablePromise();
        }

        pendingClose[1]();
      });
    });
  }
}
