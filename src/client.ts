/**
 * Aethex AI client with a flat-method API.
 *
 * `AethexAI` is a thin, ergonomic wrapper around the generated OpenAPI client
 * at `./_generated`. Every user-facing operation is exposed as a top-level
 * async method — no nested `client.agents.create(...)` namespaces.
 *
 * ```ts
 * import { AethexAI } from "aethexai";
 *
 * const client = new AethexAI({ apiKey: "ae_live_..." });
 * const agent = await client.createAgent({ name: "Bot", system_prompt: "You are helpful." });
 * console.log(agent.id);
 * ```
 */
import {
  type BinaryInput,
  type Client,
  callBinary,
  callOp,
  callStream,
  createInstanceClient,
  readEnv,
  toUploadFile,
} from "./_core";
import { AuthenticationError, ValidationError } from "./errors";
import { PaginatedResponse, type RawPage } from "./pagination";

import {
  addToolApiV1AgentsAgentIdToolsPost,
  batchCallsApiV1CallsBatchPost,
  batchSynthesizeApiV1TtsBatchPost,
  cancelTranscriptionJobApiV1TranscribeJobIdDelete,
  connectApiV1ConversationConnectPost,
  createAgentApiV1AgentsPost,
  createApiKeyApiV1ApiKeysPost,
  createCallRecordApiV1CallsPost,
  createTriggerApiV1UsageTriggersPost,
  deleteAgentApiV1AgentsAgentIdDelete,
  deleteKnowledgeDocApiV1AgentsAgentIdKnowledgeBaseDocIdDelete,
  deleteRecordingApiV1RecordingsRecordingIdDelete,
  deleteToolApiV1AgentsAgentIdToolsToolIdDelete,
  duplicateAgentApiV1AgentsAgentIdDuplicatePost,
  endSessionApiV1ConversationSessionIdEndPost,
  getAgentApiV1AgentsAgentIdGet,
  getAudioApiV1ConversationsConversationIdAudioGet,
  getBatchApiV1CallsBatchBatchIdGet,
  getBatchApiV1TtsBatchBatchIdGet,
  getCallApiV1CallsCallIdGet,
  getCallStatusApiV1CallsCallIdStatusGet,
  getConversationApiV1ConversationsConversationIdGet,
  getDailyUsageApiV1UsageDailyGet,
  getKnowledgeTextsApiV1AgentsAgentIdKnowledgeBaseTextsGet,
  getMonthlyUsageApiV1UsageMonthlyGet,
  getPhoneNumberApiV1PhoneNumbersPnIdGet,
  getRecordingApiV1RecordingsRecordingIdGet,
  getRecordingAudioApiV1RecordingsRecordingIdAudioGet,
  getSessionStatusApiV1ConversationSessionIdStatusGet,
  getTranscriptApiV1ConversationsConversationIdTranscriptGet,
  getTranscriptionJobApiV1TranscribeJobIdGet,
  getTwilioAccountApiV1TwilioAccountsAccountIdGet,
  getUsageApiV1UsageGet,
  getUsageSummaryApiV1UsageSummaryGet,
  getVoiceApiV1VoicesVoiceIdGet,
  iceCandidateApiV1ConversationSessionIdIcePatch,
  listAgentsApiV1AgentsGet,
  listApiKeysApiV1ApiKeysGet,
  listCallsApiV1CallsGet,
  listConversationsApiV1ConversationsGet,
  listCountriesApiV1VoicesCountriesGet,
  listKnowledgeDocsApiV1AgentsAgentIdKnowledgeBaseGet,
  listModelsApiV1ModelsGet,
  listPhoneNumbersApiV1PhoneNumbersGet,
  listRecordingsApiV1RecordingsGet,
  listTagVocabularyApiV1VoicesTagVocabularyGet,
  listToolsApiV1AgentsAgentIdToolsGet,
  listTriggerFiringsApiV1UsageTriggersTriggerIdFiringsGet,
  listTriggersApiV1UsageTriggersGet,
  listTwilioAccountsApiV1TwilioAccountsGet,
  listVoicesApiV1VoicesGet,
  offerApiV1ConversationSessionIdOfferPost,
  presignUploadApiV1UploadsPresignPost,
  previewVoiceApiV1VoicesPreviewPost,
  processKnowledgeDocApiV1AgentsAgentIdKnowledgeBaseDocIdProcessPost,
  queryKnowledgeBaseApiV1AgentsAgentIdKnowledgeBaseQueryPost,
  redeliverFiringApiV1UsageTriggersTriggerIdFiringsFiringIdRedeliverPost,
  registerSipApiV1PhoneNumbersSipRegisterPost,
  registerTwilioAccountApiV1TwilioAccountsPost,
  registerTwilioApiV1PhoneNumbersTwilioRegisterPost,
  releasePhoneNumberApiV1PhoneNumbersPnIdDelete,
  releaseTwilioAccountApiV1TwilioAccountsAccountIdDelete,
  revokeApiKeyApiV1ApiKeysKeyIdDelete,
  revokeAudioTokenApiV1ConversationsConversationIdAudioRevokePost,
  rotateApiKeyApiV1ApiKeysKeyIdRotatePost,
  rotateWebhookSecretApiV1UsageWebhookSecretRotatePost,
  searchConversationsApiV1ConversationsSearchGet,
  setRoutingApiV1PhoneNumbersPnIdRoutingPost,
  streamAudioApiV1ConversationsConversationIdAudioWavGet,
  submitFeedbackApiV1ConversationsConversationIdFeedbackPost,
  synthesizeApiV1TtsPost,
  synthesizeStreamApiV1TtsStreamPost,
  toolResultApiV1ConversationSessionIdToolResultPost,
  transcribeAsyncApiV1TranscribeAsyncPost,
  transcribeAsyncByUploadApiV1TranscribeAsyncByUploadPost,
  transcribeSyncApiV1TranscribePost,
  transcribeSyncByUploadApiV1TranscribeByUploadPost,
  triggerCallApiV1CallsTriggerPost,
  updateAgentApiV1AgentsAgentIdPatch,
  updatePhoneNumberApiV1PhoneNumbersPnIdPatch,
  updateToolApiV1AgentsAgentIdToolsToolIdPatch,
  updateTriggerApiV1UsageTriggersTriggerIdPatch,
  uploadKnowledgeDocApiV1AgentsAgentIdKnowledgeBasePost,
  uploadKnowledgeDocByUploadApiV1AgentsAgentIdKnowledgeBaseByUploadPost,
} from "./_generated/sdk.gen";
import type {
  AgentCreate,
  AgentResponse,
  AgentToolCreate,
  AgentToolUpdate,
  AgentUpdate,
  ApiKeyCreate,
  AudioRevokeBody,
  BatchCallCreate,
  CallCreate,
  CallRecordCreate,
  CallResponse,
  ConnectRequest,
  ConversationFeedback,
  ConversationResponse,
  InboundRoutingConfig,
  KnowledgeDocByUploadRequest,
  KnowledgeQueryRequest,
  OfferRequest,
  PhoneNumberUpdate,
  PresignUploadRequest,
  SipRegisterRequest,
  SmallWebRtcPatchRequest,
  ToolResultRequest,
  TranscribeAsyncByUploadRequest,
  TranscribeByUploadRequest,
  TtsBatchCreate,
  TtsRequest,
  TtsStreamRequest,
  TwilioAccountCreate,
  TwilioRegisterRequest,
  UsageTriggerCreate,
  UsageTriggerUpdate,
  VoicePreviewRequest,
} from "./_generated/types.gen";

