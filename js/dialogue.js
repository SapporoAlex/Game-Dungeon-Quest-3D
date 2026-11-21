// Every spoken line in the game. Pure data (no DOM) so tools/make_dialogue_placeholders.mjs can import it too.
//
// Each line has a voice file:  audio/dialogue-<spoken text>.mp3
// (characters that Windows can't use in file names — ? : " * < > | / \ — are dropped from the file name).
// Run `node tools/make_dialogue_placeholders.mjs` to create silent placeholders for any line that has no file yet,
// then replace them with real recordings (same file name). New lines added below get picked up by that script.

export const LIRAEL = {
  greet: ["Welcome, traveler! Lirael's Emporium has everything a brave adventurer needs.", "Ooh, you survived! Do come in — mind the dungeon mud on my floor."],
  buy: ["A fine choice! May it serve you well.", "Pleasure doing business with you!", "That one's my favourite, too.", "Thank you kindly! Come back anytime."],
  poor: ["Oh dear… you're a little short on gold.", "Come back when your purse is heavier, dear."],
  full: ["You couldn't possibly carry any more of those!", "You already have all the benefit that one can give."],
};

export const PRINCESS = {
  found: ["You came for me? Thank the stars! Lead the way — I will follow you out of here."],
  follow: ["Stay close, brave hero. I am right behind you.", "Hurry, I can hear them coming!", "I will not leave your side."],
  freed: ["We are free! Thank you, hero. The kingdom will hear of this."],
};

export const WIZARD = {
  taunt: ["You dare enter my tower? Foolish mortal!", "Feel the wrath of the storm!"],
  dying: ["Impossible… the lightning… fades…"],
};

export const TOME = {
  found: ["The Tome of Horass hums with power. Now, to leave this place!"],
};

export const ALL_LINES = [
  ...Object.values(LIRAEL).flat(), ...Object.values(PRINCESS).flat(), ...Object.values(WIZARD).flat(), ...Object.values(TOME).flat(),
];

/** file name for a spoken line, e.g. "audio/dialogue-Hurry, I can hear them coming!.mp3" */
export function dialogueFile(text) {
  const clean = text.replace(/[?:"*<>|\\/]/g, "").replace(/\s+/g, " ").trim();
  return `audio/dialogue-${clean}.mp3`;
}
