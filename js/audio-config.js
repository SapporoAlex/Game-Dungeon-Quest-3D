// ---------------------------------------------------------------------------
//  AUDIO CONFIG — swap sounds and music here without touching any game code.
//  Put your files in the /audio folder and list them below (paths are relative to index.html).
//  Each sound can list several files; one is picked at random each time.
//  Sounds marked "synth" are generated in code (no file needed) – set a `file` list to override them.
// ---------------------------------------------------------------------------
// Background music. With `src: ""` the game plays its built-in synthesised tracks (js/music.js): dark atmospheric dungeon
// ambience for the dungeon / menus, and a happy flute-and-harp elven tune in the shop.
// To use your own recordings instead, put the files in /audio and set the paths here (e.g. "audio/dungeon.mp3", "audio/shop.mp3").
// (The previous track, audio/music.mp3, is still in the repo — set MUSIC.src to "audio/music.mp3" to bring it back.)
export const MUSIC = { src: "", volume: 0.2 };
export const SHOP_MUSIC = { src: "", volume: 0.09 };

export const SFX = {
  // name:      { files: [...], volume }
  hit:      { files: ["audio/attack.mp3", "audio/attack2.mp3", "audio/attack3.mp3", "audio/attack4.mp3", "audio/attack5.mp3"], volume: 0.45 }, // weapon / spell hits an enemy
  enemyDie: { files: ["audio/enemy_death.mp3", "audio/enemy_death2.mp3"], volume: 0.5 },
  hurt:     { files: ["audio/death.mp3", "audio/death2.mp3"], volume: 0.45 },   // player takes damage
  open:     { files: ["audio/chest.mp3"], volume: 0.5 },                         // chest / crate / barrel / table opened
  click:    { files: ["audio/click.mp3"], volume: 0.5 },
  // synthesised by default — add `files: [...]` to any of these to replace them with real samples:
  swing: {}, door: {}, zap: {}, coin: {}, pickup: {}, mana: {}, drink: {}, buy: {}, deny: {}, fire: {}, arrow: {}, roar: {}, stairs: {}, smash: {},
  bow: {}, lightning: {}, lock: {}, secret: {}, found: {},   // goblin archer shot · enemy wizard lightning · door sealed · secret door · princess / tome found
};
