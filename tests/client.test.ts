import { describe, expect, it } from "vitest";

import {
  AethexAI,
  AuthenticationError,
  NotFoundError,
  RateLimitError,
  ValidationError,
} from "../src/index";
import { binaryResponse, fetchMock, jsonResponse } from "./helpers";

describe("AethexAI construction", () => {
  it("throws AuthenticationError when no api key is provided", () => {
    expect(() => new AethexAI({})).toThrow(AuthenticationError);
  });

  it("reads the api key from AETHEX_API_KEY", () => {
    process.env.AETHEX_API_KEY = "ae_env_key";
    try {
      const mock = fetchMock(() => jsonResponse({ data: [], total: 0, limit: 50, offset: 0 }));
      const client = new AethexAI({ fetch: mock.fetch });
      expect(client.baseURL).toBe("https://api.aethexai.com");
    } finally {
      delete process.env.AETHEX_API_KEY;
    }
  });
});

describe("AethexAI requests", () => {
  it("sends X-API-Key and JSON body on createAgent, returns parsed body", async () => {
    const mock = fetchMock(() => jsonResponse({ id: "ag_1", name: "Bot" }, { status: 201 }));
    const client = new AethexAI({ apiKey: "ae_live_x", fetch: mock.fetch });

    const agent = await client.createAgent({
      name: "Bot",
      system_prompt: "You are helpful.",
      voice_id: "fatima",
    });

    expect(agent).toEqual({ id: "ag_1", name: "Bot" });
    const req = mock.calls[0]!;
    expect(req.method).toBe("POST");
    expect(new URL(req.url).pathname).toBe("/api/v1/agents");
    expect(req.headers.get("X-API-Key")).toBe("ae_live_x");
    await expect(req.clone().json()).resolves.toMatchObject({ name: "Bot", voice_id: "fatima" });
  });

  it("templates path params on getAgent", async () => {
    const mock = fetchMock(() => jsonResponse({ id: "ag_42" }));
    const client = new AethexAI({ apiKey: "k", fetch: mock.fetch });
    await client.getAgent("ag_42");
    expect(new URL(mock.calls[0]!.url).pathname).toBe("/api/v1/agents/ag_42");
  });

  it("passes query params on listAgents and wraps the page", async () => {
    const mock = fetchMock(() =>
      jsonResponse({ data: [{ id: "a" }, { id: "b" }], total: 5, limit: 2, offset: 0 }),
    );
    const client = new AethexAI({ apiKey: "k", fetch: mock.fetch });

    const page = await client.listAgents({ offset: 0, limit: 2 });
    expect(page.length).toBe(2);
    expect(page.total).toBe(5);
    expect(page.hasMore).toBe(true);
    expect([...page].map((a: any) => a.id)).toEqual(["a", "b"]);
    expect(page.at(0)).toEqual({ id: "a" });

    const url = new URL(mock.calls[0]!.url);
    expect(url.searchParams.get("limit")).toBe("2");
    expect(url.searchParams.get("offset")).toBe("0");
  });

  it("reports hasMore=false on the last page", async () => {
    const mock = fetchMock(() =>
      jsonResponse({ data: [{ id: "a" }], total: 1, limit: 50, offset: 0 }),
    );
    const client = new AethexAI({ apiKey: "k", fetch: mock.fetch });
    const page = await client.listAgents();
    expect(page.hasMore).toBe(false);
  });
});

describe("AethexAI error mapping", () => {
  it("maps 404 to NotFoundError with status + body", async () => {
    const mock = fetchMock(() => jsonResponse({ detail: "nope" }, { status: 404 }));
    const client = new AethexAI({ apiKey: "k", fetch: mock.fetch });
    await expect(client.getAgent("missing")).rejects.toMatchObject({
      name: "NotFoundError",
      statusCode: 404,
    });
    await expect(client.getAgent("missing")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("maps 422 to ValidationError", async () => {
    const mock = fetchMock(() => jsonResponse({ detail: "bad" }, { status: 422 }));
    const client = new AethexAI({ apiKey: "k", fetch: mock.fetch });
    await expect(
      client.createAgent({ name: "x", system_prompt: "y", voice_id: "z" }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("exposes retryAfter on 429 RateLimitError", async () => {
    const mock = fetchMock(() =>
      jsonResponse({ detail: "slow down" }, { status: 429, headers: { "Retry-After": "12" } }),
    );
    const client = new AethexAI({ apiKey: "k", fetch: mock.fetch });
    await expect(client.getAgent("x")).rejects.toMatchObject({ retryAfter: 12 });
    expect(await client.getAgent("x").catch((e) => e)).toBeInstanceOf(RateLimitError);
  });
});

describe("AethexAI binary", () => {
  it("returns raw bytes from synthesizeSpeech", async () => {
    const audio = new Uint8Array([1, 2, 3, 4]);
    const mock = fetchMock(() => binaryResponse(audio));
    const client = new AethexAI({ apiKey: "k", fetch: mock.fetch });
    const out = await client.synthesizeSpeech({ text: "hi", voice_id: "fatima" });
    expect(out).toBeInstanceOf(Uint8Array);
    expect([...out]).toEqual([1, 2, 3, 4]);
  });
});

describe("AethexAI knowledge-base validation", () => {
  it("throws ValidationError when neither text nor file is given", async () => {
    const mock = fetchMock(() => jsonResponse({}));
    const client = new AethexAI({ apiKey: "k", fetch: mock.fetch });
    await expect(client.uploadKnowledgeDoc("ag_1", {})).rejects.toBeInstanceOf(ValidationError);
  });
});
