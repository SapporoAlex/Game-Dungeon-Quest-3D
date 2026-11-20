// ---------------------------------------------------------------------------
//  AUDIO CONFIG — swap sounds and music here without touching any game code.
//  Put your files in the /audio folder and list them below (paths are relative to index.html).
//  Each sound can list several files; one is picked at random each time.
//  Sounds marked "synth" are generated in code (no file needed) – set a `file` list to override them.
// ---------------------------------------------------------------------------
export const MUSIC = {
  src: "audio/music.mp3",     // looping background music (set to "" for none)
  volume: 0.18,
};

export const SFX = {
  // name:      { files: [...], volume }
  hit:      { files: ["audio/attack.mp3", "audio/attack2.mp3", "audio/attack3.mp3", "audio/attack4.mp3", "audio/attack5.mp3"], volume: 0.45 }, // weapon / spell hits an enemy
  enemyDie: { files: ["audio/enemy_death.mp3", "audio/enemy_death2.mp3"], volume: 0.5 },
  hurt:     { files: ["audio/death.mp3", "audio/death2.mp3"], volume: 0.45 },   // player takes damage
  open:     { files: ["audio/chest.mp3"], volume: 0.5 },                         // chest / crate / barrel / table opened
  click:    { files: ["audio/click.mp3"], volume: 0.5 },
  // synthesised by default — add `files: [...]` to any of these to replace them with real samples:
  swing: {}, door: {}, zap: {}, coin: {}, pickup: {}, mana: {}, drink: {}, buy: {}, deny: {}, fire: {}, arrow: {}, roar: {}, stairs: {}, smash: {},
};
