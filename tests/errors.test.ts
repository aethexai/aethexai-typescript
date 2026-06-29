import { describe, expect, it } from "vitest";

import {
  APIStatusError,
  AuthenticationError,
  ConflictError,
  InternalServerError,
  NotFoundError,
  PermissionDeniedError,
  RateLimitError,
  ValidationError,
} from "../src/index";
import { mapStatusToError } from "../src/errors";

describe("mapStatusToError", () => {
  it("maps known statuses to their subclasses", () => {
    expect(mapStatusToError(401, {})).toBeInstanceOf(AuthenticationError);
    expect(mapStatusToError(403, {})).toBeInstanceOf(PermissionDeniedError);
    expect(mapStatusToError(404, {})).toBeInstanceOf(NotFoundError);
    expect(mapStatusToError(409, {})).toBeInstanceOf(ConflictError);
    expect(mapStatusToError(422, {})).toBeInstanceOf(ValidationError);
    expect(mapStatusToError(429, {})).toBeInstanceOf(RateLimitError);
    expect(mapStatusToError(500, {})).toBeInstanceOf(InternalServerError);
    expect(mapStatusToError(503, {})).toBeInstanceOf(InternalServerError);
  });

  it("falls back to APIStatusError for unmapped statuses", () => {
    const err = mapStatusToError(418, { detail: "teapot" });
    expect(err).toBeInstanceOf(APIStatusError);
    expect(err.statusCode).toBe(418);
    expect(err.message).toBe("teapot");
  });

  it("parses a raw JSON string body", () => {
    const err = mapStatusToError(400, JSON.stringify({ error: "boom", code: "bad" }));
    expect(err.message).toBe("boom");
    expect(err.code).toBe("bad");
  });

  it("tolerates a non-JSON body", () => {
    const err = mapStatusToError(500, "<html>oops</html>");
    expect(err.response.detail).toContain("oops");
  });

  it("joins list-shaped error details", () => {
    const err = mapStatusToError(422, { detail: ["field a required", "field b required"] });
    expect(err.message).toContain("field a required");
    expect(err.message).toContain("field b required");
  });

  it("reads retryAfter from the header", () => {
    const err = mapStatusToError(429, {}, { "retry-after": "30" }) as RateLimitError;
    expect(err.retryAfter).toBe(30);
  });
});
