export type TtsMessage = {
  audio: Uint8Array;
  text: string;
  sampling_rate: number;
  stop: boolean
};

export type TtsConfig = {
  voice_id?: string;
  speed?: number;
  temperature?: number;
  lang_code?: string;
  sampling_rate?: 8000 | 16000 | 22050;
  encoding?: string;
};

export class WsErr extends Error {
  name: 'WsConnect' | 'WsClose' | 'WsError';
  cause?: unknown;
  constructor(message: string) {
    super(message);
    this.name = 'WsError';
  }
}

export const createErr = (
  name: WsErr['name'],
  message: string,
  cause?: unknown
) => {
  const err = new WsErr(message);
  err.name = name;
  err.cause = cause;

  return err;
};
