import z from 'zod';

import { TtsConfig } from './common';
import { Transport } from './transport';
import { Voices } from './voices';
import { AgentConfig, AgentBase } from './agent-base';
import { Agents } from './agents';
import { Tts } from './tts';
import { getEnvs } from './env';
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

  createBaseAgent(config: AgentConfig, ttsConfig: TtsConfig = {}) {
    return new AgentBase(this.transport, config, ttsConfig);
  }
}

export const createClient = (config: Partial<ClientConfig> = {}) => {
  const mergedConfig = mergeConfig(
    getEnvs(),
    config
  );

  const transport = new Transport(mergedConfig);

  return new Client(mergedConfig, transport);
};
