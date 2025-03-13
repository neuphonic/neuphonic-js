import { EventSource } from 'eventsource';
import WebSocket from 'ws';
import { Base64 } from 'js-base64';

import { Transport } from './transport';

export type SseResult = {
  send: (message: string) => Promise<Uint8Array>;
};

export type SocketResult = {
  send: (message: string) => AsyncGenerator<any>;
  close: () => Promise<void>;
};

const createResolvablePromise = () => {
  let resolvePromise: any;
  let rejectPromise: any;

  const promise = new Promise((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });

  return [promise, resolvePromise!, rejectPromise!] as const;
};

export class Tts {
  private transport: Transport;

  constructor(transport: Transport) {
    this.transport = transport;
  }

  async sse(params: Record<string, string | number>) {
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
          const chunks: string[] = [];

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
            let totalLength = 0;

            const bytes = chunks.map((chunk) => {
              const bytes = Base64.toUint8Array(chunk);

              totalLength += bytes.byteLength;

              return bytes;
            });

            let offset = 0;
            const merged = new Uint8Array(totalLength);

            bytes.forEach((bytes) => {
              merged.set(bytes, offset);

              offset += bytes.byteLength;
            });

            resolve(merged);

            es.close();
          });

          es.addEventListener('message', (event) => {
            const message = JSON.parse(event.data.toString()).data;

            chunks.push(message.audio);
          });
        });
      }
    };

    return result;
  }

  async websocket(
    params: Record<string, string | number>
  ): Promise<SocketResult> {
    const finalUrl = this.transport.url(
      'wss',
      `speak/${params['lang_code'] || 'en'}`,
      { api_key: this.transport.config.apiKey }
    );

    return new Promise((resolve, reject) => {
      const ws = new WebSocket(finalUrl);

      let connectErr = true;

      let closeErr = true;
      const pendingClose = createResolvablePromise();

      let pending = false;
      let pendingMessage = createResolvablePromise();

      const result: SocketResult = {
        async *send(message) {
          if (pending) {
            throw new Error('There are not received messages');
          }

          ws.send(message);

          pending = true;
          pendingMessage = createResolvablePromise();

          while (pending) {
            yield await pendingMessage[0];
          }
        },
        async close() {
          ws.close();
          return pendingClose[0] as Promise<void>;
        }
      };

      ws.on('error', (err) => {
        if (connectErr) {
          reject(err);
        }
        if (closeErr) {
          pendingClose[2]();
        }
      });

      ws.on('open', () => {
        connectErr = false;
        resolve(result);
      });

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString()).data;

        pendingMessage[1](Base64.toUint8Array(message.audio));

        if (message.stop) {
          pending = false;
        } else {
          pendingMessage = createResolvablePromise();
        }
      });

      ws.on('close', function open() {
        closeErr = false;
        pendingClose[1]();
      });
    });
  }
}
