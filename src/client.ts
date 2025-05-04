import z from 'zod';

import { Transport } from './transport';
import { Voices } from './voices';
import { Agents } from './agents';
import { Tts } from './tts';
import { apiKey, baseURL, baseHttp } from './env';
import { mergeConfig } from './config';

const GetJwtToken = z.object({
  data: z.object({
    jwt_token: z.string()
  })
});

export interface ClientConfig {
  baseURL: string;
  apiKey: string;
  baseHttp?: boolean;
}

export class Client {
  readonly config: ClientConfig;
  readonly voices: Voices;
  readonly agents: Agents;
  readonly tts: Tts;
  private transport: Transport;

  constructor(config: ClientConfig, transport: Transport) {
    this.config = config;
    this.transport = transport;
    this.voices = new Voices(transport);
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
  const mergedConfig = mergeConfig(
    {
      baseURL,
      apiKey,
      baseHttp
    },
    config
  );

  const transport = new Transport(mergedConfig);

  return new Client(mergedConfig, transport);
};
