# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2026-06-29

### Added

- Initial release of the Aethex AI TypeScript SDK.
- `AethexAI` client covering the full API-key surface: agents, agent tools,
  knowledge base, calls, conversations (live sessions + history), TTS,
  transcription, phone numbers, SIP, Twilio accounts, recordings, uploads,
  usage, webhooks/triggers, models, and voices.
- `Kora` voice-focused client with ergonomic positional constructors.
- `DeveloperClient` for JWT-authenticated account and billing, with transparent
  refresh-on-401-then-retry.
- Typed error hierarchy (`AethexError` → `APIStatusError` subclasses +
  `APIConnectionError` / `APITimeoutError`).
- `PaginatedResponse<T>` (iterable, `.length`, `.at()`, `.hasMore`).
- Binary audio helpers returning `Uint8Array` and streaming TTS via
  `AsyncGenerator<Uint8Array>`.
- Realtime WebRTC `Conversation` (browser-first) at the `aethexai/realtime`
  entry point: typed event emitter over the SmallWebRTC + RTVI protocol, with a
  `peerConnectionFactory` hook for Node WebRTC implementations.
- Node WebRTC adapter at `aethexai/realtime/node` (`createNodeWebRTC`,
  `createAudioSink`) backed by the optional `@roamhq/wrtc` peer dependency, with
  a silent synthetic mic for connectivity tests and `pushPcm` for real audio.
- Dual ESM + CommonJS build with TypeScript declarations.
