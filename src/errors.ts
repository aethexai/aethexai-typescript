/**
 * SDK exception hierarchy.
 *
 * Mirrors the Python SDK's exception hierarchy: a typed tree rooted at
 * {@link AethexError}. Every non-2xx HTTP response is mapped to an
 * {@link APIStatusError} subclass via {@link mapStatusToError}; transport and
 * timeout failures become {@link APIConnectionError} / {@link APITimeoutError}.
 */

/** Base class for every error raised by the SDK. */
export class AethexError extends Error {
  constructor(message = "") {
    super(message);
    this.name = new.target.name;
    // Restore prototype chain for instanceof across the compile target.
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Raised when a network error prevents the request from completing. */
export class APIConnectionError extends AethexError {
  override readonly cause?: unknown;
  constructor(message = "Connection error", options?: { cause?: unknown }) {
    super(message);
    this.cause = options?.cause;
  }
}

/** Raised when the request times out. */
export class APITimeoutError extends APIConnectionError {
  constructor(message = "Request timed out") {
    super(message);
  }
}

export interface APIStatusErrorOptions {
  code?: string;
  statusCode?: number;
  response?: Record<string, any>;
  headers?: Record<string, string>;
}

/** Raised when the API returns an error HTTP status. */
export class APIStatusError extends AethexError {
  readonly code: string;
  readonly statusCode: number;
  readonly response: Record<string, any>;
  readonly headers: Record<string, string>;

  constructor(message = "", options: APIStatusErrorOptions = {}) {
    super(message);
    this.code = options.code ?? "internal_error";
    this.statusCode = options.statusCode ?? 500;
    this.response = options.response ?? {};
    this.headers = options.headers ?? {};
  }

  /** Build the right subclass instance from a parsed error body. */
  static fromResponse(
    statusCode: number,
    body: Record<string, any>,
    headers?: Record<string, string>,
  ): APIStatusError {
    let errorMsg: unknown = body.error ?? body.detail ?? "Unknown error";
    if (Array.isArray(errorMsg)) {
      errorMsg = errorMsg
        .map((e) => String(typeof e === "object" ? JSON.stringify(e) : e))
        .join("; ");
    }
    const code = body.code ?? "internal_error";
    const ctor = STATUS_MAP[statusCode] ?? APIStatusError;
    return new ctor(String(errorMsg), { code, statusCode, response: body, headers });
  }
}

/** 401 — invalid or missing API key. */
export class AuthenticationError extends APIStatusError {}
/** 403 — insufficient permissions or scopes. */
export class PermissionDeniedError extends APIStatusError {}
/** 404 — resource not found. */
export class NotFoundError extends APIStatusError {}
/** 409 — resource already exists. */
export class ConflictError extends APIStatusError {}
/** 422 — request validation failed. */
export class ValidationError extends APIStatusError {}

/** 429 — rate limit exceeded. */
export class RateLimitError extends APIStatusError {
  /** Seconds to wait before retrying, from the `Retry-After` header or body. */
  get retryAfter(): number | null {
    const header = this.headers["retry-after"] ?? this.headers["Retry-After"];
    if (header) {
      const parsed = Number(header);
      if (!Number.isNaN(parsed)) return parsed;
    }
    const fromBody = this.response.retry_after;
    return typeof fromBody === "number" ? fromBody : null;
  }
}

/** 5xx — server-side error. */
export class InternalServerError extends APIStatusError {}

const STATUS_MAP: Record<
  number,
  new (message?: string, options?: APIStatusErrorOptions) => APIStatusError
> = {
  401: AuthenticationError,
  403: PermissionDeniedError,
  404: NotFoundError,
  409: ConflictError,
  422: ValidationError,
  429: RateLimitError,
  500: InternalServerError,
  502: InternalServerError,
  503: InternalServerError,
  504: InternalServerError,
};

/**
 * Build an {@link APIStatusError} subclass for a non-2xx HTTP response.
 *
 * `body` may be a string, an already-parsed object, a `Uint8Array`, or
 * undefined. The function is tolerant: a body that does not parse as JSON
 * still produces a well-formed error that surfaces the raw text for debugging.
 */
export function mapStatusToError(
  statusCode: number,
  body?: string | Uint8Array | Record<string, any> | null,
  headers?: Headers | Record<string, string>,
): APIStatusError {
  let parsed: Record<string, any>;
  if (body == null) {
    parsed = {};
  } else if (typeof body === "object" && !(body instanceof Uint8Array)) {
    parsed = body;
  } else {
    const raw = body instanceof Uint8Array ? new TextDecoder().decode(body) : body;
    if (!raw) {
      parsed = {};
    } else {
      try {
        const decoded = JSON.parse(raw);
        parsed = decoded && typeof decoded === "object" ? decoded : { detail: decoded };
      } catch {
        parsed = { detail: raw.slice(0, 500) };
      }
    }
  }

  let headersDict: Record<string, string> | undefined;
  if (headers instanceof Headers) {
    headersDict = {};
    headers.forEach((value, key) => {
      headersDict![key] = value;
    });
  } else {
    headersDict = headers;
  }

  return APIStatusError.fromResponse(statusCode, parsed, headersDict);
}
