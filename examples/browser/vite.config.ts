import { defineConfig } from "vite";

// Run via `npm run demo` (which points Vite's root at this folder). The demo
// imports the SDK from ../../src, so fs.strict is relaxed to let Vite serve
// files from above the root. Served on localhost — a secure context, so the
// browser allows getUserMedia.
//
// `server.proxy` forwards same-origin `/api/*` requests to the real Aethex API
// server-side, which sidesteps browser CORS (the API doesn't allow the
// localhost origin). Only HTTP signaling goes through here; WebRTC media is
// peer-to-peer and unaffected. Override the target with AETHEX_PROXY_TARGET.
const target = process.env.AETHEX_PROXY_TARGET ?? "https://api.aethexai.com";

export default defineConfig({
  server: {
    open: true,
    fs: { strict: false },
    proxy: {
      "/api": { target, changeOrigin: true, secure: true },
    },
  },
});
