import { Transport } from './transport';
import { Voices } from './voices';
import { Restorations } from './restorations';
import { Tts } from './tts';
import { apiKey, baseURL } from './env';

export interface ClientConfig {
  baseURL: string;
  apiKey: string;
}

export class Client {
  readonly config: ClientConfig;
  readonly voices: Voices;
  readonly restorations: Restorations;
  readonly tts: Tts;

  constructor(config: ClientConfig, transport: Transport) {
    this.config = config;
    this.voices = new Voices(transport);
    this.restorations = new Restorations(transport);
    this.tts = new Tts(transport);
  }
}

export const createClient = (config: Partial<ClientConfig> = {}) => {
  const mergedConfig = {
    baseURL,
    apiKey,
    ...config
  };

  const transport = new Transport(mergedConfig);

  return new Client(mergedConfig, transport);
};
