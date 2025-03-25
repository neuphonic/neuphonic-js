import { Base64 } from 'js-base64';

import { Transport } from './transport';
import { createWebsocket } from './socket';
import { createBuffer } from './util';

export type Message = {
  role: 'user' | 'assistant';
  text: string;
};

type UserTranscriptResponse = {
  data: {
    type: 'user_transcript';
    text: string;
  };
};

type LlmResponse = {
  data: {
    type: 'llm_response';
    text: string;
  };
};

type AudioResponse = {
  data: {
    type: 'audio_response';
    audio: string;
  };
};

type StoAudio = {
  data: {
    type: 'stop_audio_response';
  };
};

type AgentWebSocketResponse =
  | UserTranscriptResponse
  | LlmResponse
  | AudioResponse
  | StoAudio;

export interface AgentConfig {
  incoming_mode?: string;
  agent_id: string;
}

export type TtsConfig = {
  voice_id?: string;
  speed?: number;
  temperature?: number;
  lang_code?: string;
  sampling_rate?: number;
  encoding?: string;
};

type OnData = (data: Blob) => void;
type onText = (role: 'user' | 'assistant', text: string) => void;
type OnAudio = (playing: boolean) => void;

type MediaStreamResult = {
  play: (bytes: ArrayBufferLike, onEnd: () => void) => void;
  ctx: () => AudioContext;
  onData: (cb: OnData) => void;
  start: () => void;
  stop: () => Promise<void>;
  interrupt: () => void;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
};

type AgentResult = {
  onText: (cb: onText) => void;
  onAudio: (cb: OnAudio) => void;
  stop: () => Promise<void>;
};

export class Agent {
  readonly agentConfig: AgentConfig;
  readonly ttsConfig: TtsConfig;
  readonly streamConfig: MediaStreamConstraints;

  private transport: Transport;
  private currentAgent?: AgentResult;

  constructor(
    transport: Transport,
    agentConfig: AgentConfig,
    ttsConfig: TtsConfig = {},
    streamConfig: MediaStreamConstraints = {}
  ) {
    this.transport = transport;
    this.agentConfig = {
      incoming_mode: 'bytes',
      ...agentConfig
    };
    this.ttsConfig = ttsConfig;

    this.streamConfig = {
      audio: {
        sampleRate: 22050,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      },
      ...streamConfig
    };
  }

  private async websocket() {
    const url = this.transport.urlJwt('ws', 'agents', {
      ...this.agentConfig,
      ...this.ttsConfig
    });

    return createWebsocket(url);
  }

  async requestMedia(): Promise<MediaStreamResult> {
    const ttsConfig = this.ttsConfig;
    const stream = await navigator.mediaDevices.getUserMedia(this.streamConfig);

    let onData: OnData = () => {};

    const mediaRecorder = new MediaRecorder(stream);

    mediaRecorder.addEventListener('dataavailable', async (event) => {
      if (event.data.size > 0) {
        onData(event.data);
      }
    });

    let duration = 0;
    let audioCtx: AudioContext | undefined;

    const ctx = () => {
      if (!audioCtx) {
        duration = 0;
        audioCtx = new AudioContext();
      }

      return audioCtx;
    };

    return {
      ctx,
      onData(cb) {
        onData = cb;
      },
      start() {
        mediaRecorder.start(300);
      },
      async stop() {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
        }

        stream.getTracks().forEach((track) => track.stop());

        await audioCtx?.close();

        audioCtx = undefined;
      },
      async pause() {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.pause();
        }
        if (audioCtx?.state === 'running') {
          await audioCtx.suspend();
        }
      },
      async resume() {
        if (mediaRecorder.state === 'paused') {
          mediaRecorder.resume();
        }
        if (audioCtx?.state === 'suspended') {
          await audioCtx.resume();
        }
      },
      interrupt() {
        audioCtx?.close();
        audioCtx = undefined;
      },
      play(bytes, onEnd) {
        const track = ctx().createBufferSource();
        track.buffer = createBuffer(
          bytes,
          ctx(),
          ttsConfig.sampling_rate || 22050
        );

        track.onended = () => {
          if (ctx().currentTime >= duration) {
            onEnd();
          }
        };

        track.connect(ctx().destination);

        duration = Math.max(ctx().currentTime, duration);

        track.start(duration);

        duration += track.buffer.duration;
      }
    };
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

    const media = await this.requestMedia();

    const socket = await this.websocket();

    let onText: onText = () => {};
    let onAudio: OnAudio = () => {};

    this.currentAgent = {
      onText(cb: onText) {
        onText = cb;
      },
      onAudio(cb: OnAudio) {
        onAudio = cb;
      },
      async stop() {
        await media.stop();
        await socket.close();
      }
    };

    media.start();

    media.onData((data) => {
      socket.send(data);
    });

    let playing = false;

    socket.onMessage((message) => {
      const received = JSON.parse(
        message.data.toString()
      ) as AgentWebSocketResponse;

      if (received) {
        if (received.data && 'text' in received.data) {
          const text = received.data.text;
          const role =
            received.data.type === 'user_transcript' ? 'user' : 'assistant';

          onText(role, text);
        }

        if (received.data && 'audio' in received.data) {
          if (!playing) {
            playing = true;
            onAudio(playing);
          }

          const byteArray = Base64.toUint8Array(received.data.audio).buffer;

          if (byteArray.byteLength === 0) {
            return;
          }

          media.play(byteArray, () => {
            if (playing) {
              playing = false;
              onAudio(playing);
            }
          });
        }

        if (received.data.type === 'stop_audio_response') {
          if (playing) {
            playing = false;
            onAudio(playing);
          }

          media.interrupt();
        }
      }
    });

    return this.currentAgent;
  }
}
