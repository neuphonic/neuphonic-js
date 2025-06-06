export { createClient } from './client';
export { createWavHeader, toWav } from './audio';
export type { Socket as SocketResult } from './tts';
export type { TtsConfig, TtsMessage } from './common';
export { WsErr } from './common';
export type { Tts, Socket, SocketEvent, OnMessage, Sse } from './tts';
export type { Voice } from './voices';
export type {
  AgentBase,
  AgentConfig,
  AgentResult,
  AgentOnMessage,
  AgentWebSocketResponse
} from './agent-base';
