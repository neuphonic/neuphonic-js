import { Transport } from './transport';
import { createWebsocket } from './socket';
import { TtsConfig } from './common';

export type UserTranscriptResponse = {
  data: {
    type: 'user_transcript';
    text: string;
  };
};

export type LlmResponse = {
  data: {
    type: 'llm_response';
    text: string;
  };
};

export type AudioResponse = {
  data: {
    type: 'audio_response';
    audio: string;
  };
};

export type StopAudio = {
  data: {
    type: 'stop_audio_response';
  };
};

export type AgentWebSocketResponse =
  | UserTranscriptResponse
  | LlmResponse
  | AudioResponse
  | StopAudio;

export interface AgentConfig {
  agent_id: string;
  incoming_mode?: string;
  return_sampling_rate?: TtsConfig['sampling_rate'];
  incoming_encoding?: string;
  return_encoding?: string;
}

export type AgentOnMessage = (data: AgentWebSocketResponse) => void;

export type AgentResult = {
  send: (data: string | Blob) => void;
  onMessage: (cb: AgentOnMessage) => void;
  stop: () => Promise<void>;
};

export class AgentBase {
  readonly agentConfig: AgentConfig;
  readonly ttsConfig: TtsConfig;

  private transport: Transport;
  private currentAgent?: AgentResult;

  constructor(
    transport: Transport,
    agentConfig: AgentConfig,
    ttsConfig: TtsConfig = {}
  ) {
    this.transport = transport;
    this.agentConfig = {
      incoming_mode: 'bytes',
      ...agentConfig
    };
    this.ttsConfig = ttsConfig;
  }

  private async websocket() {
    const url = this.transport.urlJwt('wss', 'agents', {
      ...this.agentConfig,
      ...this.ttsConfig
    });

    return createWebsocket(url);
  }

  async stop() {
    if (!this.currentAgent) {
      return;
    }

    await this.currentAgent.stop();

    this.currentAgent = undefined;
  }

  async start() {
    if (this.currentAgent) {
      throw new Error('Agent already running');
    }

    const socket = await this.websocket();

    let onMessage: AgentOnMessage = () => {};

    this.currentAgent = {
      send(data) {
        socket.send(data);
      },
      onMessage(cb) {
        onMessage = cb;
      },
      async stop() {
        await socket.close();
      }
    };

    socket.onMessage((message) => {
      const received = JSON.parse(
        message.data.toString()
      ) as AgentWebSocketResponse;

      onMessage(received);
    });

    return this.currentAgent;
  }
}
