#!/usr/bin/env node
/**
 * Generate `src/version.ts` from `package.json` "version".
 *
 * Runs automatically via npm's `version` lifecycle hook (see package.json), so
 * `npm version <x>` is the single place a version is set — `src/version.ts` is
 * derived, never hand-edited. The release workflow's tag↔version check then
 * always holds.
 */
import { readFileSync, writeFileSync } from "node:fs";

const { version } = JSON.parse(readFileSync("package.json", "utf8"));

const content =
  [
    '// GENERATED from package.json "version" by scripts/sync-version.mjs.',
    "// Do not edit by hand — run `npm version <x>` (it regenerates this file).",
    `export const VERSION = ${JSON.stringify(version)};`,
  ].join("\n") + "\n";

writeFileSync("src/version.ts", content);
console.log(`src/version.ts -> VERSION = ${version}`);
