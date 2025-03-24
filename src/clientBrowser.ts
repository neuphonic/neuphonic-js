import { Agent, AgentConfig } from './agent';
import { TtsConfig } from './common';
import { Transport } from './transport';

export interface PublicClientConfig {
  baseURL: string;
}

export class PublicClient {
  readonly config: PublicClientConfig;
  private transport: Transport;

  constructor(config: PublicClientConfig, transport: Transport) {
    this.config = config;
    this.transport = transport;
  }

  createAgent(
    config: AgentConfig,
    ttsConfig: TtsConfig = {},
    streamConfig: MediaStreamConstraints = {}
  ) {
    return new Agent(this.transport, config, ttsConfig, streamConfig);
  }
}

export const createBrowserClient = (
  config: Partial<PublicClientConfig> = {}
) => {
  const mergedConfig = {
    baseURL: 'eu-west-1.api.neuphonic.com',
    ...config
  };

  const transport = new Transport(mergedConfig);

  return new PublicClient(mergedConfig, transport);
};
