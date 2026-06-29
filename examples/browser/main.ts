/**
 * Browser realtime demo wiring. Run with `npm run demo` (Vite serves this on
 * localhost — a secure context, so getUserMedia works). Imports the SDK source
 * directly, so it always reflects the current code.
 */
import { AethexAI } from "../../src/index";
import { Conversation, type ConversationStatus } from "../../src/realtime/index";

const $ = <T extends HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`#${id} not found`);
  return el as T;
};

const apiKeyEl = $<HTMLInputElement>("apiKey");
const agentIdEl = $<HTMLInputElement>("agentId");
const connectBtn = $<HTMLButtonElement>("connect");
const hangupBtn = $<HTMLButtonElement>("hangup");
const statusEl = $<HTMLSpanElement>("status");
const logEl = $<HTMLDivElement>("log");

// Remember the non-secret fields between reloads (never the API key).
const STORE = "aethex-demo";
try {
  const saved = JSON.parse(localStorage.getItem(STORE) ?? "{}");
  if (saved.agentId) agentIdEl.value = saved.agentId;
} catch {
  /* ignore */
}

let convo: Conversation | null = null;
let logCleared = false;

function log(text: string, cls: "user" | "agent" | "sys"): void {
  if (!logCleared) {
    logEl.innerHTML = "";
    logCleared = true;
  }
  const line = document.createElement("div");
  line.className = `line ${cls}`;
  line.textContent = text;
  logEl.appendChild(line);
  logEl.scrollTop = logEl.scrollHeight;
}

function setStatus(state: ConversationStatus | "idle"): void {
  statusEl.textContent = state;
  statusEl.dataset.state = state;
}

async function connect(): Promise<void> {
  const apiKey = apiKeyEl.value.trim();
  const agentId = agentIdEl.value.trim();
  if (!apiKey || !agentId) {
    log("Enter an API key and an agent ID first.", "sys");
    return;
  }
  localStorage.setItem(STORE, JSON.stringify({ agentId }));

  connectBtn.disabled = true;
  // Empty baseURL → same-origin requests (/api/...) that the Vite dev proxy
  // forwards to the real API, avoiding browser CORS.
  const client = new AethexAI({ apiKey, baseURL: "" });
  convo = new Conversation(client, { agentId });

  convo.on("statusChange", (s) => setStatus(s));
  convo.on("userTranscript", (t) => log(t, "user"));
  convo.on("agentText", (t) => log(t, "agent"));
  convo.on("agentStoppedSpeaking", () => console.debug("[agent stopped speaking]"));
  convo.on("metrics", (m) => console.debug("[metrics]", m));
  convo.on("error", (e) => {
    console.error(e);
    log(`error: ${e.message}`, "sys");
  });

  try {
    log("Connecting… (allow microphone access)", "sys");
    await convo.start();
    log("Connected — start talking.", "sys");
    hangupBtn.disabled = false;
  } catch (err) {
    log(`Failed to connect: ${(err as Error).message}`, "sys");
    setStatus("failed");
    connectBtn.disabled = false;
    convo = null;
  }
}

async function hangup(): Promise<void> {
  hangupBtn.disabled = true;
  await convo?.end();
  convo = null;
  connectBtn.disabled = false;
  log("Call ended.", "sys");
}

connectBtn.addEventListener("click", () => void connect());
hangupBtn.addEventListener("click", () => void hangup());
window.addEventListener("beforeunload", () => void convo?.end());
