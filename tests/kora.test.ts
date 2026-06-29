import { describe, expect, it } from "vitest";

import { Kora } from "../src/index";
import { fetchMock, jsonResponse } from "./helpers";

describe("Kora", () => {
  it("requires an api key", () => {
    expect(() => new Kora("https://api.aethexai.com", "")).toThrow(/apiKey is required/);
  });

  it("builds the agent body from positional args + extras", async () => {
    const mock = fetchMock(() => jsonResponse({ id: "ag_1" }, { status: 201 }));
    const kora = new Kora("https://api.aethexai.com", "ae_live_x", { fetch: mock.fetch });

    await kora.createAgent("Bot", "You are helpful.", "fatima", {
      first_message: "Bonjour!",
      language: "french",
    });

    const req = mock.calls[0]!;
    expect(req.headers.get("X-API-Key")).toBe("ae_live_x");
    await expect(req.clone().json()).resolves.toEqual({
      name: "Bot",
      system_prompt: "You are helpful.",
      voice_id: "fatima",
      first_message: "Bonjour!",
      language: "french",
    });
  });

  it("builds the call body from positional args", async () => {
    const mock = fetchMock(() => jsonResponse({ id: "call_1" }));
    const kora = new Kora("https://api.aethexai.com", "k", { fetch: mock.fetch });
    await kora.triggerCall("ag_1", "+221700000000", { from_number: "+15550000000" });
    await expect(mock.calls[0]!.clone().json()).resolves.toEqual({
      agent_id: "ag_1",
      to_number: "+221700000000",
      from_number: "+15550000000",
    });
  });

  it("sends a multipart file part on transcribe", async () => {
    const mock = fetchMock(() => jsonResponse({ text: "hello world" }));
    const kora = new Kora("https://api.aethexai.com", "k", { fetch: mock.fetch });

    const result: any = await kora.transcribe(new Uint8Array([0, 1, 2]), {
      language: "english",
      fileName: "call.wav",
      mimeType: "audio/wav",
    });
    expect(result.text).toBe("hello world");

    const req = mock.calls[0]!;
    expect(new URL(req.url).pathname).toBe("/api/v1/transcribe");
    const form = await req.clone().formData();
    const file = form.get("file");
    expect(file).toBeInstanceOf(File);
    expect((file as File).name).toBe("call.wav");
    expect(form.get("language")).toBe("english");
  });

  it("filters listConversations by agentId client-side", async () => {
    const mock = fetchMock(() =>
      jsonResponse({
        data: [
          { id: "c1", agent_id: "ag_1" },
          { id: "c2", agent_id: "ag_2" },
        ],
        total: 2,
        limit: 50,
        offset: 0,
      }),
    );
    const kora = new Kora("https://api.aethexai.com", "k", { fetch: mock.fetch });
    const page = await kora.listConversations({ agentId: "ag_1" });
    expect(page.length).toBe(1);
    expect(page.at(0)).toMatchObject({ id: "c1" });
  });
});
