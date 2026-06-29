import { describe, expect, it } from "vitest";

import { AuthenticationError, DeveloperClient } from "../src/index";
import { fetchMock, jsonResponse } from "./helpers";

describe("DeveloperClient", () => {
  it("requires an access token", () => {
    expect(() => new DeveloperClient({})).toThrow(AuthenticationError);
  });

  it("sends a bearer token on getBalance", async () => {
    const mock = fetchMock(() => jsonResponse({ balance_cents: 1000 }));
    const dev = new DeveloperClient({ accessToken: "jwt_abc", fetch: mock.fetch });
    await dev.getBalance();
    const req = mock.calls[0]!;
    expect(new URL(req.url).pathname).toBe("/api/v1/billing/balance");
    expect(req.headers.get("Authorization")).toBe("Bearer jwt_abc");
  });

  it("refreshes the token on 401 and retries once", async () => {
    let phase = 0;
    const mock = fetchMock((req) => {
      const path = new URL(req.url).pathname;
      if (path === "/api/v1/auth/refresh") {
        return jsonResponse({ access_token: "jwt_new", refresh_token: "refresh_new" });
      }
      // First /auth/me call 401s; after refresh the retry succeeds.
      phase += 1;
      if (phase === 1) return jsonResponse({ detail: "expired" }, { status: 401 });
      return jsonResponse({ id: "dev_1", email: "a@b.com" });
    });

    const dev = new DeveloperClient({
      accessToken: "jwt_old",
      refreshToken: "refresh_old",
      fetch: mock.fetch,
    });

    const me: any = await dev.getMe();
    expect(me.id).toBe("dev_1");

    // me (401) -> refresh -> me (200)
    const paths = mock.calls.map((c) => new URL(c.url).pathname);
    expect(paths).toEqual(["/api/v1/auth/me", "/api/v1/auth/refresh", "/api/v1/auth/me"]);
    // The retry used the refreshed token.
    expect(mock.calls[2]!.headers.get("Authorization")).toBe("Bearer jwt_new");
  });

  it("surfaces the original 401 when no refresh token is available", async () => {
    const mock = fetchMock(() => jsonResponse({ detail: "expired" }, { status: 401 }));
    const dev = new DeveloperClient({ accessToken: "jwt_old", fetch: mock.fetch });
    await expect(dev.getMe()).rejects.toMatchObject({ statusCode: 401 });
  });
});
