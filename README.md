<div align="center">

# Aethex AI TypeScript SDK

Deploy production voice agents with the AethexAI Voice API.

Create governed voice agents, place customer calls, synthesize speech,
transcribe recordings, and operate voice workflows from TypeScript and
JavaScript.

[![npm version](https://img.shields.io/npm/v/aethexai.svg)](https://www.npmjs.com/package/aethexai)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

[Documentation](https://developers.aethexai.com/docs) ·
[Dashboard](https://developers.aethexai.com/dashboard) ·
[API Reference](https://developers.aethexai.com/docs/api-reference) ·
[Support](mailto:developers@aethexai.com)

</div>

## Install

```bash
npm install aethexai
```

Ships dual ESM + CommonJS builds with TypeScript types. Requires Node.js 20+
(for the global `fetch`, `Blob`, and `File`) or any modern browser / edge
runtime.

## Quickstart

Create an agent for a customer operations workflow and place an outbound call.

```ts
import { AethexAI } from "aethexai";

const client = new AethexAI({ apiKey: "ae_live_..." }); // or set AETHEX_API_KEY

const voices = await client.listVoices({ language: "french", limit: 5 });
const voice = voices.at(0)!;

const agent = await client.createAgent({
  name: "Customer Operations Assistant",
  system_prompt:
    "You are a professional customer operations assistant. Help callers " +
    "confirm appointments, answer policy questions, and escalate to a human " +
    "when required.",
  first_message: "Bonjour, comment puis-je vous aider?",
  voice_id: voice.id,
  language: "french",
  dialect_style: "local",
});

const call = await client.triggerCall({
  agent_id: agent.id,
  to_number: "+221700000000",
});

console.log(call.id, call.status);
```

Every method returns a `Promise`; there is no separate sync/async client.

## Clients

| Client            | Use it for                                                                                                                                                                  |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AethexAI`        | API-key authenticated platform operations: agents, calls, TTS, transcription jobs, conversations, phone numbers, SIP trunks, Twilio accounts, usage, uploads, and API keys. |
| `Kora`            | Focused voice-agent workflows: agents, outbound calls, voices, TTS, transcription, and conversation history.                                                                |
| `DeveloperClient` | JWT-authenticated developer account and billing operations.                                                                                                                 |

## Core workflows

### Text to speech

Generate a complete audio asset for IVR, onboarding, or customer support:

```ts
import { writeFile } from "node:fs/promises";

const audio = await client.synthesizeSpeech({
  text: "Your appointment has been confirmed for tomorrow at 10 AM.",
  voice_id: "fatima",
  language: "english",
});

await writeFile("appointment-confirmation.wav", audio); // Uint8Array
```

Stream audio chunks for low-latency playback:

```ts
for await (const chunk of client.streamSpeech({
  text: "I am checking your account now. Please hold for a moment.",
  voice_id: "fatima",
  language: "english",
})) {
  speaker.write(chunk); // PCM16 audio chunks (Uint8Array)
}
```

### Transcription

For file transcription workflows, use `Kora`:

```ts
import { readFile } from "node:fs/promises";
import { Kora } from "aethexai";

const kora = new Kora("https://api.aethexai.com", "ae_live_...");

const bytes = await readFile("call.wav");
const result = await kora.transcribe(bytes, {
  language: "french",
  fileName: "call.wav",
  mimeType: "audio/wav",
});

console.log(result.text);
```

Submit longer recordings as asynchronous transcription jobs:

```ts
let job = await kora.transcribeAsync(bytes, { language: "french", fileName: "long-call.wav" });

while (job.status !== "completed" && job.status !== "failed") {
  await new Promise((r) => setTimeout(r, 2000));
  job = await kora.getTranscribeJob(job.id);
}

console.log(job.text);
```

### Realtime conversations

Full-duplex WebRTC conversations with a voice agent run in the browser via the
opt-in `aethexai/realtime` entry point (native `RTCPeerConnection` +
microphone). It is a typed event emitter:

```ts
import { AethexAI } from "aethexai";
import { Conversation } from "aethexai/realtime";

const client = new AethexAI({ apiKey: "ae_live_..." });
const convo = new Conversation(client, { agentId: "ag_..." });

convo.on("agentText", (text) => console.log("agent:", text));
convo.on("userTranscript", (text) => console.log("user:", text));
convo.on("statusChange", (status) => console.log(status)); // connecting → connected → closed
convo.on("toolCall", async (call) => {
  const result = await runTool(call.name, call.arguments);
  await convo.sendToolResult(call.id, JSON.stringify(result));
});

await convo.start(); // prompts for mic, negotiates WebRTC, resolves when connected
// ... the agent's audio plays automatically; convo.remoteStream is also exposed ...
await convo.end();
```

#### Try it in a browser

A runnable demo page lives in [`examples/browser`](examples/browser). From a
checkout:

```bash
npm install
npm run demo:browser          # Vite serves it on http://localhost:5173 and opens it
```

Enter your API key + agent ID, click **Connect & talk**, and grant microphone
access — the agent's audio plays back and the live transcript renders on the
page. It imports the SDK source directly, so it always reflects local changes.
(`localhost` is a secure context, which is what lets the browser grant the mic.)

The dev server **proxies `/api/*` to the API** (`server.proxy` in
`examples/browser/vite.config.ts`, target overridable via `AETHEX_PROXY_TARGET`),
so the browser makes same-origin calls and avoids CORS. In production the same
applies: either serve the SDK's requests through your own backend, or have the
API allow your web origin — a browser can't call a cross-origin API that doesn't
return CORS headers.

#### Node.js

Node has no native WebRTC, so install the optional adapter and wire it in:

```bash
npm install @roamhq/wrtc
```

```ts
import { AethexAI } from "aethexai";
import { Conversation } from "aethexai/realtime";
import { createNodeWebRTC, createAudioSink } from "aethexai/realtime/node";

const client = new AethexAI({ apiKey: "ae_live_..." });
const node = await createNodeWebRTC(); // synthetic mic (silence by default)
const convo = new Conversation(client, { agentId: "ag_...", ...node.conversationOptions });

convo.on("agentText", (t) => console.log("agent:", t));
convo.on("track", async (track) => {
  await createAudioSink(track, (frame) => {
    /* frame.samples is Int16 PCM at frame.sampleRate */
  });
});

await convo.start();
// node.pushPcm(int16Frame) to send real mic audio (10ms frames at the sample rate)
await convo.end();
node.close();
```

## Pagination

List methods return a single-page `PaginatedResponse`. It is iterable, has a
`.length`, supports `.at(i)`, and exposes `.hasMore` — loop while `.hasMore` to
consume every page.

```ts
let offset = 0;
const limit = 50;
for (;;) {
  const page = await client.listCalls({ offset, limit });
  for (const call of page) console.log(call.id);
  if (!page.hasMore) break;
  offset += limit;
}
```

## Platform coverage

`AethexAI` uses a flat method surface: one method per endpoint, no nested
namespaces.

| Area             | Methods                                                                                                                                                         |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Agents           | `createAgent`, `listAgents`, `getAgent`, `updateAgent`, `deleteAgent`, `duplicateAgent`                                                                         |
| Tools            | `addAgentTool`, `listAgentTools`, `updateAgentTool`, `deleteAgentTool`                                                                                          |
| Knowledge base   | `uploadKnowledgeDoc`, `uploadKnowledgeDocByUpload`, `listKnowledgeDocs`, `queryKnowledgeBase`, `processKnowledgeDoc`, `getKnowledgeTexts`, `deleteKnowledgeDoc` |
| Calls            | `triggerCall`, `batchCalls`, `listCalls`, `getCall`, `getCallStatus`, `getCallBatch`                                                                            |
| TTS              | `synthesizeSpeech`, `streamSpeech`, `batchSynthesize`, `getTtsBatch`                                                                                            |
| Transcription    | `transcribeAudio`, `transcribeAudioAsync`, `getTranscriptionJob`, `cancelTranscriptionJob`                                                                      |
| Conversations    | `listConversations`, `getConversation`, `getTranscript`, `streamAudio`, `submitFeedback`, `searchConversations`                                                 |
| Phone and SIP    | `listPhoneNumbers`, `registerTwilioPhoneNumber`, `registerSipPhoneNumber`, `setPhoneNumberRouting`                                                              |
| Twilio accounts  | `registerTwilioAccount`, `listTwilioAccounts`, `getTwilioAccount`, `releaseTwilioAccount`                                                                       |
| Usage & webhooks | `getUsage`, `getUsageSummary`, `getDailyUsage`, `getMonthlyUsage`, `listTriggers`, `createTrigger`                                                              |
| API keys         | `listApiKeys`, `createApiKey`, `rotateApiKey`, `revokeApiKey`                                                                                                   |
| Voices           | `listVoices`, `getVoice`, `previewVoice`, `listTagVocabulary`, `listCountries`                                                                                  |

See the [API reference](https://developers.aethexai.com/docs/api-reference) for
request and response fields.

## Developer account and billing

Billing and account endpoints require a developer JWT from the dashboard auth
flow, not an API key. Use `DeveloperClient` for those calls.

```ts
import { DeveloperClient } from "aethexai";

const developer = new DeveloperClient({
  accessToken: "eyJhbGciOi...",
  refreshToken: "eyJhbGciOi...", // optional; enables one retry after refresh
});

const balance = await developer.getBalance();
const plans = await developer.listPlans();
```

`DeveloperClient` reads `AETHEX_DEVELOPER_ACCESS_TOKEN` and
`AETHEX_DEVELOPER_REFRESH_TOKEN` when tokens are not passed explicitly. When an
authenticated request returns 401 and a refresh token is available, the client
transparently refreshes the access token and retries the request once.

## Configuration

```ts
const client = new AethexAI({
  apiKey: "ae_live_...",
  baseURL: "https://api.aethexai.com",
  timeout: 30_000, // milliseconds
});
```

| Option    | Default                    | Description                                                      |
| --------- | -------------------------- | ---------------------------------------------------------------- |
| `apiKey`  | `$AETHEX_API_KEY`          | API key sent as `X-API-Key`.                                     |
| `baseURL` | `https://api.aethexai.com` | AethexAI API base URL.                                           |
| `timeout` | `30000`                    | Per-request timeout in milliseconds.                             |
| `fetch`   | `globalThis.fetch`         | Custom `fetch` implementation (testing, proxies, custom agents). |

### Environment variables

| Variable                         | Used by           | Notes                              |
| -------------------------------- | ----------------- | ---------------------------------- |
| `AETHEX_API_KEY`                 | `AethexAI`        | Required unless you pass `apiKey`. |
| `AETHEX_DEVELOPER_ACCESS_TOKEN`  | `DeveloperClient` | JWT for account/billing.           |
| `AETHEX_DEVELOPER_REFRESH_TOKEN` | `DeveloperClient` | Optional; enables token refresh.   |

## Errors

Non-2xx responses reject with typed errors. Transport failures are mapped to SDK
errors, so production callers can centralize retry, alerting, and escalation
logic.

```ts
import {
  AethexAI,
  AethexError,
  AuthenticationError,
  NotFoundError,
  RateLimitError,
  ValidationError,
} from "aethexai";

const client = new AethexAI({ apiKey: "ae_live_..." });

try {
  const agent = await client.getAgent("00000000-0000-0000-0000-000000000000");
} catch (err) {
  if (err instanceof NotFoundError) console.log("Agent not found");
  else if (err instanceof RateLimitError) console.log(`Retry after ${err.retryAfter}s`);
  else if (err instanceof AuthenticationError) console.log("Invalid API key");
  else if (err instanceof ValidationError) console.log("Request rejected:", err.response);
  else if (err instanceof AethexError) console.log("SDK error:", err.message);
  else throw err;
}
```

| Status          | Error                            |
| --------------- | -------------------------------- |
| 401             | `AuthenticationError`            |
| 403             | `PermissionDeniedError`          |
| 404             | `NotFoundError`                  |
| 409             | `ConflictError`                  |
| 422             | `ValidationError`                |
| 429             | `RateLimitError` (`.retryAfter`) |
| 5xx             | `InternalServerError`            |
| Network failure | `APIConnectionError`             |
| Timeout         | `APITimeoutError`                |

All status-derived errors extend `APIStatusError` and carry `message`, `code`,
`statusCode`, `response`, and `headers`.

## TypeScript model types

The generated request/response model types are exported under the `Aethex`
namespace for advanced typing:

```ts
import type { Aethex } from "aethexai";

function summarize(agent: Aethex.AgentResponse): string {
  return `${agent.name} (${agent.id})`;
}
```

## Development

The generated REST client lives under `src/_generated/` and is built from
`openapi.json`. **Do not edit it by hand** — it is regenerated on every backend
sync. The maintained SDK surface lives in `src/client.ts`, `src/kora.ts`,
`src/developer.ts`, `src/errors.ts`, and `src/pagination.ts`.

```bash
npm install
npm run generate     # regenerate src/_generated/ from openapi.json
npm run typecheck
npm run lint
npm test
npm run build
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full workflow. Questions can be
sent to [developers@aethexai.com](mailto:developers@aethexai.com).

## License

Released under the [MIT License](LICENSE).
