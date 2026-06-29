/**
 * Realtime WebRTC conversation example.
 *
 * Works in the browser (native WebRTC + mic) and in Node via the optional
 * `@roamhq/wrtc` adapter (silent mic — a connectivity test that observes the
 * agent's text/transcripts and counts inbound audio frames).
 *
 *   npm install @roamhq/wrtc      # Node only
 *   AETHEX_API_KEY=ae_live_... npx tsx examples/quickstart.ts
 */
import { AethexAI } from "../src/index";
import { Conversation, type ConversationOptions } from "../src/realtime/index";

export async function startConversation(
  apiKey: string,
  agentId: string,
  opts: { seconds?: number } = {},
): Promise<void> {
  const client = new AethexAI({ apiKey });

  let options: ConversationOptions = { agentId };
  let node: { close(): void } | null = null;

  // Browsers have native WebRTC + getUserMedia; Node needs the adapter.
  const inBrowser = typeof RTCPeerConnection !== "undefined";
  if (!inBrowser) {
    const { createNodeWebRTC } = await import("../src/realtime/node");
    node = await createNodeWebRTC();
    options = {
      agentId,
      ...(node as Awaited<ReturnType<typeof createNodeWebRTC>>).conversationOptions,
    };
  }

  const convo = new Conversation(client, options);
  convo.on("statusChange", (s) => console.log("[status]", s));
  convo.on("agentText", (t) => console.log("agent:", t));
  convo.on("userTranscript", (t) => console.log("you:", t));
  convo.on("error", (e) => console.error("[error]", e.message));

  // In Node, count inbound agent audio frames to prove media is flowing.
  let frames = 0;
  if (!inBrowser) {
    convo.on("track", async (track) => {
      const { createAudioSink } = await import("../src/realtime/node");
      await createAudioSink(track, () => {
        frames += 1;
      });
    });
  }

  await convo.start();
  console.log("connected — listening...");
  await new Promise((resolve) => setTimeout(resolve, (opts.seconds ?? 15) * 1000));
  if (!inBrowser) console.log(`received ${frames} agent audio frames`);

  await convo.end();
  node?.close();
  console.log("conversation ended");
}
