/**
 * Kora — focused voice-only client for Aethex AI.
 *
 * Kora is a flat, ergonomic wrapper that exposes only the voice-building
 * surface of the Aethex API: agents, outbound calls, voices, text-to-speech,
 * transcription, and read-only conversation history.
 *
 * Account-management endpoints (api keys, billing, phone numbers, SIP trunks,
 * webhooks, usage) intentionally live on {@link AethexAI}, not on Kora. Kora is
 * for building voice agents, not running the account.
 *
 * ```ts
 * import { Kora } from "aethexai";
 *
 * const kora = new Kora("https://api.aethexai.com", "ae_live_...");
 * const agent = await kora.createAgent("Aethex Agent", "You are a banking assistant.", "fatima", {
 *   first_message: "Bonjour!",
 *   language: "french",
 *   dialect_style: "local",
 * });
 * await kora.triggerCall(agent.id, "+221700000000");
 * ```
 */
import {
  type BinaryInput,
  type Client,
  callBinary,
  callOp,
  callStream,
  createInstanceClient,
  toUploadFile,
} from "./_core";
import { PaginatedResponse, type RawPage } from "./pagination";
import {
  createAgentApiV1AgentsPost,
  deleteAgentApiV1AgentsAgentIdDelete,
  duplicateAgentApiV1AgentsAgentIdDuplicatePost,
  getAgentApiV1AgentsAgentIdGet,
  getAudioApiV1ConversationsConversationIdAudioGet,
  getCallApiV1CallsCallIdGet,
  getCallStatusApiV1CallsCallIdStatusGet,
  getConversationApiV1ConversationsConversationIdGet,
  getTranscriptApiV1ConversationsConversationIdTranscriptGet,
  getTranscriptionJobApiV1TranscribeJobIdGet,
  getVoiceApiV1VoicesVoiceIdGet,
  listAgentsApiV1AgentsGet,
  listCallsApiV1CallsGet,
  listConversationsApiV1ConversationsGet,
  listVoicesApiV1VoicesGet,
  previewVoiceApiV1VoicesPreviewPost,
  streamAudioApiV1ConversationsConversationIdAudioWavGet,
  synthesizeApiV1TtsPost,
  synthesizeStreamApiV1TtsStreamPost,
  transcribeAsyncApiV1TranscribeAsyncPost,
  transcribeSyncApiV1TranscribePost,
  triggerCallApiV1CallsTriggerPost,
  updateAgentApiV1AgentsAgentIdPatch,
} from "./_generated/sdk.gen";
import type {
  AgentCreate,
  AgentResponse,
  AgentUpdate,
  CallCreate,
  CallResponse,
  ConversationResponse,
} from "./_generated/types.gen";

const DEFAULT_BASE_URL = "https://api.aethexai.com";
const DEFAULT_TIMEOUT_MS = 30_000;

export interface KoraOptions {
  /** Per-request timeout in milliseconds. Defaults to 30000. */
  timeout?: number;
  /** Custom fetch implementation. Defaults to `globalThis.fetch`. */
  fetch?: typeof fetch;
}

/** Extra agent fields beyond the three required positional args. */
export type AgentExtras = Partial<Omit<AgentCreate, "name" | "system_prompt" | "voice_id">>;
/** Extra call fields beyond the two required positional args. */
export type CallExtras = Partial<Omit<CallCreate, "agent_id" | "to_number">>;

export class Kora {
  readonly baseURL: string;
  private readonly client: Client;

  /**
   * @param baseURL Aethex API base URL, e.g. `https://api.aethexai.com`.
   * @param apiKey API key sent as the `X-API-Key` header.
   */
  constructor(baseURL: string = DEFAULT_BASE_URL, apiKey = "", options: KoraOptions = {}) {
    if (!apiKey.trim()) {
      throw new Error("apiKey is required. Pass it positionally: new Kora(baseURL, apiKey).");
    }
    this.baseURL = baseURL.replace(/\/+$/, "");
    this.client = createInstanceClient({
      baseUrl: this.baseURL,
      headers: { "X-API-Key": apiKey },
      timeoutMs: options.timeout ?? DEFAULT_TIMEOUT_MS,
      fetch: options.fetch,
    });
  }

