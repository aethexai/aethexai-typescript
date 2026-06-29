/**
 * Shared plumbing for the hand-written client layer.
 *
 * Every public client (AethexAI, Kora, DeveloperClient) creates its own
 * configured generated client and funnels each operation through {@link callOp}
 * (or {@link callBinary} / {@link callStream} for audio). These helpers are the
 * TypeScript analog of the Python SDK's call helpers: they return the
 * parsed body on 2xx and throw a typed error on any non-2xx response or
 * transport failure.
 */
import { createClient, type Client } from "./_generated/client";
import { APIConnectionError, APITimeoutError, mapStatusToError } from "./errors";

export type { Client };

/** Shape returned by a generated op when `throwOnError` is false (the default). */
interface OpResult<T> {
  data?: T;
  error?: unknown;
  request?: Request;
  response?: Response;
}

/**
 * A generated operation function (e.g. `getAgentApiV1AgentsAgentIdGet`). The
 * parameter is `any` (not `Record<string, any>`) so the generated functions —
 * whose option params have required `path`/`body` fields — stay assignable
 * while `T` is still inferred from each op's return type.
 */
type OpFn<T> = (options: any) => Promise<OpResult<T>>;

/**
 * Surface an `unknown` success body as `any` so callers can read properties
 * (e.g. `doc.id`) without a cast. Backend routes without a `response_model`
 * type their response as `unknown` in the spec; genuinely-typed responses
 * (`AgentResponse`, `CallResponse`, …) are unaffected.
 */
export type DefaultAny<T> = [unknown] extends [T] ? any : T;

export interface InstanceClientConfig {
  baseUrl: string;
  /** Default headers applied to every request (carries auth). */
  headers: Record<string, string>;
  /** Per-request timeout in milliseconds. Omit to disable. */
  timeoutMs?: number;
  /** Custom fetch implementation. Defaults to `globalThis.fetch`. */
  fetch?: typeof fetch;
}

/** Read an environment variable, tolerating environments without `process`. */
export function readEnv(name: string): string | undefined {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process
    ?.env;
  return env?.[name];
}

/** Wrap a fetch implementation so each request gets an abort-on-timeout signal. */
function withTimeout(baseFetch: typeof fetch, timeoutMs?: number): typeof fetch {
  if (timeoutMs == null) return baseFetch;
  const wrapped = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    if (init?.signal) return baseFetch(input, init);
    return baseFetch(input, { ...init, signal: AbortSignal.timeout(timeoutMs) });
  };
  return wrapped as typeof fetch;
}

/** Build a configured generated client for one SDK instance. */
export function createInstanceClient(cfg: InstanceClientConfig): Client {
  const baseFetch = cfg.fetch ?? globalThis.fetch;
  return createClient({
    baseUrl: cfg.baseUrl,
    headers: cfg.headers,
    fetch: withTimeout(baseFetch, cfg.timeoutMs),
  });
}

/** Translate a thrown transport error into the SDK's typed connection errors. */
function transportError(error: unknown): never {
  const name = (error as { name?: string } | null)?.name;
  if (name === "TimeoutError" || name === "AbortError") {
    throw new APITimeoutError();
  }
  throw new APIConnectionError(undefined, { cause: error });
}

/**
 * Run a generated op, return its parsed body on 2xx, throw a typed error
 * otherwise. The success-body type is inferred from the op's return type.
 */
export async function callOp<T>(
  client: Client,
  op: OpFn<T>,
  options: Record<string, any> = {},
): Promise<DefaultAny<T>> {
  const res = await op({ ...options, client });
  const { data, error, response } = res;
  // The fetch client returns `response: undefined` on transport failures.
  if (!response) transportError(error);
  if (response.ok) return data as DefaultAny<T>;
  throw mapStatusToError(response.status, error as any, response.headers);
}

/**
 * Like {@link callOp} but forces the body to be read as raw bytes. Used for the
 * audio endpoints (TTS, voice preview, conversation audio) whose 200 response
 * is `audio/wav` even though the spec declares `application/json`.
 */
export async function callBinary(
  client: Client,
  op: OpFn<unknown>,
  options: Record<string, any> = {},
): Promise<Uint8Array> {
  const res = await op({ ...options, client, parseAs: "arrayBuffer" });
  const { data, error, response } = res;
  if (!response) transportError(error);
  if (response.ok) return new Uint8Array(data as ArrayBuffer);
  throw mapStatusToError(response.status, error as any, response.headers);
}

/**
 * Like {@link callOp} but streams the response body, yielding audio chunks as
 * they arrive. Used by the TTS streaming endpoint.
 */
export async function* callStream(
  client: Client,
  op: OpFn<unknown>,
  options: Record<string, any> = {},
): AsyncGenerator<Uint8Array> {
  const res = await op({ ...options, client, parseAs: "stream" });
  const { data, error, response } = res;
  if (!response) transportError(error);
  if (!response.ok) {
    throw mapStatusToError(response.status, error as any, response.headers);
  }
  const body = data as ReadableStream<Uint8Array> | null;
  if (!body) return;
  const reader = body.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) yield value;
    }
  } finally {
    reader.releaseLock();
  }
}

/** Audio / file input accepted by the multipart upload + transcription methods. */
export type BinaryInput = Blob | File | ArrayBuffer | ArrayBufferView;

/**
 * Normalize file input into a named `File` for multipart upload.
 *
 * A multipart part needs a filename or the server parses it as a plain form
 * field (HTTP 422). A `File` already carries its name and is returned as-is; a
 * `Blob` or raw bytes are wrapped in a `File` with the given (or default
 * `"audio"`) name — mirroring the Python SDK's default upload filename.
 */
export function toUploadFile(input: BinaryInput, fileName = "audio", mimeType?: string): File {
  if (typeof File === "undefined") {
    // `File` became a Node global in Node 20; it's missing on Node 18 (EOL).
    throw new Error(
      "The File API is required for uploads and transcription, but it is not " +
        "available in this runtime. Use Node 20+ (or a browser / edge runtime). " +
        "Node 18 is not supported.",
    );
  }
  if (input instanceof File) return input;
  if (input instanceof Blob) {
    return new File([input], fileName, { type: mimeType ?? input.type });
  }
  return new File([input as BlobPart], fileName, {
    type: mimeType ?? "application/octet-stream",
  });
}
