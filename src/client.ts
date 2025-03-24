import z from 'zod';

import { Transport } from './transport';
import { Voices } from './voices';
import { Restorations } from './restorations';
import { Agents } from './agents';
import { Tts } from './tts';
import { apiKey, baseURL } from './env';

const GetJwtToken = z.object({
  data: z.object({
    jwt_token: z.string()
  })
});

export interface ClientConfig {
  baseURL: string;
  apiKey: string;
}

export class Client {
  readonly config: ClientConfig;
  readonly voices: Voices;
  readonly restorations: Restorations;
  readonly agents: Agents;
  readonly tts: Tts;
  private transport: Transport;

  constructor(config: ClientConfig, transport: Transport) {
    this.config = config;
    this.transport = transport;
    this.voices = new Voices(transport);
    this.restorations = new Restorations(transport);
    this.agents = new Agents(transport);
    this.tts = new Tts(transport);
  }

  async jwt() {
    const response = await this.transport.request({
      url: 'sse/auth',
      method: 'POST'
    });

    const { data: result } = GetJwtToken.safeParse(response);

    if (result && 'data' in result) {
      return result.data.jwt_token;
    }

    throw new Error('Unknown get jwt token error');
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