  // ---------------------------------------------------------------- Agents

  /** Create a new voice agent. */
  createAgent(
    name: string,
    systemPrompt: string,
    voiceId: string,
    extra: AgentExtras = {},
  ): Promise<AgentResponse> {
    return callOp(this.client, createAgentApiV1AgentsPost, {
      body: { name, system_prompt: systemPrompt, voice_id: voiceId, ...extra },
    });
  }

  /** Fetch a single agent by id. */
  getAgent(agentId: string): Promise<AgentResponse> {
    return callOp(this.client, getAgentApiV1AgentsAgentIdGet, { path: { agent_id: agentId } });
  }

  /** List agents (one page). */
  async listAgents(
    params: { limit?: number; offset?: number } = {},
  ): Promise<PaginatedResponse<AgentResponse>> {
    const raw = await callOp(this.client, listAgentsApiV1AgentsGet, { query: params });
    return new PaginatedResponse<AgentResponse>(raw as RawPage<AgentResponse>);
  }

  /** Partially update an agent's configuration. */
  updateAgent(agentId: string, fields: AgentUpdate): Promise<AgentResponse> {
    return callOp(this.client, updateAgentApiV1AgentsAgentIdPatch, {
      path: { agent_id: agentId },
      body: fields,
    });
  }

  /** Permanently delete an agent. */
  deleteAgent(agentId: string) {
    return callOp(this.client, deleteAgentApiV1AgentsAgentIdDelete, {
      path: { agent_id: agentId },
    });
  }

  /** Clone an agent, returning the new duplicate. */
  duplicateAgent(agentId: string): Promise<AgentResponse> {
    return callOp(this.client, duplicateAgentApiV1AgentsAgentIdDuplicatePost, {
      path: { agent_id: agentId },
    });
  }

  // ----------------------------------------------------------------- Calls

  /** Trigger an outbound voice call from `agentId` to `toNumber`. */
  triggerCall(agentId: string, toNumber: string, extra: CallExtras = {}) {
    return callOp(this.client, triggerCallApiV1CallsTriggerPost, {
      body: { agent_id: agentId, to_number: toNumber, ...extra },
    });
  }

  /** Fetch a call record by id. */
  getCall(callId: string): Promise<CallResponse> {
    return callOp(this.client, getCallApiV1CallsCallIdGet, { path: { call_id: callId } });
  }

  /** List recent calls (one page). */
  async listCalls(
    params: { limit?: number; offset?: number } = {},
  ): Promise<PaginatedResponse<CallResponse>> {
    const raw = await callOp(this.client, listCallsApiV1CallsGet, { query: params });
    return new PaginatedResponse<CallResponse>(raw as RawPage<CallResponse>);
  }

  /** Fetch the current status of a call. */
  getCallStatus(callId: string) {
    return callOp(this.client, getCallStatusApiV1CallsCallIdStatusGet, {
      path: { call_id: callId },
    });
  }

  // ---------------------------------------------------------------- Voices

  /** List available TTS voices, optionally filtered by `language` or `tag`. */
  listVoices(
    opts: {
      language?: string | null;
      supportsDialectStyle?: boolean | null;
      tag?: string | null;
      limit?: number;
      offset?: number;
    } = {},
  ) {
    return callOp(this.client, listVoicesApiV1VoicesGet, {
      query: {
        language: opts.language ?? null,
        supports_dialect_style: opts.supportsDialectStyle ?? null,
        tag: opts.tag ?? null,
        limit: opts.limit ?? 100,
        offset: opts.offset ?? 0,
      },
    });
  }

  /** Fetch metadata for a single voice. */
  getVoice(voiceId: string) {
    return callOp(this.client, getVoiceApiV1VoicesVoiceIdGet, { path: { voice_id: voiceId } });
  }

  /** Generate a short voice preview, returning audio bytes (WAV). */
  previewVoice(voiceId: string, text?: string): Promise<Uint8Array> {
    return callBinary(this.client, previewVoiceApiV1VoicesPreviewPost, {
      body: { voice_id: voiceId, ...(text != null ? { text } : {}) },
    });
  }

