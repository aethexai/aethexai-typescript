/**
 * Realtime WebRTC conversations with Aethex voice agents.
 *
 * Opt-in entry point (`import { Conversation } from "aethexai/realtime"`) so the
 * core SDK stays dependency-free and DOM-free. Browser-first; pass a
 * `peerConnectionFactory` to run under a Node WebRTC implementation.
 */
export { Conversation } from "./conversation";
export type {
  ConversationOptions,
  ConversationStatus,
  ConversationEventMap,
  ToolCall,
} from "./conversation";
export { TypedEmitter } from "./emitter";
export type { Listener } from "./emitter";
