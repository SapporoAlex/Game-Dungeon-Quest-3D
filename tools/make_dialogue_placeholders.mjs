// Creates a short silent placeholder mp3 for every spoken line in js/dialogue.js that has no audio file yet.
// Existing files are never overwritten, so it is safe to re-run after adding lines or after dropping in real recordings.
//   node tools/make_dialogue_placeholders.mjs
import { ALL_LINES, dialogueFile } from "../js/dialogue.js";
import { existsSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
// MPEG-1 Layer III, 128 kbps, 44.1 kHz, stereo: 417-byte frames of silence (~26 ms each) -> ~0.8 s
const frame = Buffer.alloc(417); frame.set([0xff, 0xfb, 0x90, 0x00]);
const mp3 = Buffer.concat(Array.from({ length: 30 }, () => frame));

mkdirSync(join(root, "audio"), { recursive: true });
let made = 0;
for (const line of new Set(ALL_LINES)) {
  const f = join(root, dialogueFile(line));
  if (existsSync(f)) continue;
  writeFileSync(f, mp3); made++; console.log("created", dialogueFile(line));
}
console.log(`${made} placeholder(s) created, ${new Set(ALL_LINES).size - made} already existed.`);
