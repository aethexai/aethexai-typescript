/**
 * Realtime WebRTC conversation with an Aethex voice agent.
 *
 * Browser-first: uses the native `RTCPeerConnection`, `getUserMedia`, and an
 * `<audio>` element for playback. It is a thin orchestration layer over the
 * signaling methods already on {@link AethexAI} (`conversationConnect`,
 * `sendOffer`, `sendIceCandidate`, `sendToolResult`, `endConversationSession`),
 * implementing the Pipecat SmallWebRTC + RTVI data-channel protocol the Aethex
 * backend speaks.
 *
 * ```ts
 * import { AethexAI } from "aethexai";
 * import { Conversation } from "aethexai/realtime";
 *
 * const client = new AethexAI({ apiKey: "ae_live_..." });
 * const convo = new Conversation(client, { agentId: "ag_..." });
 * convo.on("agentText", (t) => console.log("agent:", t));
 * convo.on("userTranscript", (t) => console.log("user:", t));
 * await convo.start();   // mic capture + offer/answer + ICE; resolves when connected
 * // ... audio flows over WebRTC ...
 * await convo.end();
 * ```
 *
 * Runs in any environment with WebRTC. For Node, pass `peerConnectionFactory`
 * (e.g. backed by `werift` or `@roamhq/wrtc`) and a `mediaStream`.
 */
import { APIConnectionError, APITimeoutError } from "../errors";
import { TypedEmitter } from "./emitter";

import type { AethexAI } from "../client";

/** Lifecycle + underlying `RTCPeerConnectionState` values. */
export type ConversationStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "disconnected"
  | "failed"
  | "closed";

/** A client-side tool/function call surfaced by the agent over the data channel. */
export interface ToolCall {
  id: string;
  name: string;
  arguments: unknown;
}

/** Events emitted during a conversation. Subscribe with `convo.on(event, fn)`. */
export interface ConversationEventMap {
  /** Lifecycle / connection-state transitions. */
  statusChange: ConversationStatus;
  /** Incremental agent (TTS) text. */
  agentText: string;
  /** Incremental user speech transcription. */
  userTranscript: string;
  agentStartedSpeaking: void;
  agentStoppedSpeaking: void;
  userStartedSpeaking: void;
  userStoppedSpeaking: void;
  /** Pipeline timing/cost metrics. */
  metrics: unknown;
  /** A client-side tool call; respond with {@link Conversation.sendToolResult}. */
  toolCall: ToolCall;
  /** The remote (agent) audio MediaStreamTrack, as it arrives. */
  track: MediaStreamTrack;
  /** Every raw decoded data-channel message (escape hatch for unmapped types). */
  message: Record<string, any>;
  /** A non-fatal error (ICE send failure, etc.). */
  error: Error;
}

export interface ConversationOptions {
  /** The agent to converse with. */
  agentId: string;
  /**
   * Microphone stream to send. If omitted, `getUserMedia({ audio: true })` is
   * called in the browser. Required when running outside a browser.
   */
  mediaStream?: MediaStream;
  /** Override microphone acquisition (defaults to `navigator.mediaDevices.getUserMedia`). */
  getUserMedia?: (constraints: MediaStreamConstraints) => Promise<MediaStream>;
  /**
   * Auto-attach the remote agent audio to an `<audio>` element for playback.
   * Pass an element to use your own; `false` to disable (handle the `track`
   * event yourself). Defaults to creating a hidden element when `document`
   * exists. Ignored outside the browser.
   */
  audioElement?: HTMLAudioElement | false;
  /** Extra `RTCConfiguration` merged over the server-provided ICE servers. */
  rtcConfiguration?: RTCConfiguration;
  /** Provide a custom `RTCPeerConnection` (e.g. a Node WebRTC implementation). */
  peerConnectionFactory?: (config: RTCConfiguration) => RTCPeerConnection;
  /** Data-channel keepalive interval in ms (default 5000). */
  keepAliveMs?: number;
  /** Time to wait for the connection to establish, in ms (default 30000). */
  connectTimeoutMs?: number;
}