const DEFAULT_BASE_URL = "https://api.aethexai.com";
const DEFAULT_TIMEOUT_MS = 30_000;

export interface AethexAIOptions {
  /** Aethex API key. Falls back to the `AETHEX_API_KEY` env var. */
  apiKey?: string;
  /** API base URL. Defaults to `https://api.aethexai.com`. */
  baseURL?: string;
  /** Per-request timeout in milliseconds. Defaults to 30000. */
  timeout?: number;
  /** Custom fetch implementation. Defaults to `globalThis.fetch`. */
  fetch?: typeof fetch;
}

/** Common `{ offset, limit }` pagination params. */
export interface PageParams {
  offset?: number;
  limit?: number;
}

/**
 * Synchronous-style (Promise-based) Aethex AI client.
 *
 * Authenticates with an API key sent as the `X-API-Key` header. For
 * JWT-authenticated account/billing endpoints, use {@link DeveloperClient}.
 */
export class AethexAI {
  readonly baseURL: string;
  private readonly client: Client;

  constructor(options: AethexAIOptions = {}) {
    const apiKey = options.apiKey ?? readEnv("AETHEX_API_KEY") ?? "";
    if (!apiKey.trim()) {
      throw new AuthenticationError(
        "API key is required. Pass apiKey or set the AETHEX_API_KEY env var.",
        { code: "authentication_error", statusCode: 401 },
      );
    }
    this.baseURL = (options.baseURL ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.client = createInstanceClient({
      baseUrl: this.baseURL,
      headers: { "X-API-Key": apiKey },
      timeoutMs: options.timeout ?? DEFAULT_TIMEOUT_MS,
      fetch: options.fetch,
    });
  }

  // ---------------------------------------------------------------- Agents

  /** List agents (one page). See https://developers.aethexai.com/docs/api-reference/agents. */
  async listAgents(params: PageParams = {}): Promise<PaginatedResponse<AgentResponse>> {
    const raw = await callOp(this.client, listAgentsApiV1AgentsGet, { query: params });
    return new PaginatedResponse<AgentResponse>(raw as RawPage<AgentResponse>);
  }

  /** Create a new agent. See https://developers.aethexai.com/docs/api-reference/agents. */
  createAgent(body: AgentCreate): Promise<AgentResponse> {
    return callOp(this.client, createAgentApiV1AgentsPost, { body });
  }

  /** Retrieve an agent by id. */
  getAgent(agentId: string): Promise<AgentResponse> {
    return callOp(this.client, getAgentApiV1AgentsAgentIdGet, { path: { agent_id: agentId } });
  }

  /** Update an existing agent. */
  updateAgent(agentId: string, body: AgentUpdate): Promise<AgentResponse> {
    return callOp(this.client, updateAgentApiV1AgentsAgentIdPatch, {
      path: { agent_id: agentId },
      body,
    });
  }

  /** Delete an agent. */
  deleteAgent(agentId: string) {
    return callOp(this.client, deleteAgentApiV1AgentsAgentIdDelete, {
      path: { agent_id: agentId },
    });
  }

  /** Duplicate an existing agent. */
  duplicateAgent(agentId: string): Promise<AgentResponse> {
    return callOp(this.client, duplicateAgentApiV1AgentsAgentIdDuplicatePost, {
      path: { agent_id: agentId },
    });
  }

  // ------------------------------------------------------------ Agent tools

  /** List tools attached to an agent. */
  listAgentTools(agentId: string) {
    return callOp(this.client, listToolsApiV1AgentsAgentIdToolsGet, {
      path: { agent_id: agentId },
    });
  }

  /** Attach a tool to an agent. */
  addAgentTool(agentId: string, body: AgentToolCreate) {
    return callOp(this.client, addToolApiV1AgentsAgentIdToolsPost, {
      path: { agent_id: agentId },
      body,
    });
  }

  /** Update an agent tool. */
  updateAgentTool(agentId: string, toolId: string, body: AgentToolUpdate) {
    return callOp(this.client, updateToolApiV1AgentsAgentIdToolsToolIdPatch, {
      path: { agent_id: agentId, tool_id: toolId },
      body,
    });
  }

  /** Detach a tool from an agent. */
  deleteAgentTool(agentId: string, toolId: string) {
    return callOp(this.client, deleteToolApiV1AgentsAgentIdToolsToolIdDelete, {
      path: { agent_id: agentId, tool_id: toolId },
    });
  }

  // --------------------------------------------------------- Knowledge base

  /** List knowledge-base documents for an agent. */
  listKnowledgeDocs(agentId: string) {
    return callOp(this.client, listKnowledgeDocsApiV1AgentsAgentIdKnowledgeBaseGet, {
      path: { agent_id: agentId },
    });
  }

  /**
   * Upload a knowledge-base document (multipart). Provide inline `text` or an
   * uploaded `file` (`Blob`/`File`/bytes). `filename` is the stored document
   * name; `fileName`/`mimeType` set the uploaded part's metadata.
   */
  async uploadKnowledgeDoc(
    agentId: string,
    params: {
      text?: string | null;
      file?: BinaryInput;
      filename?: string | null;
      fileName?: string;
      mimeType?: string;
    },
  ) {
    if (params.text == null && params.file == null) {
      throw new ValidationError("Provide 'text' or 'file' to upload a knowledge-base document.", {
        code: "validation_error",
        statusCode: 422,
        response: {
          error: "Validation failed",
          code: "validation_error",
          detail: [{ type: "missing", loc: ["body", "text"], msg: "Provide 'text' or 'file'." }],
        },
      });
    }
    const file =
      params.file != null
        ? toUploadFile(params.file, params.fileName ?? "document", params.mimeType)
        : null;
    return callOp(this.client, uploadKnowledgeDocApiV1AgentsAgentIdKnowledgeBasePost, {
      path: { agent_id: agentId },
      body: { text: params.text ?? null, file, filename: params.filename ?? null },
    });
  }

  /** Attach a previously presigned upload as a knowledge-base doc. */
  uploadKnowledgeDocByUpload(agentId: string, body: KnowledgeDocByUploadRequest) {
    return callOp(
      this.client,
      uploadKnowledgeDocByUploadApiV1AgentsAgentIdKnowledgeBaseByUploadPost,
      {
        path: { agent_id: agentId },
        body,
      },
    );
  }

  /** Delete a knowledge-base document. */
  deleteKnowledgeDoc(agentId: string, docId: string) {
    return callOp(this.client, deleteKnowledgeDocApiV1AgentsAgentIdKnowledgeBaseDocIdDelete, {
      path: { agent_id: agentId, doc_id: docId },
    });
  }

  /** Re-process a knowledge-base document. */
  processKnowledgeDoc(agentId: string, docId: string) {
    return callOp(this.client, processKnowledgeDocApiV1AgentsAgentIdKnowledgeBaseDocIdProcessPost, {
      path: { agent_id: agentId, doc_id: docId },
    });
  }

  /** Fetch raw knowledge-base text snippets for an agent. */
  getKnowledgeTexts(agentId: string) {
    return callOp(this.client, getKnowledgeTextsApiV1AgentsAgentIdKnowledgeBaseTextsGet, {
      path: { agent_id: agentId },
    });
  }

  /** Query an agent's knowledge base. */
  queryKnowledgeBase(agentId: string, body: KnowledgeQueryRequest) {
    return callOp(this.client, queryKnowledgeBaseApiV1AgentsAgentIdKnowledgeBaseQueryPost, {
      path: { agent_id: agentId },
      body,
    });
  }

  // -------------------------------------------------------------- API keys

  /** List API keys. */
  listApiKeys() {
    return callOp(this.client, listApiKeysApiV1ApiKeysGet);
  }

  /** Create a new API key. */
  createApiKey(body: ApiKeyCreate) {
    return callOp(this.client, createApiKeyApiV1ApiKeysPost, { body });
  }

  /** Revoke an API key. */
  revokeApiKey(keyId: string) {
    return callOp(this.client, revokeApiKeyApiV1ApiKeysKeyIdDelete, { path: { key_id: keyId } });
  }

  /** Rotate an API key. */
  rotateApiKey(keyId: string) {
    return callOp(this.client, rotateApiKeyApiV1ApiKeysKeyIdRotatePost, {
      path: { key_id: keyId },
    });
  }

  // ----------------------------------------------------------------- Calls

  /** List calls (one page). */
  async listCalls(
    params: PageParams & {
      status?: CallStatus | null;
      direction?: "inbound" | "outbound" | null;
    } = {},
  ): Promise<PaginatedResponse<CallResponse>> {
    const raw = await callOp(this.client, listCallsApiV1CallsGet, { query: params });
    return new PaginatedResponse<CallResponse>(raw as RawPage<CallResponse>);
  }

  /** Create a call record. */
  createCallRecord(body: CallRecordCreate) {
    return callOp(this.client, createCallRecordApiV1CallsPost, { body });
  }

  /** Retrieve a call by id. */
  getCall(callId: string): Promise<CallResponse> {
    return callOp(this.client, getCallApiV1CallsCallIdGet, { path: { call_id: callId } });
  }

  /** Get a call's current status. */
  getCallStatus(callId: string) {
    return callOp(this.client, getCallStatusApiV1CallsCallIdStatusGet, {
      path: { call_id: callId },
    });
  }

  /** Place an outbound call. */
  triggerCall(body: CallCreate) {
    return callOp(this.client, triggerCallApiV1CallsTriggerPost, { body });
  }

  /** Trigger a batch of outbound calls. */
  batchCalls(body: BatchCallCreate) {
    return callOp(this.client, batchCallsApiV1CallsBatchPost, { body });
  }

  /** Retrieve a call batch by id. */
  getCallBatch(batchId: string) {
    return callOp(this.client, getBatchApiV1CallsBatchBatchIdGet, { path: { batch_id: batchId } });
  }

  // -------------------------------------------------- Conversation sessions

  /** Establish a new (live) conversation session. */
  conversationConnect(body: ConnectRequest) {
    return callOp(this.client, connectApiV1ConversationConnectPost, { body });
  }

  /** End a live conversation session. */
  endConversationSession(sessionId: string) {
    return callOp(this.client, endSessionApiV1ConversationSessionIdEndPost, {
      path: { session_id: sessionId },
    });
  }

  /** Get a conversation session's status. */
  getConversationSessionStatus(sessionId: string) {
    return callOp(this.client, getSessionStatusApiV1ConversationSessionIdStatusGet, {
      path: { session_id: sessionId },
    });
  }

  /** Send trickle-ICE candidates for a WebRTC session. */
  sendIceCandidate(sessionId: string, body: SmallWebRtcPatchRequest) {
    return callOp(this.client, iceCandidateApiV1ConversationSessionIdIcePatch, {
      path: { session_id: sessionId },
      body,
    });
  }

  /** Send an SDP offer for a WebRTC session. */
  sendOffer(sessionId: string, body: OfferRequest) {
    return callOp(this.client, offerApiV1ConversationSessionIdOfferPost, {
      path: { session_id: sessionId },
      body,
    });
  }

  /** Return a tool-call result to a live conversation. */
  sendToolResult(sessionId: string, body: ToolResultRequest) {
    return callOp(this.client, toolResultApiV1ConversationSessionIdToolResultPost, {
      path: { session_id: sessionId },
      body,
    });
  }

  // ---------------------------------------------------- Conversation history

  /** List conversations (one page). */
  async listConversations(
    params: PageParams = {},
  ): Promise<PaginatedResponse<ConversationResponse>> {
    const raw = await callOp(this.client, listConversationsApiV1ConversationsGet, {
      query: params,
    });
    return new PaginatedResponse<ConversationResponse>(raw as RawPage<ConversationResponse>);
  }

  /** Retrieve a conversation by id. */
  getConversation(conversationId: string): Promise<ConversationResponse> {
    return callOp(this.client, getConversationApiV1ConversationsConversationIdGet, {
      path: { conversation_id: conversationId },
    });
  }

  /** Fetch a conversation transcript. */
  getTranscript(conversationId: string) {
    return callOp(this.client, getTranscriptApiV1ConversationsConversationIdTranscriptGet, {
      path: { conversation_id: conversationId },
    });
  }

  /** Get audio metadata (signed URL) for a conversation. */
  getAudio(conversationId: string) {
    return callOp(this.client, getAudioApiV1ConversationsConversationIdAudioGet, {
      path: { conversation_id: conversationId },
    });
  }

  /** Fetch raw conversation audio (WAV) as bytes. */
  streamAudio(
    conversationId: string,
    opts: { token?: string | null; range?: string | null } = {},
  ): Promise<Uint8Array> {
    return callBinary(this.client, streamAudioApiV1ConversationsConversationIdAudioWavGet, {
      path: { conversation_id: conversationId },
      query: opts.token != null ? { token: opts.token } : undefined,
      headers: opts.range != null ? { Range: opts.range } : undefined,
    });
  }

  /** Revoke an audio playback token. */
  revokeAudioToken(conversationId: string, body: AudioRevokeBody) {
    return callOp(this.client, revokeAudioTokenApiV1ConversationsConversationIdAudioRevokePost, {
      path: { conversation_id: conversationId },
      body,
    });
  }

  /** Submit feedback on a conversation. */
  submitFeedback(conversationId: string, body: ConversationFeedback) {
    return callOp(this.client, submitFeedbackApiV1ConversationsConversationIdFeedbackPost, {
      path: { conversation_id: conversationId },
      body,
    });
  }

  /** Search conversations. */
  searchConversations(q: string, opts: { limit?: number } = {}) {
    return callOp(this.client, searchConversationsApiV1ConversationsSearchGet, {
      query: { q, limit: opts.limit ?? 20 },
    });
  }

  // ---------------------------------------------------------------- Models

  /** List available LLM and voice models. */
  listModels(opts: { includeUnavailable?: boolean } = {}) {
    return callOp(this.client, listModelsApiV1ModelsGet, {
      query: { include_unavailable: opts.includeUnavailable ?? false },
    });
  }

  // --------------------------------------------------------- Phone numbers

  /** List provisioned phone numbers (one page). */
  async listPhoneNumbers(params: PageParams = {}): Promise<PaginatedResponse<any>> {
    const raw = await callOp(this.client, listPhoneNumbersApiV1PhoneNumbersGet, { query: params });
    return new PaginatedResponse(raw as RawPage<any>);
  }

  /** Retrieve a phone number by id. */
  getPhoneNumber(pnId: string) {
    return callOp(this.client, getPhoneNumberApiV1PhoneNumbersPnIdGet, { path: { pn_id: pnId } });
  }

  /** Update a phone number's configuration. */
  updatePhoneNumber(pnId: string, body: PhoneNumberUpdate) {
    return callOp(this.client, updatePhoneNumberApiV1PhoneNumbersPnIdPatch, {
      path: { pn_id: pnId },
      body,
    });
  }

  /** Release (deprovision) a phone number. */
  releasePhoneNumber(pnId: string) {
    return callOp(this.client, releasePhoneNumberApiV1PhoneNumbersPnIdDelete, {
      path: { pn_id: pnId },
    });
  }

  /** Configure inbound routing for a phone number. */
  setPhoneNumberRouting(pnId: string, body: InboundRoutingConfig) {
    return callOp(this.client, setRoutingApiV1PhoneNumbersPnIdRoutingPost, {
      path: { pn_id: pnId },
      body,
    });
  }

  /** Register an externally-hosted SIP phone number. */
  registerSipPhoneNumber(body: SipRegisterRequest) {
    return callOp(this.client, registerSipApiV1PhoneNumbersSipRegisterPost, { body });
  }

  /** Register a Twilio-managed phone number. */
  registerTwilioPhoneNumber(body: TwilioRegisterRequest) {
    return callOp(this.client, registerTwilioApiV1PhoneNumbersTwilioRegisterPost, { body });
  }

  // -------------------------------------------------------- Twilio accounts

  /** Register a Bring-Your-Own Twilio account. */
  registerTwilioAccount(body: TwilioAccountCreate) {
    return callOp(this.client, registerTwilioAccountApiV1TwilioAccountsPost, { body });
  }

  /** List Twilio accounts available to the tenant (one page). */
  async listTwilioAccounts(params: PageParams = {}): Promise<PaginatedResponse<any>> {
    const raw = await callOp(this.client, listTwilioAccountsApiV1TwilioAccountsGet, {
      query: params,
    });
    return new PaginatedResponse(raw as RawPage<any>);
  }

  /** Retrieve a Twilio account by id. */
  getTwilioAccount(accountId: string) {
    return callOp(this.client, getTwilioAccountApiV1TwilioAccountsAccountIdGet, {
      path: { account_id: accountId },
    });
  }

  /** Release a tenant-owned Twilio account. */
  releaseTwilioAccount(accountId: string) {
    return callOp(this.client, releaseTwilioAccountApiV1TwilioAccountsAccountIdDelete, {
      path: { account_id: accountId },
    });
  }

  // ------------------------------------------------------------- Recordings

  /** List recordings (one page). */
  async listRecordings(params: PageParams = {}): Promise<PaginatedResponse<any>> {
    const raw = await callOp(this.client, listRecordingsApiV1RecordingsGet, { query: params });
    return new PaginatedResponse(raw as RawPage<any>);
  }

  /** Retrieve a recording by id. */
  getRecording(recordingId: string) {
    return callOp(this.client, getRecordingApiV1RecordingsRecordingIdGet, {
      path: { recording_id: recordingId },
    });
  }

  /** Delete a recording. */
  deleteRecording(recordingId: string) {
    return callOp(this.client, deleteRecordingApiV1RecordingsRecordingIdDelete, {
      path: { recording_id: recordingId },
    });
  }

  /** Get recording audio download metadata. */
  getRecordingAudio(recordingId: string) {
    return callOp(this.client, getRecordingAudioApiV1RecordingsRecordingIdAudioGet, {
      path: { recording_id: recordingId },
    });
  }

  // ---------------------------------------------------------- Transcription

  /** Transcribe an audio file synchronously (multipart). */
  transcribeAudio(params: {
    file: BinaryInput;
    language?: string | null;
    fileName?: string;
    mimeType?: string;
  }) {
    const file = toUploadFile(params.file, params.fileName, params.mimeType);
    return callOp(this.client, transcribeSyncApiV1TranscribePost, {
      body: { file, language: params.language ?? null },
    });
  }

  /** Transcribe a previously uploaded file synchronously. */
  transcribeAudioByUpload(body: TranscribeByUploadRequest) {
    return callOp(this.client, transcribeSyncByUploadApiV1TranscribeByUploadPost, { body });
  }

  /** Submit an async transcription job (multipart). */
  transcribeAudioAsync(params: {
    file: BinaryInput;
    language?: string | null;
    webhookUrl?: string | null;
    fileName?: string;
    mimeType?: string;
  }) {
    const file = toUploadFile(params.file, params.fileName, params.mimeType);
    return callOp(this.client, transcribeAsyncApiV1TranscribeAsyncPost, {
      body: { file, language: params.language ?? null, webhook_url: params.webhookUrl ?? null },
    });
  }

  /** Submit an async transcription job for a previously uploaded file. */
  transcribeAudioAsyncByUpload(body: TranscribeAsyncByUploadRequest) {
    return callOp(this.client, transcribeAsyncByUploadApiV1TranscribeAsyncByUploadPost, { body });
  }

  /** Retrieve a transcription job by id. */
  getTranscriptionJob(jobId: string) {
    return callOp(this.client, getTranscriptionJobApiV1TranscribeJobIdGet, {
      path: { job_id: jobId },
    });
  }

  /** Cancel an in-flight transcription job. */
  cancelTranscriptionJob(jobId: string) {
    return callOp(this.client, cancelTranscriptionJobApiV1TranscribeJobIdDelete, {
      path: { job_id: jobId },
    });
  }

  // ------------------------------------------------------------------- TTS

  /** Synthesize speech from text and return the raw audio bytes (WAV). */
  synthesizeSpeech(body: TtsRequest): Promise<Uint8Array> {
    return callBinary(this.client, synthesizeApiV1TtsPost, { body });
  }

  /** Synthesize speech and yield audio chunks (PCM16) as they arrive. */
  streamSpeech(body: TtsStreamRequest): AsyncGenerator<Uint8Array> {
    return callStream(this.client, synthesizeStreamApiV1TtsStreamPost, { body });
  }

  /** Submit a TTS batch job. */
  batchSynthesize(body: TtsBatchCreate) {
    return callOp(this.client, batchSynthesizeApiV1TtsBatchPost, { body });
  }

  /** Retrieve a TTS batch by id. */
  getTtsBatch(batchId: string) {
    return callOp(this.client, getBatchApiV1TtsBatchBatchIdGet, { path: { batch_id: batchId } });
  }

  // --------------------------------------------------------------- Uploads

  /** Request a presigned URL for direct file upload. */
  presignUpload(body: PresignUploadRequest) {
    return callOp(this.client, presignUploadApiV1UploadsPresignPost, { body });
  }

  // ----------------------------------------------------------------- Usage

  /** Get usage details for the current period. */
  getUsage() {
    return callOp(this.client, getUsageApiV1UsageGet);
  }

  /** Get a usage summary for the current period. */
  getUsageSummary() {
    return callOp(this.client, getUsageSummaryApiV1UsageSummaryGet);
  }

  /** Get usage broken down by day. */
  getDailyUsage(opts: { days?: number } = {}) {
    return callOp(this.client, getDailyUsageApiV1UsageDailyGet, {
      query: { days: opts.days ?? 30 },
    });
  }

  /** Get usage broken down by month. */
  getMonthlyUsage() {
    return callOp(this.client, getMonthlyUsageApiV1UsageMonthlyGet);
  }

  // -------------------------------------------------------------- Webhooks

  /** List usage triggers (webhook subscriptions). */
  listTriggers() {
    return callOp(this.client, listTriggersApiV1UsageTriggersGet);
  }

  /** Create a usage trigger. */
  createTrigger(body: UsageTriggerCreate) {
    return callOp(this.client, createTriggerApiV1UsageTriggersPost, { body });
  }

  /** Update a usage trigger. */
  updateTrigger(triggerId: string, body: UsageTriggerUpdate) {
    return callOp(this.client, updateTriggerApiV1UsageTriggersTriggerIdPatch, {
      path: { trigger_id: triggerId },
      body,
    });
  }

  /** List recent firings for a trigger. */
  listTriggerFirings(triggerId: string, opts: { limit?: number } = {}) {
    return callOp(this.client, listTriggerFiringsApiV1UsageTriggersTriggerIdFiringsGet, {
      path: { trigger_id: triggerId },
      query: { limit: opts.limit ?? 50 },
    });
  }

  /** Re-deliver a webhook firing. */
  redeliverFiring(triggerId: string, firingId: string) {
    return callOp(
      this.client,
      redeliverFiringApiV1UsageTriggersTriggerIdFiringsFiringIdRedeliverPost,
      { path: { trigger_id: triggerId, firing_id: firingId } },
    );
  }

  /** Rotate the tenant-level webhook signing secret. */
  rotateWebhookSecret() {
    return callOp(this.client, rotateWebhookSecretApiV1UsageWebhookSecretRotatePost);
  }

  // ---------------------------------------------------------------- Voices

  /** List available voices. */
  listVoices(
    opts: {
      language?: string | null;
      supportsDialectStyle?: boolean | null;
      tag?: string | null;
      country?: string | null;
      limit?: number;
      offset?: number;
    } = {},
  ) {
    return callOp(this.client, listVoicesApiV1VoicesGet, {
      query: {
        language: opts.language ?? null,
        supports_dialect_style: opts.supportsDialectStyle ?? null,
        tag: opts.tag ?? null,
        country: opts.country ?? null,
        limit: opts.limit ?? 100,
        offset: opts.offset ?? 0,
      },
    });
  }

  /** Retrieve a voice by id. */
  getVoice(voiceId: string) {
    return callOp(this.client, getVoiceApiV1VoicesVoiceIdGet, { path: { voice_id: voiceId } });
  }

  /** Generate a short preview clip for a voice and return audio bytes (WAV). */
  previewVoice(body: VoicePreviewRequest): Promise<Uint8Array> {
    return callBinary(this.client, previewVoiceApiV1VoicesPreviewPost, { body });
  }

  /** Return the closed tag vocabulary for voices. */
  listTagVocabulary() {
    return callOp(this.client, listTagVocabularyApiV1VoicesTagVocabularyGet);
  }

  /** List the country codes accepted by the `country` voice filter. */
  listCountries() {
    return callOp(this.client, listCountriesApiV1VoicesCountriesGet);
  }
}

/** Call status values accepted by {@link AethexAI.listCalls}. */
export type CallStatus =
  | "queued"
  | "ringing"
  | "in-progress"
  | "completed"
  | "failed"
  | "no-answer"
  | "busy"
  | "canceled";
