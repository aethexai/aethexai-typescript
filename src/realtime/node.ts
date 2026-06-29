/**
 * Node.js WebRTC adapter for {@link Conversation}.
 *
 * The browser path uses native `RTCPeerConnection` + `getUserMedia`; Node has
 * neither. This module bridges to the optional native peer dependency
 * **`@roamhq/wrtc`** (prebuilt binaries incl. macOS arm64 and Linux x64):
 *
 * ```bash
 * npm install @roamhq/wrtc
 * ```
 *
 * ```ts
 * import { AethexAI } from "aethexai";
 * import { Conversation } from "aethexai/realtime";
 * import { createNodeWebRTC, createAudioSink } from "aethexai/realtime/node";
 *
 * const client = new AethexAI({ apiKey: "ae_live_..." });
 * const node = await createNodeWebRTC();           // silent mic by default
 * const convo = new Conversation(client, { agentId: "ag_...", ...node.conversationOptions });
 *
 * convo.on("agentText", (t) => console.log("agent:", t));
 * convo.on("track", async (track) => {
 *   await createAudioSink(track, (frame) => {/* frame.samples is Int16 PCM *\/});
 * });
 *
 * await convo.start();
 * // ... push real mic PCM with node.pushPcm(int16Frame) at the sample rate ...
 * await convo.end();
 * node.close();
 * ```
 */

// Loaded dynamically and kept external from the bundle so the native module is
// only required when Node realtime is actually used. Typed `string` (not a
// literal) so the dynamic import resolves to `any` and never couples the build
// to `@roamhq/wrtc`'s presence or its type declarations.
const WRTC_SPECIFIER: string = "@roamhq/wrtc";

async function loadWrtc(): Promise<any> {
  try {
    const mod = await import(WRTC_SPECIFIER);
    return (mod as any).default ?? mod;
  } catch (err) {
    throw new Error(
      "Realtime conversations in Node require the optional '@roamhq/wrtc' " +
        "package. Install it with `npm install @roamhq/wrtc`. Underlying error: " +
        (err instanceof Error ? err.message : String(err)),
    );
  }
}

export interface NodeWebRTCOptions {
  /** PCM sample rate fed to the agent. Default 48000. */
  sampleRate?: number;
  /** Channel count of the mic source. Default 1 (mono). */
  channelCount?: number;
}

export interface NodeWebRTC {
  /** Pass to the `Conversation` constructor (factory + mic stream). */
  peerConnectionFactory: (config: RTCConfiguration) => RTCPeerConnection;
  /** The synthetic microphone MediaStream. */
  mediaStream: MediaStream;
  /** Spread into `ConversationOptions`: `{ ...node.conversationOptions }`. */
  conversationOptions: {
    peerConnectionFactory: (config: RTCConfiguration) => RTCPeerConnection;
    mediaStream: MediaStream;
  };
  /**
   * Send a frame of signed 16-bit PCM to the agent. The first call stops the
   * default silence generator. Feed ~10ms frames (`sampleRate / 100` samples
   * per channel) at the sample rate for natural pacing.
   */
  pushPcm(samples: Int16Array): void;
  /** Stop the silence generator and release the source track. */
  close(): void;
}

/**
 * Build a Node WebRTC peer-connection factory and a synthetic microphone
 * (silence by default, so a call connects and you can observe the agent).
 */
export async function createNodeWebRTC(options: NodeWebRTCOptions = {}): Promise<NodeWebRTC> {
  const wrtc = await loadWrtc();
  const sampleRate = options.sampleRate ?? 48_000;
  const channelCount = options.channelCount ?? 1;
  const samplesPerFrame = Math.round(sampleRate / 100); // 10ms

  const source = new wrtc.nonstandard.RTCAudioSource();
  const track = source.createTrack();
  const mediaStream = new wrtc.MediaStream([track]) as MediaStream;

  const silence = new Int16Array(samplesPerFrame * channelCount);
  let streamingReal = false;
  const timer = setInterval(() => {
    if (streamingReal) return;
    source.onData({
      samples: silence,
      sampleRate,
      bitsPerSample: 16,
      channelCount,
      numberOfFrames: samplesPerFrame,
    });
  }, 10);
  // Don't let the keepalive timer alone hold the event loop open.
  (timer as { unref?: () => void }).unref?.();

  const pushPcm = (samples: Int16Array): void => {
    streamingReal = true;
    source.onData({
      samples,
      sampleRate,
      bitsPerSample: 16,
      channelCount,
      numberOfFrames: Math.floor(samples.length / channelCount),
    });
  };

  const peerConnectionFactory = (config: RTCConfiguration): RTCPeerConnection =>
    new wrtc.RTCPeerConnection(config) as unknown as RTCPeerConnection;

  let closed = false;
  const close = (): void => {
    if (closed) return;
    closed = true;
    clearInterval(timer);
    try {
      track.stop();
    } catch {
      /* ignore */
    }
  };

  return {
    peerConnectionFactory,
    mediaStream,
    conversationOptions: { peerConnectionFactory, mediaStream },
    pushPcm,
    close,
  };
}

/** A frame of agent audio delivered by {@link createAudioSink}. */
export interface AgentAudioFrame {
  samples: Int16Array;
  sampleRate: number;
  channelCount: number;
}

/**
 * Attach a sink to the agent's audio track (from the `track` event) and invoke
 * `onData` with raw PCM frames. Returns a handle to stop the sink.
 */
export async function createAudioSink(
  track: MediaStreamTrack,
  onData: (frame: AgentAudioFrame) => void,
): Promise<{ stop(): void }> {
  const wrtc = await loadWrtc();
  const sink = new wrtc.nonstandard.RTCAudioSink(track);
  sink.ondata = (data: {
    samples: Int16Array;
    sampleRate: number;
    channelCount?: number;
  }): void => {
    onData({
      samples: data.samples,
      sampleRate: data.sampleRate,
      channelCount: data.channelCount ?? 1,
    });
  };
  return {
    stop: (): void => {
      try {
        sink.stop();
      } catch {
        /* ignore */
      }
    },
  };
}
