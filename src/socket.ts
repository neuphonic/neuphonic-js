import WebSocket from 'isomorphic-ws';
import { WsErr } from './common';

type OnMessage = (message: WebSocket.MessageEvent) => void;
type OnErr = (err: unknown) => void;

export type SocketResult = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  send: (message: any) => void;
  onMessage: (cb: OnMessage) => void;
  onErr: (cb: OnErr) => void;
  close: () => Promise<void>;
};

export type Resolvable<T> = [
  Promise<T>,
  (data: T) => void,
  (err: unknown) => void
];

export const createResolvablePromise = <T>(): Resolvable<T> => {
  let resolvePromise: (data: T) => void;
  let rejectPromise: (err: unknown) => void;

  const promise = new Promise<T>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });

  return [promise, resolvePromise!, rejectPromise!];
};

const createErr = (name: WsErr['name'], message: string, cause?: unknown) => {
  const err = new WsErr(message);
  err.name = name;
  err.cause = cause;

  return err;
};

export const createWebsocket = async (url: string): Promise<SocketResult> => {
  return new Promise((resolveConnect, rejectConnectErr) => {
    const ws = new WebSocket(url);

    let connectErr = true;
    let pendingClose: Resolvable<void> | undefined;

    let onErr: OnErr = () => {};
    let onMessage: OnMessage = () => {};

    const result: SocketResult = {
      async send(message) {
        if (!pendingClose) {
          ws.send(message);
        }
      },
      onMessage(cb) {
        onMessage = cb;
      },
      onErr(cb) {
        onErr = cb;
      },
      async close() {
        if (pendingClose) {
          return pendingClose[0];
        }

        pendingClose = createResolvablePromise();
        ws.close();

        return pendingClose[0];
      }
    };

    ws.addEventListener('error', (err) => {
      if (connectErr) {
        rejectConnectErr(
          createErr('WsConnect', "Can't connect to websocket", err)
        );
      } else if (pendingClose) {
        pendingClose[2](createErr('WsClose', "Can't close websocket", err));
      } else {
        onErr(createErr('WsError', 'Websocket error', err));
      }
    });

    ws.addEventListener('open', () => {
      connectErr = false;
      resolveConnect(result);
    });

    ws.addEventListener('message', (data) => {
      onMessage(data);
    });

    ws.addEventListener('close', function open() {
      if (!pendingClose) {
        pendingClose = createResolvablePromise();
      }

      pendingClose[1]();
    });
  });
};
