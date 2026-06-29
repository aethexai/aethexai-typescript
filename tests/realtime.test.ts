import { describe, expect, it, vi } from "vitest";

import { AethexAI } from "../src/index";
import { Conversation } from "../src/realtime/index";
import { fetchMock, jsonResponse } from "./helpers";

/**
 * A controllable fake RTCPeerConnection that records signaling and lets the
 * test drive data-channel + connection-state events. Avoids real WebRTC.
 */
class FakePeerConnection {
  connectionState = "new";
  localDescription: any = null;
  dataChannel: FakeDataChannel | null = null;
  private handlers = new Map<string, ((e: any) => void)[]>();
  transceivers: any[] = [];

  addTransceiver(_kind: string, _init?: unknown) {
    const tx = { sender: { replaceTrack: vi.fn(async () => {}) } };
    this.transceivers.push(tx);
    return tx;
  }
  createDataChannel(_label: string, _init?: unknown) {
    this.dataChannel = new FakeDataChannel();
    return this.dataChannel;
  }
  addEventListener(type: string, fn: (e: any) => void) {
    const list = this.handlers.get(type) ?? [];
    list.push(fn);
    this.handlers.set(type, list);
  }
  async createOffer() {
    return { sdp: "v=0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 0\r\n", type: "offer" };
  }
  async setLocalDescription(desc: any) {
    this.localDescription = desc;
  }
  async setRemoteDescription(_desc: any) {}
  close() {
    this.connectionState = "closed";
  }
  // test drivers
  fire(type: string, event: any) {
    for (const fn of this.handlers.get(type) ?? []) fn(event);
  }
  setConnected() {
    this.connectionState = "connected";
    this.fire("connectionstatechange", {});
  }
}

class FakeDataChannel {
  readyState = "open";
  sent: string[] = [];
  private handlers = new Map<string, ((e: any) => void)[]>();
  addEventListener(type: string, fn: (e: any) => void) {
    const list = this.handlers.get(type) ?? [];
    list.push(fn);
    this.handlers.set(type, list);
  }
  send(data: string) {
    this.sent.push(data);
  }
  close() {
    this.readyState = "closed";
  }
  fire(type: string, event: any) {
    for (const fn of this.handlers.get(type) ?? []) fn(event);
  }
}

function fakeMic(): MediaStream {
  return {
    getAudioTracks: () => [{ kind: "audio" } as MediaStreamTrack],
    getTracks: () => [{ stop() {} } as unknown as MediaStreamTrack],
  } as unknown as MediaStream;
}

function signalingMock() {
  return fetchMock((req) => {
    const path = new URL(req.url).pathname;
    if (path === "/api/v1/conversation/connect") {
      return jsonResponse(
        { session_id: "sess_1", ice_config: { iceServers: [{ urls: "stun:stun.test:3478" }] } },
        { status: 201 },
      );
    }
    if (path.endsWith("/offer")) {
      return jsonResponse({ sdp: "v=0\r\nanswer", type: "answer", pc_id: "pc_99" });
    }
    if (path.endsWith("/ice")) return jsonResponse({ status: "success" });
    if (path.endsWith("/tool-result")) return jsonResponse({ status: "received" });
    if (path.endsWith("/end")) return jsonResponse({ status: "ending" });
    return jsonResponse({}, { status: 404 });
  });
}

describe("Conversation", () => {
  it("runs the SmallWebRTC signaling handshake and connects", async () => {
    const mock = signalingMock();
    const client = new AethexAI({ apiKey: "k", fetch: mock.fetch });
    const pc = new FakePeerConnection();

    const convo = new Conversation(client, {
      agentId: "ag_1",
      mediaStream: fakeMic(),
      audioElement: false,
      peerConnectionFactory: () => pc as unknown as RTCPeerConnection,
    });

    const statuses: string[] = [];
    convo.on("statusChange", (s) => statuses.push(s));

    const started = convo.start();
    // The fake connects once the handshake has wired everything up.
    await vi.waitFor(() => expect(pc.localDescription).not.toBeNull());
    pc.setConnected();
    await started;

    expect(convo.isConnected).toBe(true);
    expect(convo.sessionId).toBe("sess_1");
    expect(statuses).toContain("connecting");
    expect(statuses).toContain("connected");

    const paths = mock.calls.map((c) => new URL(c.url).pathname);
    expect(paths).toContain("/api/v1/conversation/connect");
    expect(paths).toContain("/api/v1/conversation/sess_1/offer");

    // Data channel opened -> trackStatus signalling sent.
    pc.dataChannel!.fire("open", {});
    expect(pc.dataChannel!.sent.some((m) => m.includes("trackStatus"))).toBe(true);
  });

  it("maps RTVI data-channel messages to typed events", async () => {
    const mock = signalingMock();
    const client = new AethexAI({ apiKey: "k", fetch: mock.fetch });
    const pc = new FakePeerConnection();
    const convo = new Conversation(client, {
      agentId: "ag_1",
      mediaStream: fakeMic(),
      audioElement: false,
      peerConnectionFactory: () => pc as unknown as RTCPeerConnection,
    });

    const agentText: string[] = [];
    const userText: string[] = [];
    let tool: any = null;
    convo.on("agentText", (t) => agentText.push(t));
    convo.on("userTranscript", (t) => userText.push(t));
    convo.on("toolCall", (c) => (tool = c));

    const started = convo.start();
    await vi.waitFor(() => expect(pc.localDescription).not.toBeNull());
    pc.setConnected();
    await started;

    const dc = pc.dataChannel!;
    dc.fire("message", {
      data: JSON.stringify({ label: "rtvi-ai", type: "bot-output", data: { text: "Hello" } }),
    });
    dc.fire("message", {
      data: JSON.stringify({
        label: "rtvi-ai",
        type: "user-transcription",
        data: { text: "Hi there" },
      }),
    });
    dc.fire("message", {
      data: JSON.stringify({
        label: "rtvi-ai",
        type: "llm-function-call",
        data: { tool_call_id: "tc_1", function_name: "lookup", args: { q: "x" } },
      }),
    });

    expect(agentText).toEqual(["Hello"]);
    expect(userText).toEqual(["Hi there"]);
    expect(tool).toEqual({ id: "tc_1", name: "lookup", arguments: { q: "x" } });
  });

  it("sends tool results and ends the session", async () => {
    const mock = signalingMock();
    const client = new AethexAI({ apiKey: "k", fetch: mock.fetch });
    const pc = new FakePeerConnection();
    const convo = new Conversation(client, {
      agentId: "ag_1",
      mediaStream: fakeMic(),
      audioElement: false,
      peerConnectionFactory: () => pc as unknown as RTCPeerConnection,
    });

    const started = convo.start();
    await vi.waitFor(() => expect(pc.localDescription).not.toBeNull());
    pc.setConnected();
    await started;

    await convo.sendToolResult("tc_1", JSON.stringify({ ok: true }));
    await convo.end();

    const calls = mock.calls.map((c) => `${c.method} ${new URL(c.url).pathname}`);
    expect(calls).toContain("POST /api/v1/conversation/sess_1/tool-result");
    expect(calls).toContain("POST /api/v1/conversation/sess_1/end");
    expect(convo.status).toBe("closed");
  });
});
