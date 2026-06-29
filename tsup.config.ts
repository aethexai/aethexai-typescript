import { defineConfig } from "tsup";

export default defineConfig({
  // Core SDK and the opt-in realtime layers are separate entries so importing
  // the core never pulls in the WebRTC/DOM code. Named keys control the output
  // filenames: dist/index.*, dist/realtime.*, dist/realtime/node.*.
  entry: {
    index: "src/index.ts",
    realtime: "src/realtime/index.ts",
    "realtime/node": "src/realtime/node.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  target: "es2022",
  // The Node WebRTC backend is an optional native peer dependency — never bundle
  // it; load it dynamically at runtime only when Node realtime is used.
  external: ["@roamhq/wrtc"],
});
