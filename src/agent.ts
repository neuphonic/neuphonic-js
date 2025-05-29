import { Base64 } from 'js-base64';

import { Transport } from './transport';
import { createWebsocket } from './socket';
import { createTrack } from './audio';
import { TtsConfig } from './common';
import { AgentWebSocketResponse, AgentConfig } from './agent-base';

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
};

export type AgentResult = {
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
    const url = this.transport.urlJwt('wss', 'agents', {
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
      interrupt() {
        audioCtx?.close();
        audioCtx = undefined;
      },
      play(bytes, onEnd) {
        (async () => {
          const track = await createTrack(
            bytes,
            ctx(),
            ttsConfig.output_format,
            ttsConfig.sampling_rate
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
        })();
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

    let playing = false;

    this.currentAgent = {
      onText(cb: onText) {
        onText = cb;
      },
      onAudio(cb: OnAudio) {
        onAudio = cb;
      },
      async stop() {
        if (playing) {
          onAudio(false);
        }
        await media.stop();
        await socket.close();
      }
    };

    media.start();

    media.onData((data) => {
      socket.send(data);
    });

    socket.onMessage((message) => {
      const received = JSON.parse(
        message.data.toString()
      ) as AgentWebSocketResponse;

      if (received.data && 'text' in received.data) {
        const text = received.data.text;
        const role =
          received.data.type === 'user_transcript' ? 'user' : 'assistant';

        onText(role, text);
      }

      if (received.data && 'audio' in received.data) {
        const byteArray = Base64.toUint8Array(received.data.audio).buffer;

        if (byteArray.byteLength === 0) {
          return;
        }

        if (!playing) {
          playing = true;
          onAudio(playing);
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
    });

    return this.currentAgent;
  }
}