  // ------------------------------------------------------------------- TTS

  /** Synthesize `text` to audio bytes (WAV) using `voiceId`. */
  synthesizeSpeech(
    text: string,
    voiceId: string,
    opts: { language?: string } & Record<string, unknown> = {},
  ): Promise<Uint8Array> {
    return callBinary(this.client, synthesizeApiV1TtsPost, {
      body: { text, voice_id: voiceId, ...opts },
    });
  }

  /** Stream synthesized speech as audio byte chunks (PCM16, 24kHz). */
  streamSpeech(
    text: string,
    voiceId: string,
    opts: { language?: string } & Record<string, unknown> = {},
  ): AsyncGenerator<Uint8Array> {
    return callStream(this.client, synthesizeStreamApiV1TtsStreamPost, {
      body: { text, voice_id: voiceId, ...opts },
    });
  }

  // ---------------------------------------------------------- Transcription

  /** Transcribe an audio file synchronously, returning the full transcript. */
  transcribe(
    file: BinaryInput,
    opts: { language?: string | null; fileName?: string; mimeType?: string } = {},
  ) {
    const upload = toUploadFile(file, opts.fileName, opts.mimeType);
    return callOp(this.client, transcribeSyncApiV1TranscribePost, {
      body: { file: upload, language: opts.language ?? null },
    });
  }

  /** Submit an audio file for async transcription, returning a job handle. */
  transcribeAsync(
    file: BinaryInput,
    opts: {
      language?: string | null;
      webhookUrl?: string | null;
      fileName?: string;
      mimeType?: string;
    } = {},
  ) {
    const upload = toUploadFile(file, opts.fileName, opts.mimeType);
    return callOp(this.client, transcribeAsyncApiV1TranscribeAsyncPost, {
      body: { file: upload, language: opts.language ?? null, webhook_url: opts.webhookUrl ?? null },
    });
  }

  /** Poll an async transcription job by id. */
  getTranscribeJob(jobId: string) {
    return callOp(this.client, getTranscriptionJobApiV1TranscribeJobIdGet, {
      path: { job_id: jobId },
    });
  }

  // ---------------------------------------------------- Conversation history

  /** Fetch a single conversation record by id. */
  getConversation(conversationId: string): Promise<ConversationResponse> {
    return callOp(this.client, getConversationApiV1ConversationsConversationIdGet, {
      path: { conversation_id: conversationId },
    });
  }

  /**
   * List conversations (one page).
   *
   * Note: the underlying endpoint does not support an `agentId` filter; if one
   * is supplied here it is applied client-side to the returned page.
   */
  async listConversations(
    params: { agentId?: string; limit?: number; offset?: number } = {},
  ): Promise<PaginatedResponse<ConversationResponse>> {
    const { agentId, ...page } = params;
    const raw = await callOp(this.client, listConversationsApiV1ConversationsGet, { query: page });
    const result = new PaginatedResponse<ConversationResponse>(
      raw as RawPage<ConversationResponse>,
    );
    if (agentId == null) return result;
    const filtered = result.data.filter(
      (item) => String((item as { agent_id?: unknown }).agent_id) === agentId,
    );
    return new PaginatedResponse<ConversationResponse>({
      data: filtered,
      limit: result.limit,
      offset: result.offset,
      total: result.total,
    });
  }

  /** Fetch the per-turn transcript for a conversation. */
  getConversationTranscript(conversationId: string) {
    return callOp(this.client, getTranscriptApiV1ConversationsConversationIdTranscriptGet, {
      path: { conversation_id: conversationId },
    });
  }

  /** Fetch the raw audio bytes for a conversation recording (WAV). */
  getConversationAudio(conversationId: string): Promise<Uint8Array> {
    return callBinary(this.client, streamAudioApiV1ConversationsConversationIdAudioWavGet, {
      path: { conversation_id: conversationId },
    });
  }

  /** Fetch a short-lived signed URL pointing to the conversation audio. */
  getConversationAudioUrl(conversationId: string) {
    return callOp(this.client, getAudioApiV1ConversationsConversationIdAudioGet, {
      path: { conversation_id: conversationId },
    });
  }
}
