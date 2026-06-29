import { defineConfig } from "@hey-api/openapi-ts";

// Generates the low-level REST client under src/_generated/ from openapi.json.
// NEVER hand-edit the output — it is regenerated on every backend sync. The
// maintained, ergonomic surface lives in src/client.ts, src/kora.ts, etc.
//
// Regenerate with:  npm run generate
export default defineConfig({
  input: "./openapi.json",
  output: {
    path: "./src/_generated",
    // Output is excluded from prettier/eslint (see .prettierignore /
    // eslint.config.js), so skip post-processing to keep regen diffs minimal.
    postProcess: [],
  },
  plugins: [
    // Fetch-based client (works in Node 18+, browsers, and edge runtimes).
    "@hey-api/client-fetch",
    // Default plugins (@hey-api/typescript, @hey-api/sdk) are added implicitly.
  ],
});
