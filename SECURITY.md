# Security Policy

## Reporting a vulnerability

If you discover a security vulnerability in the Aethex AI TypeScript SDK, please
report it privately to **security@aethexai.com**. Do not open a public issue for
security reports.

Include where possible:

- A description of the vulnerability and its impact.
- Steps to reproduce or a proof of concept.
- The SDK version and runtime (Node.js version / browser).

We aim to acknowledge reports within 3 business days and will keep you updated
as we investigate and ship a fix.

## Handling credentials

- Never commit API keys or developer JWTs. Load them from environment variables
  (`AETHEX_API_KEY`, `AETHEX_DEVELOPER_ACCESS_TOKEN`,
  `AETHEX_DEVELOPER_REFRESH_TOKEN`) or a secrets manager.
- API keys are sent as the `X-API-Key` header; developer tokens as
  `Authorization: Bearer`. Always use HTTPS base URLs.
- Rotate keys with `client.rotateApiKey(...)` if you suspect exposure.

## Supported versions

The latest published minor version receives security fixes.
