import { TtsConfig } from './common';
import { createTrack } from './audio';
import { Socket, Tts } from './tts';

export type PlayerMetrics = {
  connect: number;
  firstByte: number;
};

export type Player = {
  connect: (params: TtsConfig) => Promise<void>;
  disconnect: () => Promise<void>;
  play: (message: string, onEnd?: () => void) => Promise<Uint8Array>;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  replay: (onEnd?: () => void) => void;
  close: () => Promise<void>;
  metrics: () => PlayerMetrics;
};

type Track = {
  audio: Uint8Array;
  track: AudioBufferSourceNode & {
    buffer: AudioBuffer;
  };
};

const makeAudio = (tracks: Track[]) => {
  const audioChunks = tracks.map(({ audio }) => audio);

  let offset = 0;

  const byteLen = audioChunks.reduce(
    (byteLen, chunk) => byteLen + chunk.byteLength,
    0
  );

  const allAudio = new Uint8Array(byteLen);
  audioChunks.forEach((chunk) => {
    allAudio.set(new Uint8Array(chunk), offset);
    offset += chunk.byteLength;
  });

  return allAudio;
};

export class BrowserTts extends Tts {
  protected url(params: Record<string, string | number>) {
    return this.transport.urlJwt(
      'wss',
      `speak/${params['lang_code'] || 'en'}`,
      params
    );
  }

  player(): Player {
    let ttsParams: TtsConfig | undefined;

    let startTime = 0;
    let connectTime = 0;
    let socketCtx: Socket | undefined;

    let audioCtx: AudioContext | undefined;

    const ctx = () => {
      if (!audioCtx) {
        duration = 0;
        audioCtx = new AudioContext({
          sampleRate: ttsParams?.sampling_rate || 22050
        });
      }

      return audioCtx;
    };

    const sck = async () => {
      if (!socketCtx) {
        startTime = Date.now();
        socketCtx = await this.websocket(ttsParams || {});
        connectTime = Date.now() - startTime;
      }

      return socketCtx;
    };

    const makeTrack = async (audio: Uint8Array) => {
      return createTrack(
        audio.buffer,
        ctx(),
        ttsParams?.output_format,
        ttsParams?.sampling_rate
      );
    };

    const onLastTrackEnd = (onEnd?: () => void) => {
      if (!onEnd) {
        return;
      }

      if (stoped) {
        onEnd();
      } else {
        const lastTrack = tracks[tracks.length - 1];
        if (!lastTrack) {
          return;
        }

        lastTrack.track.onended = () => {
          const delay = (ctx().currentTime - duration) * 1000;

          if (delay < 1) {
            onEnd();
          } else {
            setTimeout(() => onEnd(), delay);
          }
        };
      }
    };

    let firstByteTime = 0;
    let duration = 0;
    let stoped = false;
    let tracks: Track[] = [];

    return {
      async play(message: string, onEnd?: () => void) {
        const socket = await sck();

        const startPlayTime = Date.now();

        tracks = [];
        stoped = false;
        firstByteTime = 0;

        for await (const chunk of socket.send(`${message.trim()} <STOP>`)) {
          if (firstByteTime === 0) {
            firstByteTime = Date.now() - startPlayTime;
          }

          if (stoped) {
            break;
          }

          if (!chunk.audio.length) {
            continue;
          }

          const track = await makeTrack(chunk.audio);

          track.connect(ctx().destination);

          duration = Math.max(ctx().currentTime, duration);

          tracks.push({ audio: chunk.audio, track });

          track.start(duration);

          duration += track.buffer.duration;
        }

        onLastTrackEnd(onEnd);

        return makeAudio(tracks);
      },
      stop() {
        stoped = true;
        tracks.forEach(({ track }) => track.stop());
        duration = ctx().currentTime;
      },
      async replay(onEnd?: () => void) {
        stoped = false;

        const audio = makeAudio(tracks);
        const track = await makeTrack(audio);

        tracks = [{ audio, track }];

        track.connect(ctx().destination);

        duration = Math.max(ctx().currentTime, duration);

        track.start(duration);

        duration += track.buffer.duration;

        onLastTrackEnd(onEnd);
      },
      pause() {
        if (ctx().state === 'running') {
          ctx().suspend();
        }
      },
      resume() {
        if (ctx().state === 'suspended') {
          ctx().resume();
        }
      },
      metrics() {
        return {
          connect: connectTime,
          firstByte: firstByteTime
        };
      },
      async connect(params) {
        ttsParams = params;
        await sck();
      },
      async disconnect() {
        socketCtx?.close();
      },
      async close() {
        socketCtx?.close();
        await ctx().close();
      }
    };
  }
}
