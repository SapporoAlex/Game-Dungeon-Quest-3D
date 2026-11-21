// Level list = the five hand-made quests (levels-base.js, lightly post-processed below) + 30 generated quests (levelgen.js).
// Pure data — no DOM — so tools/check_levels.mjs can import it.
import { BASE_LEVELS } from "./levels-base.js";
import { generateLevels } from "./levelgen.js";

// Hand-placed extras for the original quests: searchable bookshelves, persian rugs, descriptions for the level menu.
// Bookshelf `rot` = direction the shelf faces (away from the wall it stands against); rugs are tile rectangles.
const EXTRAS = {
  tutorial: { kind: "tutorial", goalText: "Find the stairwell.", desc: "A short guided cellar: learn to move, open doors, dodge traps, swing your sword and loot crates. Step on the stairwell to finish." },
  quest1: {
    kind: "escape", goalText: "Escape via the western stairwell.",
    desc: "A warren of sealed rooms, packed with goblins, skeletons and chaos warriors. Fight your way west and escape by the stairwell on the far side of the dungeon.",
    props: [{ t: "bookshelf", c: 7, r: 2, rot: "S" }, { t: "bookshelf", c: 12, r: 2, rot: "S" }, { t: "bookshelf", c: 17, r: 10, rot: "S" }, { t: "bookshelf", c: 2, r: 10, rot: "S" }],
    rugs: [{ c: 2, r: 2, w: 2, h: 4, pal: "crimson" }, { c: 2, r: 10, w: 2, h: 4, pal: "indigo" }],
  },
  quest2: {
    kind: "dragon", goalText: "Slay the Red Dragon.",
    desc: "A Red Dragon lairs in the south-east of the dungeon. Hunt it down, slay it, then return to the stairwell where you started.",
    props: [{ t: "bookshelf", c: 2, r: 12, rot: "E" }, { t: "bookshelf", c: 14, r: 2, rot: "S" }],
    rugs: [{ c: 2, r: 2, w: 3, h: 5, pal: "emerald" }, { c: 13, r: 10, w: 4, h: 4, pal: "crimson" }],
  },
  quest3: {
    kind: "clear", goalText: "Defeat every enemy.",
    desc: "The Rampage: every last enemy must fall before the stairwells unlock. Beware the great east hall — its door seals behind you and stays shut until the hall is cleared.",
    props: [{ t: "bookshelf", c: 5, r: 5, rot: "S" }, { t: "bookshelf", c: 13, r: 5, rot: "S" }, { t: "bookshelf", c: 5, r: 14, rot: "E" }],
    rugs: [{ c: 5, r: 6, w: 4, h: 3, pal: "indigo" }, { c: 10, r: 6, w: 4, h: 3, pal: "amber" }],
    lockRoom: { door: [14, 1], rect: [15, 0, 19, 15] },          // the final large room: sealed behind the player until its enemies are dead
  },
  quest4: {
    kind: "dragon", goalText: "Slay the Red Dragon.",
    desc: "A dragon guards the sunken vault in the south-east. Cross the flooded halls, slay the beast, then take the stairwell.",
    props: [{ t: "bookshelf", c: 7, r: 0, rot: "S" }, { t: "bookshelf", c: 12, r: 4, rot: "W" }, { t: "bookshelf", c: 5, r: 10, rot: "W" }],
    rugs: [{ c: 1, r: 1, w: 4, h: 3, pal: "emerald" }, { c: 8, r: 8, w: 4, h: 3, pal: "crimson" }, { c: 15, r: 12, w: 4, h: 4, pal: "indigo" }],
  },
};

const BASE_THEMES = {
  tutorial: { wall: 0xb0a89c, floor: 0xa8a8a8, fog: 0x0a0806, amb: 0x806a58 },
  quest1: { wall: 0x9aa4b4, floor: 0x9ca0aa, fog: 0x06080c, amb: 0x586078 },
  quest2: { wall: 0xb89a78, floor: 0xa89078, fog: 0x0c0704, amb: 0x806048 },
  quest3: { wall: 0xc08a80, floor: 0xb07068, fog: 0x100403, amb: 0x804038 },
  quest4: { wall: 0x7aa8a0, floor: 0x7a9890, fog: 0x030a09, amb: 0x406860 },
};

const NEIGH = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1], [2, 0], [0, 2], [-2, 0], [0, -2]];
/** twice as many enemies: every foe gets a partner, mostly goblin archers (the rest are more of the same kind) */
function addPartners(L) {
  const taken = new Set(L.enemies.map((e) => e.c + "," + e.r));
  const blocked = new Set([...L.props.map((p) => p.c + "," + p.r), ...L.doors.map((d) => d.c + "," + d.r)]);
  const out = [];
  L.enemies.forEach((e, i) => {
    out.push(e);
    if (e.t === "dragon" || e.t === "wizard") return;
    if (e.t === "dragon") return;
    let spot = null;
    for (const [dc, dr] of NEIGH) {
      const c = e.c + dc, r = e.r + dr, ch = L.map[r]?.[c];
      if (ch === undefined || ch === "#" || ch === "E" || taken.has(c + "," + r) || blocked.has(c + "," + r)) continue;
      spot = [c, r]; break;
    }
    if (!spot) spot = [e.c, e.r];
    taken.add(spot.join(","));
    out.push({ t: i % 3 === 2 && e.t !== "archer" ? e.t : "archer", c: spot[0], r: spot[1] });
  });
  return out;
}

const base = BASE_LEVELS.map((L) => {
  const x = EXTRAS[L.id] || {};
  const lvl = { ...L, theme: BASE_THEMES[L.id], kind: x.kind, goalText: x.goalText, desc: x.desc, props: [...L.props, ...(x.props || [])], rugs: x.rugs || [], lockRoom: x.lockRoom };
  if (L.id !== "tutorial") lvl.enemies = addPartners(lvl);       // the tutorial stays gentle
  return lvl;
});

export const LEVELS = [...base, ...generateLevels()];