interface IcePatch {
  candidate: string;
  sdp_mid: string;
  sdp_mline_index: number;
}

const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: ["stun:stun.cloudflare.com:3478", "stun:stun.cloudflare.com:53"] },
];

export class Conversation extends TypedEmitter<ConversationEventMap> {
  private readonly client: AethexAI;
  private readonly options: ConversationOptions;

  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private localStream: MediaStream | null = null;
  private _remoteStream: MediaStream | null = null;
  private audioEl: HTMLAudioElement | null = null;

  private _sessionId = "";
  private pcId: string | null = null;
  private _status: ConversationStatus = "idle";

  private iceQueue: IcePatch[] = [];
  private iceTimer: ReturnType<typeof setTimeout> | null = null;
  private keepAliveTimer: ReturnType<typeof setInterval> | null = null;

  constructor(client: AethexAI, options: ConversationOptions) {
    super();
    this.client = client;
    this.options = options;
  }

  /** The Aethex conversation/session id (also the conversation record id). */
  get sessionId(): string {
    return this._sessionId;
  }

  get status(): ConversationStatus {
    return this._status;
  }

  get isConnected(): boolean {
    return this._status === "connected";
  }

  /** The remote (agent) audio stream, available after the `track` event. */
  get remoteStream(): MediaStream | null {
    return this._remoteStream;
  }

  /**
   * Establish the WebRTC connection: reserve a session, capture the mic,
   * exchange SDP, trickle ICE, and resolve once connected.
   */
  async start(): Promise<void> {
    this.setStatus("connecting");
    try {
      const session = (await this.client.conversationConnect({
        agent_id: this.options.agentId,
      })) as { session_id: string; ice_config?: { iceServers?: RTCIceServer[] } };
      this._sessionId = session.session_id;

      const iceServers = session.ice_config?.iceServers?.length
        ? session.ice_config.iceServers
        : DEFAULT_ICE_SERVERS;
      const pc = this.makePeerConnection({ iceServers, ...this.options.rtcConfiguration });
      this.pc = pc;

      // Mirror the backend reference client's transceiver layout exactly:
      // audio sendrecv + video sendrecv + video sendonly.
      const audioTransceiver = pc.addTransceiver("audio", { direction: "sendrecv" });
      pc.addTransceiver("video", { direction: "sendrecv" });
      pc.addTransceiver("video", { direction: "sendonly" });

      const stream = this.options.mediaStream ?? (await this.acquireMic());
      this.localStream = stream;
      const micTrack = stream.getAudioTracks()[0];
      if (micTrack) await audioTransceiver.sender.replaceTrack(micTrack);

      const dc = pc.createDataChannel("chat", { ordered: true });
      this.dc = dc;
      dc.addEventListener("open", () => this.onDataChannelOpen());
      dc.addEventListener("message", (e: MessageEvent) => this.handleMessage(e.data));

      pc.addEventListener("track", (e: RTCTrackEvent) => this.onTrack(e));
      pc.addEventListener("icecandidate", (e: RTCPeerConnectionIceEvent) => {
        if (e.candidate) this.queueIce(e.candidate);
      });
      pc.addEventListener("connectionstatechange", () => this.onConnectionStateChange());

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const answer = (await this.client.sendOffer(this._sessionId, {
        sdp: offer.sdp ?? "",
        type: "offer",
      })) as { sdp: string; type: string; pc_id?: string };
      this.pcId = answer.pc_id ?? null;

      await pc.setRemoteDescription({
        sdp: answer.sdp,
        type: answer.type as RTCSdpType,
      });
      void this.flushIce(); // send any candidates gathered before pc_id was known

      await this.waitUntilConnected(this.options.connectTimeoutMs ?? 30_000);
      this.setStatus("connected");
    } catch (err) {
      this.setStatus("failed");
      await this.cleanup();
      throw err;
    }
  }

