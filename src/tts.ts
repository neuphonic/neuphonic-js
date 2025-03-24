import { EventSource } from 'eventsource';
import { Base64 } from 'js-base64';

import { Transport } from './transport';
import { createWebsocket, createResolvablePromise, Resolvable } from './socket';
import { TtsConfig, TtsMessage } from './common';

type Data = { audio: string; text: string; sampling_rate: number };

export type SseResult = {
  send: (message: string) => Promise<TtsMessage>;
};

export type SocketResult = {
  send: (message: string) => AsyncGenerator<TtsMessage>;
  close: () => Promise<void>;
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
      { ...params, api_key: this.transport.config.apiKey }
    );

    let pending = false;
    let pendingMessage: Resolvable<TtsMessage> | undefined;

    const socket = await createWebsocket(finalUrl);

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

    const result: SocketResult = {
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

    return result;
  }
}
