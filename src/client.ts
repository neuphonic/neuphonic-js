import { Transport } from './transport';
import { Voices } from './voices';
import { Restorations } from './restorations';
import { apiKey, baseURL } from './env';

export interface ClientConfig {
  baseURL: string;
  apiKey: string;
}

export class Client {
  config: ClientConfig;
  readonly voices: Voices;
  readonly restorations: Restorations;

  constructor(config: ClientConfig, transport: Transport) {
    this.config = config;
    this.voices = new Voices(transport);
    this.restorations = new Restorations(transport);
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