  /** Return a client-side tool-call result to the live conversation. */
  async sendToolResult(toolCallId: string, result: string): Promise<void> {
    if (!this._sessionId) throw new Error("Conversation is not started.");
    await this.client.sendToolResult(this._sessionId, {
      tool_call_id: toolCallId,
      result,
    });
  }

  /** End the conversation and tear down the WebRTC connection. */
  async end(): Promise<void> {
    if (this._sessionId) {
      try {
        await this.client.endConversationSession(this._sessionId);
      } catch {
        // Best-effort; the pipeline also tears down on connection close.
      }
    }
    await this.cleanup();
    this.setStatus("closed");
  }

  // ----------------------------------------------------------- internals

  private makePeerConnection(config: RTCConfiguration): RTCPeerConnection {
    if (this.options.peerConnectionFactory) return this.options.peerConnectionFactory(config);
    if (typeof RTCPeerConnection === "undefined") {
      throw new Error(
        "RTCPeerConnection is not available in this environment. Pass " +
          "`peerConnectionFactory` (e.g. backed by werift or @roamhq/wrtc) to run outside a browser.",
      );
    }
    return new RTCPeerConnection(config);
  }

  private async acquireMic(): Promise<MediaStream> {
    const getMedia =
      this.options.getUserMedia ??
      (typeof navigator !== "undefined" && navigator.mediaDevices
        ? navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices)
        : undefined);
    if (!getMedia) {
      throw new Error(
        "No microphone available. Provide `mediaStream` or `getUserMedia` in ConversationOptions.",
      );
    }
    return getMedia({
      audio: {
        echoCancellation: { ideal: true },
        noiseSuppression: { ideal: true },
        autoGainControl: { ideal: true },
      },
    });
  }

  private onDataChannelOpen(): void {
    // The SmallWebRTC transport expects per-receiver track-status signalling:
    // enable receiver 0 (audio), disable the two video receivers.
    for (const [index, enabled] of [
      [0, true],
      [1, false],
      [2, false],
    ] as const) {
      this.dcSend({
        type: "signalling",
        message: { type: "trackStatus", receiver_index: index, enabled },
      });
    }
    const interval = this.options.keepAliveMs ?? 5_000;
    this.keepAliveTimer = setInterval(() => {
      if (this.dc?.readyState === "open") this.dc.send("ping: " + this.now());
    }, interval);
  }

  private onTrack(e: RTCTrackEvent): void {
    if (e.track.kind !== "audio") return;
    this._remoteStream = e.streams[0] ?? new MediaStream([e.track]);
    this.attachPlayback(this._remoteStream);
    this.emit("track", e.track);
  }

  private attachPlayback(stream: MediaStream): void {
    if (this.options.audioElement === false) return;
    if (typeof document === "undefined") return;
    let el = this.options.audioElement ?? this.audioEl;
    if (!el) {
      el = document.createElement("audio");
      el.autoplay = true;
      el.style.display = "none";
      document.body.appendChild(el);
      this.audioEl = el;
    }
    el.srcObject = stream;
    void el.play?.().catch(() => {
      /* autoplay may be blocked until a user gesture */
    });
  }

  private onConnectionStateChange(): void {
    const state = this.pc?.connectionState as ConversationStatus | undefined;
    if (!state) return;
    if (state === "connected") this.setStatus("connected");
    else if (state === "disconnected") this.setStatus("disconnected");
    else if (state === "failed" || state === "closed") this.setStatus(state);
  }

  private handleMessage(data: unknown): void {
    if (typeof data !== "string") return;
    let msg: Record<string, any>;
    try {
      msg = JSON.parse(data);
    } catch {
      return;
    }

    this.emit("message", msg);

    if (msg.type === "pipeline-metrics") {
      this.emit("metrics", msg.data);
      return;
    }
    if (msg.label !== "rtvi-ai") return;

    switch (msg.type) {
      case "user-transcription":
        if (msg.data?.text) this.emit("userTranscript", msg.data.text);
        break;
      case "bot-output":
        if (msg.data?.text) this.emit("agentText", msg.data.text);
        break;
      case "bot-started-speaking":
        this.emit("agentStartedSpeaking", undefined as never);
        break;
      case "bot-stopped-speaking":
        this.emit("agentStoppedSpeaking", undefined as never);
        break;
      case "user-started-speaking":
        this.emit("userStartedSpeaking", undefined as never);
        break;
      case "user-stopped-speaking":
        this.emit("userStoppedSpeaking", undefined as never);
        break;
      case "llm-function-call": {
        const d = msg.data ?? {};
        this.emit("toolCall", {
          id: d.tool_call_id ?? d.function_call_id ?? "",
          name: d.function_name ?? d.name ?? "",
          arguments: d.args ?? d.arguments ?? {},
        });
        break;
      }
    }
  }

  private queueIce(candidate: RTCIceCandidate): void {
    this.iceQueue.push({
      candidate: candidate.candidate,
      sdp_mid: candidate.sdpMid ?? "",
      sdp_mline_index: candidate.sdpMLineIndex ?? 0,
    });
    if (!this.pcId) return; // flushed once the answer's pc_id is known
    if (this.iceTimer) clearTimeout(this.iceTimer);
    this.iceTimer = setTimeout(() => void this.flushIce(), 200);
  }

  private async flushIce(): Promise<void> {
    if (this.iceTimer) {
      clearTimeout(this.iceTimer);
      this.iceTimer = null;
    }
    if (!this.pcId || !this._sessionId || this.iceQueue.length === 0) return;
    const candidates = this.iceQueue;
    this.iceQueue = [];
    try {
      await this.client.sendIceCandidate(this._sessionId, {
        pc_id: this.pcId,
        candidates,
      });
    } catch (err) {
      // ICE trickle is best-effort; the connection can still succeed with the
      // candidates already in the SDP. Surface it as a non-fatal event.
      this.emit("error", err instanceof Error ? err : new Error(String(err)));
    }
  }

  private waitUntilConnected(timeoutMs: number): Promise<void> {
    if (this.pc?.connectionState === "connected") return Promise.resolve();
    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        off();
        reject(new APITimeoutError("WebRTC connection timed out"));
      }, timeoutMs);
      const offStatus = this.on("statusChange", (status) => {
        if (status === "connected") {
          off();
          resolve();
        } else if (status === "failed" || status === "closed") {
          off();
          reject(new APIConnectionError(`WebRTC connection ${status}`));
        }
      });
      const off = () => {
        clearTimeout(timer);
        offStatus();
      };
    });
  }

  private async cleanup(): Promise<void> {
    if (this.keepAliveTimer) {
      clearInterval(this.keepAliveTimer);
      this.keepAliveTimer = null;
    }
    if (this.iceTimer) {
      clearTimeout(this.iceTimer);
      this.iceTimer = null;
    }
    this.localStream?.getTracks().forEach((t) => t.stop());
    this.localStream = null;
    try {
      this.dc?.close();
    } catch {
      /* ignore */
    }
    this.dc = null;
    try {
      this.pc?.close();
    } catch {
      /* ignore */
    }
    this.pc = null;
    if (this.audioEl) {
      this.audioEl.srcObject = null;
      this.audioEl.remove();
      this.audioEl = null;
    }
    this._remoteStream = null;
    this.pcId = null;
    this.iceQueue = [];
  }

  private dcSend(payload: unknown): void {
    if (this.dc?.readyState === "open") this.dc.send(JSON.stringify(payload));
  }

  private setStatus(status: ConversationStatus): void {
    if (this._status === status) return;
    this._status = status;
    this.emit("statusChange", status);
  }

  private now(): number {
    // Date.now is fine here (runtime keepalive, never replayed/cached).
    return Date.now();
  }
}
