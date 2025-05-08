import { AgentConfig } from './agent-base';
import { Agent } from './agent';
import { TtsConfig } from './common';
import { baseURL, mergeConfig } from './config';
import { Transport } from './transport';
import { BrowserTts } from './tts';

export interface PublicClientConfig {
  baseURL: string;
  jwtToken?: string;
}

export class PublicClient {
  private transport: Transport;
  readonly config: PublicClientConfig;
  readonly tts: BrowserTts;

  constructor(config: PublicClientConfig, transport: Transport) {
    this.config = config;
    this.transport = transport;
    this.tts = new BrowserTts(transport);
  }

  jwt(token: string) {
    this.transport.jwt(token);
  }

  createAgent(
    config: AgentConfig,
    ttsConfig: TtsConfig = {},
    streamConfig: MediaStreamConstraints = {}
  ) {
    const jwtToken = this.transport.config.jwtToken;

    if (!jwtToken) {
      throw new Error('JWT token is required');
    }

    return new Agent(this.transport, config, ttsConfig, streamConfig);
  }
}

export const createBrowserClient = (
  config: Partial<PublicClientConfig> = {}
) => {
  const mergedConfig = mergeConfig(
    {
      baseURL
    },
    config
  );

  const transport = new Transport(mergedConfig);

  return new PublicClient(mergedConfig, transport);
};
