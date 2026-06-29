# Contributing

Thanks for helping improve the Aethex AI TypeScript SDK.

## Setup

```bash
npm install
```

Requires Node.js 20+.

## Project layout

- `src/_generated/` — generated REST client (`@hey-api/openapi-ts` from
  `openapi.json`). **Never edit by hand**; it is regenerated on every backend
  sync and is excluded from eslint/prettier.
- `src/client.ts`, `src/kora.ts`, `src/developer.ts` — the maintained,
  hand-written client surface.
- `src/_core.ts` — shared request plumbing (`callOp`, `callBinary`,
  `callStream`, auth, timeouts).
- `src/errors.ts`, `src/pagination.ts` — typed errors and the paginated wrapper.

## Workflow

```bash
npm run generate     # regenerate src/_generated/ after an openapi.json change
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm run format       # prettier --write
npm test             # vitest
npm run build        # tsup -> dist/
```

Branch off `main` with a prefix: `feat/`, `fix/`, `chore/`, `docs/`, `refactor/`.

## Git hooks

`npm install` sets up a [husky](https://typicode.github.io/husky/) **pre-commit**
hook (via the `prepare` script). On every commit it runs
[lint-staged](https://github.com/lint-staged/lint-staged) — `eslint --fix` +
`prettier --write` on staged files — then `npm run typecheck`, so unformatted,
lint-broken, or type-broken code can't be committed. The full test suite and
build run in CI. To bypass the hook in an emergency: `git commit --no-verify`.

## Adding a method

1. Add the method to the relevant client (`client.ts` / `kora.ts` /
   `developer.ts`), funneling through `callOp` / `callBinary` / `callStream`.
2. Type parameters with the generated request models from
   `src/_generated/types.gen`.
3. Add a vitest test under `tests/` using the `fetchMock` helper
   (`tests/helpers.ts`) — no live API calls.
4. Record the change in `CHANGELOG.md` under `## [Unreleased]`.

## Releasing

Releases are tag-driven — move the `[Unreleased]` CHANGELOG entries under the new
version, then `npm version <x>` (bumps `package.json` and regenerates
`src/version.ts`, commits, and tags) and `git push --follow-tags`; CI publishes
to npm with provenance.

Questions: [developers@aethexai.com](mailto:developers@aethexai.com).
