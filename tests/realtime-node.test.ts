import { describe, expect, it } from "vitest";

import { createNodeWebRTC } from "../src/realtime/node";

// Skip when the optional native peer dependency isn't installed (e.g. a CI
// platform without a prebuilt @roamhq/wrtc binary).
let wrtcAvailable = true;
try {
  await import("@roamhq/wrtc");
} catch {
  wrtcAvailable = false;
}

describe.skipIf(!wrtcAvailable)("createNodeWebRTC", () => {
  it("produces a peer-connection factory and a mic media stream", async () => {
    const node = await createNodeWebRTC();
    try {
      expect(typeof node.conversationOptions.peerConnectionFactory).toBe("function");
      expect(node.mediaStream.getAudioTracks().length).toBe(1);

      const pc = node.peerConnectionFactory({});
      const audioTrack = node.mediaStream.getAudioTracks()[0]!;
      pc.addTrack(audioTrack, node.mediaStream);
      const offer = await pc.createOffer();
      expect(offer.sdp).toContain("m=audio");
      pc.close();

      // Pushing PCM must not throw (stops the silence generator).
      expect(() => node.pushPcm(new Int16Array(480))).not.toThrow();
    } finally {
      node.close();
    }
  });
});
