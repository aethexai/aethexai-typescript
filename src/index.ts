/**
 * Aethex AI TypeScript SDK.
 *
 * The official SDK for the Aethex voice AI platform (TTS, ASR/transcription,
 * voice agents, calls, conversations).
 *
 * - {@link AethexAI} — API-key authenticated platform operations.
 * - {@link Kora} — focused voice-agent workflows.
 * - {@link DeveloperClient} — JWT-authenticated developer account + billing.
 */

export { AethexAI } from "./client";
export type { AethexAIOptions, CallStatus, PageParams } from "./client";

export { Kora } from "./kora";
export type { AgentExtras, CallExtras, KoraOptions } from "./kora";

export { DeveloperClient } from "./developer";
export type { CursorParams, DeveloperClientOptions } from "./developer";

export { PaginatedResponse } from "./pagination";
export type { RawPage } from "./pagination";

export {
  AethexError,
  APIConnectionError,
  APIStatusError,
  APITimeoutError,
  AuthenticationError,
  ConflictError,
  InternalServerError,
  NotFoundError,
  PermissionDeniedError,
  RateLimitError,
  ValidationError,
} from "./errors";

export { VERSION } from "./version";

/**
 * Generated request/response model types (e.g. `AgentResponse`, `CallCreate`,
 * `TtsRequest`). Import as a namespace to avoid polluting the top-level export
 * surface: `import type { components } from "aethexai"` is not needed — use
 * `import { type AethexAI } from "aethexai"` and reference `Aethex.AgentResponse`.
 */
export type * as Aethex from "./_generated/types.gen";
