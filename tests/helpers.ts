/**
 * Test helpers. The clients accept a custom `fetch`, so we inject a stub that
 * records requests and returns canned responses — no real network, no msw.
 */

export interface FetchMock {
  fetch: typeof fetch;
  /** Requests received, cloned so their bodies are still readable. */
  calls: Request[];
}

type Handler = (req: Request) => Response | Promise<Response>;

/** Build a fetch stub from a handler that maps each request to a Response. */
export function fetchMock(handler: Handler): FetchMock {
  const calls: Request[] = [];
  const fn = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const req = input instanceof Request ? input : new Request(input, init);
    calls.push(req.clone());
    return handler(req);
  };
  return { fetch: fn as typeof fetch, calls };
}

/** Build a fetch stub that always returns the same response (by status + body). */
export function fetchOnce(
  body: unknown,
  init: { status?: number; headers?: Record<string, string>; contentType?: string } = {},
): FetchMock {
  return fetchMock(() => jsonResponse(body, init));
}

/** Construct a JSON Response. */
export function jsonResponse(
  body: unknown,
  init: { status?: number; headers?: Record<string, string>; contentType?: string } = {},
): Response {
  const status = init.status ?? 200;
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", init.contentType ?? "application/json");
  }
  return new Response(status === 204 ? null : JSON.stringify(body), { status, headers });
}

/** Construct a binary (audio/wav) Response. */
export function binaryResponse(bytes: Uint8Array, status = 200): Response {
  return new Response(new Blob([bytes as BlobPart]), {
    status,
    headers: { "Content-Type": "audio/wav" },
  });
}
