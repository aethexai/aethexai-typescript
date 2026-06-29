/**
 * Quickstart example: create a voice agent, synthesize speech, and place a call.
 *
 * Run with:  AETHEX_API_KEY=ae_live_... npx tsx examples/quickstart.ts
 */

import { writeFile } from "node:fs/promises";
import { AethexAI } from "../src/index";

async function main(): Promise<void> {
  const client = new AethexAI(); // reads AETHEX_API_KEY

  // Pick a voice.
  const voices = await client.listVoices({ language: "english", limit: 5 });
  const voice = voices.at(0);
  if (!voice) throw new Error("no voices available");
  console.log(`using voice ${voice.id} ${voice.name}`);

  // Create an agent.
  const agent = await client.createAgent({
    name: "Customer Operations Assistant",
    system_prompt:
      "You are a professional customer operations assistant. Help callers " +
      "confirm appointments and answer policy questions.",
    first_message: "Hello, how can I help you today?",
    voice_id: voice.id,
    language: "english",
  });
  console.log(`created agent ${agent.id}`);

  // Synthesize a greeting to a WAV file.
  const audio = await client.synthesizeSpeech({
    text: "Your appointment has been confirmed for tomorrow at 10 AM.",
    voice_id: voice.id,
    language: "english",
  });
  await writeFile("./greeting.wav", audio);
  console.log(`wrote greeting.wav (${audio.byteLength} bytes)`);

  // Place an outbound call (uncomment and set a real number to run):
  // const call = await client.triggerCall({ agent_id: agent.id, to_number: "+15555550123" });
  // console.log(`call ${call.id} -> ${call.status}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
