// Deterministic (seeded) generator for the 30 extra quests: Defeat the Dark Wizard · Find the Tome of Horass ·
// Rescue the Elven Princess · Escape.  Produces level objects in exactly the same format as js/levels-base.js,
// so the game code treats generated and hand-made quests identically.  Pure data — no DOM — so tools/check_levels.mjs can run it.

const mulberry32 = (a) => () => {
  a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const DIRS = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] };
const D4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];

const THEMES = {
  moss: { wall: 0x7a9a7a, floor: 0x7a8a76, fog: 0x040a05, amb: 0x486a50 },
  violet: { wall: 0x9a8ab8, floor: 0x8a8098, fog: 0x0a0610, amb: 0x68588a },
  ember: { wall: 0xc0805a, floor: 0xa07058, fog: 0x120503, amb: 0x884830 },
  frost: { wall: 0x9ab8c8, floor: 0x90a4b0, fog: 0x04080c, amb: 0x587890 },
  gold: { wall: 0xc8b078, floor: 0xb09a68, fog: 0x0e0a03, amb: 0x887040 },
  crypt: { wall: 0x8a8a8a, floor: 0x7a7a7e, fog: 0x050505, amb: 0x585860 },
  blood: { wall: 0xb06a6a, floor: 0x985858, fog: 0x120304, amb: 0x7a3434 },
  sea: { wall: 0x6aa0a8, floor: 0x6a9094, fog: 0x020a0c, amb: 0x3a6a70 },
};
const THEME_BY_KIND = { dragon: ["ember", "blood", "crypt", "gold"], finale: ["violet"], wizard: ["violet", "crypt", "blood"], tome: ["gold", "moss", "crypt"], princess: ["frost", "sea", "violet"], escape: ["ember", "blood", "crypt", "moss"] };
const RUG_PALS = ["crimson", "indigo", "emerald", "amber"];

// ----------------------------------------------------------------------------------------------- story text
const KINDS = ["escape", "tome", "princess", "wizard", "dragon"];
// order of the 41 extra quests: escape, tome, princess, wizard, dragon (x8), then the final battle
const ORDER = Array.from({ length: 41 }, (_, i) => (i === 40 ? "finale" : KINDS[i % 5]));
const TEXT = {
  dragon: {
    names: ["The Wyrm's Lair", "Embers of the Deep", "Dragonfire Cavern", "The Scaled Tyrant", "Smoldering Halls", "Hoard of the Wyrm", "Twin Flames", "The Elder Wyrm"],
    desc: "Dragons lair in the deepest halls of this dungeon. Track down and slay every dragon — their fire will find you across a room — then return to the stairwell where you began.",
    hint: "A dragon lairs somewhere in this dungeon. Slay it (or them!), then return to the stairwell.",
    goalText: "Slay the dragons.",
  },
  finale: {
    names: ["The Final Battle"],
    desc: "The last trial. In the great hall at the heart of the dungeon wait two dragons, the dark wizard and his captive, the Elven Princess. The doors seal the moment you step inside. Defeat them all, free the princess and fight your way back out.",
    hint: "The final hall lies somewhere in this dungeon. Once you step inside, its doors seal until every guardian is dead.",
    goalText: "Slay the 2 dragons and the wizard, then free the princess.",
  },
  escape: {
    names: ["Out of the Oubliette", "The Long Way Up", "Chains and Cinders", "Breakout at Blackgate", "Run for the Daylight", "The Warden's Maze", "Crypt Crawl", "Last Stair to Freedom"],
    desc: "You have been thrown into a dungeon cell and the guards are awake. Fight or sneak your way through the halls — and look for loose stones — to reach the stairwell on the far side and escape.",
    hint: "Escape! Find the stairwell on the far side of the dungeon. Open doors with E — and some walls aren't really walls…",
    goalText: "Find the stairwell and escape.",
  },
  tome: {
    names: ["The Library Labyrinth", "Maze of a Thousand Doors", "The Scribe's Warren", "Halls of Whispering Pages", "The Forgotten Archive", "Catacomb of Chapters", "The Last Labyrinth"],
    desc: "The Tome of Horass lies hidden in the deepest chamber of a labyrinth of countless small rooms. Search every dead end, find the glowing book, then retrace your steps to the stairwell where you began.",
    hint: "Somewhere in this labyrinth lies the Tome of Horass — a glowing book. Find it, then return to the stairwell.",
    goalText: "Find the Tome of Horass.",
  },
  princess: {
    names: ["The Silver Tower", "A Princess in Peril", "The Gilded Cage", "Moonlit Dungeon", "The Thornkeep Rescue", "Royal Escort", "Shadows over the Keep"],
    desc: "An Elven Princess is held captive in a distant chamber of the dungeon. Find her — she will follow you once she is free — then lead the way back to the stairwell. Only you need to reach it.",
    hint: "An Elven Princess is imprisoned in a room far from here. Find her, then take her back to the stairwell.",
    goalText: "Find the Elven Princess.",
  },
  wizard: {
    names: ["The Wizard's Sanctum", "Stormcaller's Lair", "The Violet Spire", "Duel in the Dark", "The Green-Eyed Mage", "Thunder Hall", "The Archmage's Vault", "The Tempest Throne"],
    desc: "A dark wizard in purple robes, his eyes burning green, has taken over the dungeon. He hurls lightning from afar — break his line of sight, close the distance and strike him down, then return to the stairwell.",
    hint: "A Dark Wizard hides in this dungeon. Beware his lightning — duck behind walls and doors, then strike!",
    goalText: "Defeat the Dark Wizard.",
  },
};

// ----------------------------------------------------------------------------------------------- grid helpers
function makeGrid(cols, rows) { return Array.from({ length: rows }, () => Array(cols).fill("#")); }
const inb = (g, c, r) => r >= 0 && c >= 0 && r < g.length && c < g[0].length;
const open = (g, c, r) => inb(g, c, r) && g[r][c] !== "#";
function bfs(g, sc, sr) {
  const R = g.length, C = g[0].length, d = new Int32Array(R * C).fill(-1), q = [sr * C + sc]; d[q[0]] = 0;
  for (let i = 0; i < q.length; i++) {
    const c = q[i] % C, r = (q[i] / C) | 0;
    for (const [dc, dr] of D4) { const nc = c + dc, nr = r + dr; if (!open(g, nc, nr) || d[nr * C + nc] >= 0) continue; d[nr * C + nc] = d[r * C + c] + 1; q.push(nr * C + nc); }
  }
  return d;
}

// ----------------------------------------------------------------------------------------------- layouts
function layoutRooms(rng, cols, rows, count, minS, maxS) {
  const g = makeGrid(cols, rows), rooms = [], ri = (a, b) => a + Math.floor(rng() * (b - a + 1));
  for (let tries = 0; tries < 600 && rooms.length < count; tries++) {
    const w = ri(minS, maxS), h = ri(minS, maxS), x = ri(2, cols - w - 2), y = ri(2, rows - h - 2);
    if (rooms.some((o) => x < o.x + o.w + 3 && x + w + 3 > o.x && y < o.y + o.h + 3 && y + h + 3 > o.y)) continue;
    rooms.push({ x, y, w, h });
  }
  for (const o of rooms) for (let r = o.y; r < o.y + o.h; r++) for (let c = o.x; c < o.x + o.w; c++) g[r][c] = ".";
  const ctr = (o) => [o.x + (o.w >> 1), o.y + (o.h >> 1)];
  const carve = (a, b) => {
    let [c, r] = ctr(a); const [tc, tr] = ctr(b), horizFirst = rng() < 0.5;
    const hz = () => { while (c !== tc) { g[r][c] = g[r][c] === "#" ? "." : g[r][c]; c += Math.sign(tc - c); } };
    const vt = () => { while (r !== tr) { g[r][c] = g[r][c] === "#" ? "." : g[r][c]; r += Math.sign(tr - r); } };
    if (horizFirst) { hz(); vt(); } else { vt(); hz(); }
    g[tr][tc] = g[tr][tc] === "#" ? "." : g[tr][tc];
  };
  // minimum spanning tree over room centres, plus a few extra loops
  const linked = new Set([0]), edges = new Set();
  const dist = (a, b) => { const [ac, ar] = ctr(a), [bc, br] = ctr(b); return Math.abs(ac - bc) + Math.abs(ar - br); };
  while (linked.size < rooms.length) {
    let best = null;
    for (const i of linked) for (let j = 0; j < rooms.length; j++) if (!linked.has(j)) { const d = dist(rooms[i], rooms[j]); if (!best || d < best[0]) best = [d, i, j]; }
    linked.add(best[2]); edges.add(best[1] + "-" + best[2]); carve(rooms[best[1]], rooms[best[2]]);
  }
  const extra = Math.max(1, Math.floor(rooms.length / 4));
  for (let k = 0; k < extra; k++) { const i = ri(0, rooms.length - 1), j = ri(0, rooms.length - 1); if (i !== j && !edges.has(i + "-" + j) && !edges.has(j + "-" + i)) { edges.add(i + "-" + j); carve(rooms[i], rooms[j]); } }
  return { g, rooms, passages: null };
}

/** ordinary rooms-and-corridors dungeon plus one big arena room, reached only through a single corridor / door */
function layoutFinale(rng) {
  const base = layoutRooms(rng, 34, 34, 11, 4, 7), g = base.g, rooms = base.rooms;
  for (const row of g) row.push(...Array(18).fill("#"));                        // 34 -> 52 columns
  const A = { x: 36, y: 11, w: 14, h: 12, arena: true, doorRow: 17 };
  for (let r = A.y; r < A.y + A.h; r++) for (let c = A.x; c < A.x + A.w; c++) g[r][c] = ".";
  const from = rooms.reduce((a, b) => (b.x + b.w > a.x + a.w ? b : a)), r0 = from.y + (from.h >> 1);
  for (let c = from.x + (from.w >> 1); c <= 34; c++) if (g[r0][c] === "#") g[r0][c] = ".";
  for (let r = Math.min(r0, A.doorRow); r <= Math.max(r0, A.doorRow); r++) if (g[r][34] === "#") g[r][34] = ".";
  g[A.doorRow][35] = ".";
  rooms.push(A);
  return { g, rooms, passages: null };
}

function layoutMaze(rng, gw, gh) {
  const cols = gw * 4 + 1, rows = gh * 4 + 1, g = makeGrid(cols, rows), rooms = [], passages = [];
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
    const room = { x: 1 + i * 4, y: 1 + j * 4, w: 3, h: 3, gi: i, gj: j }; rooms.push(room);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) g[room.y + r][room.x + c] = ".";
  }
  const seen = new Set(), stack = [[0, 0]]; seen.add("0,0");
  const link = (i, j, ni, nj) => { // open the wall between two adjacent rooms
    const a = rooms[j * gw + i], b = rooms[nj * gw + ni];
    const c = ni > i ? a.x + 3 : ni < i ? b.x + 3 : a.x + 1, r = nj > j ? a.y + 3 : nj < j ? b.y + 3 : a.y + 1;
    g[r][c] = "."; passages.push([c, r]);
  };
  while (stack.length) {
    const [i, j] = stack[stack.length - 1];
    const nb = D4.map(([dc, dr]) => [i + dc, j + dr]).filter(([a, b]) => a >= 0 && b >= 0 && a < gw && b < gh && !seen.has(a + "," + b));
    if (!nb.length) { stack.pop(); continue; }
    const [ni, nj] = nb[Math.floor(rng() * nb.length)]; seen.add(ni + "," + nj); link(i, j, ni, nj); stack.push([ni, nj]);
  }
  // a few extra openings so the labyrinth has loops
  for (let k = 0; k < Math.floor(gw * gh * 0.18); k++) {
    const i = Math.floor(rng() * gw), j = Math.floor(rng() * gh), [dc, dr] = D4[Math.floor(rng() * 4)], ni = i + dc, nj = j + dr;
    if (ni < 0 || nj < 0 || ni >= gw || nj >= gh) continue;
    const c = dc > 0 ? 1 + i * 4 + 3 : dc < 0 ? 1 + ni * 4 + 3 : 1 + i * 4 + 1, r = dr > 0 ? 1 + j * 4 + 3 : dr < 0 ? 1 + nj * 4 + 3 : 1 + j * 4 + 1;
    if (g[r][c] === "#") { g[r][c] = "."; passages.push([c, r]); }
  }
  return { g, rooms, passages };
}

// ----------------------------------------------------------------------------------------------- the generator proper
function generate(n, kind, seed, count) {
  const rng = mulberry32(seed), ri = (a, b) => a + Math.floor(rng() * (b - a + 1)), pick = (a) => a[Math.floor(rng() * a.length)];
  const tier = n / (count - 1);                                  // 0 … 1 across the generated quests
  const labyrinth = kind === "tome";
  let lay;
  if (kind === "finale") lay = layoutFinale(rng);
  else if (labyrinth) lay = layoutMaze(rng, 5 + Math.round(tier * 3), 4 + Math.round(tier * 3));
  else lay = layoutRooms(rng, 30 + Math.round(tier * 16) + ri(0, 4), 26 + Math.round(tier * 12) + ri(0, 4), 8 + Math.round(tier * 5), 4, kind === "wizard" ? 8 : 7);
  const { g, rooms } = lay, R = g.length, C = g[0].length;
  const rid = new Int16Array(R * C).fill(-1);
  rooms.forEach((o, i) => { o.id = i; for (let r = o.y; r < o.y + o.h; r++) for (let c = o.x; c < o.x + o.w; c++) rid[r * C + c] = i; });
  const roomAt = (c, r) => (inb(g, c, r) ? rid[r * C + c] : -1);
  const ctr = (o) => [o.x + (o.w >> 1), o.y + (o.h >> 1)];

  // start room = the room closest to a random corner
  const corner = [rng() < 0.5 ? 0 : C, rng() < 0.5 ? 0 : R];
  rooms.sort((a, b) => (Math.hypot(ctr(a)[0] - corner[0], ctr(a)[1] - corner[1]) - Math.hypot(ctr(b)[0] - corner[0], ctr(b)[1] - corner[1])));
  rooms.forEach((o, i) => { o.id = i; for (let r = o.y; r < o.y + o.h; r++) for (let c = o.x; c < o.x + o.w; c++) rid[r * C + c] = i; });
  const startRoom = rooms[0], [sc, sr] = ctr(startRoom);
  const d0 = bfs(g, sc, sr), dAt = (c, r) => d0[r * C + c];
  rooms.forEach((o) => { const [c, r] = ctr(o); o.dist = dAt(c, r); });
  const maxDist = Math.max(...rooms.map((o) => o.dist));
  const arena = rooms.find((o) => o.arena), pickRoom = () => pick(rooms.filter((o) => o.id !== 0 && !o.arena));

  // ------------------------------------------------------------ doors
  const doors = [], doorSet = new Set(), key = (c, r) => c + "," + r;
  const nearDoor = (c, r) => { for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) if (Math.abs(dc) + Math.abs(dr) <= 2 && doorSet.has(key(c + dc, r + dr))) return true; return false; };
  const addDoor = (c, r, secret) => { doors.push({ key: (secret ? "secret" : "door") + doors.length, c, r, ...(secret ? { secret: true } : {}) }); doorSet.add(key(c, r)); };
  const pDoor = labyrinth ? 0.3 : 0.8;
  for (let r = 1; r < R - 1; r++) for (let c = 1; c < C - 1; c++) {
    if (g[r][c] === "#" || roomAt(c, r) >= 0) continue;
    const ew = g[r - 1][c] === "#" && g[r + 1][c] === "#" && open(g, c - 1, r) && open(g, c + 1, r) && (roomAt(c - 1, r) >= 0 || roomAt(c + 1, r) >= 0);
    const ns = g[r][c - 1] === "#" && g[r][c + 1] === "#" && open(g, c, r - 1) && open(g, c, r + 1) && (roomAt(c, r - 1) >= 0 || roomAt(c, r + 1) >= 0);
    if ((ew || ns) && rng() < pDoor && !nearDoor(c, r)) addDoor(c, r, false);
  }
  if (arena && !doorSet.has(arena.x - 1 + "," + arena.doorRow)) addDoor(arena.x - 1, arena.doorRow, false);   // the arena's one and only door

  // ------------------------------------------------------------ secret doors: 1-thick walls that would be a shortcut + closets
  const wantSecrets = 1 + Math.floor(tier * 3) + (rng() < 0.5 ? 1 : 0);
  let secrets = 0, firstSecret = null;
  const wallCands = [];
  for (let r = 2; r < R - 2; r++) for (let c = 2; c < C - 2; c++) {
    if (g[r][c] !== "#") continue;
    const h = open(g, c - 1, r) && open(g, c + 1, r) && g[r - 1][c] === "#" && g[r + 1][c] === "#";
    const v = open(g, c, r - 1) && open(g, c, r + 1) && g[r][c - 1] === "#" && g[r][c + 1] === "#";
    if (h || v) wallCands.push([c, r, h ? [c - 1, r, c + 1, r] : [c, r - 1, c, r + 1]]);
  }
  for (let i = wallCands.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [wallCands[i], wallCands[j]] = [wallCands[j], wallCands[i]]; }
  for (const [c, r, [ac, ar, bc, br]] of wallCands) {
    if (secrets >= wantSecrets) break;
    if (nearDoor(c, r) || dAt(ac, ar) < 0 || dAt(bc, br) < 0 || Math.abs(dAt(ac, ar) - dAt(bc, br)) < 12) continue;   // must save a real detour
    if ((roomAt(ac, ar) >= 0 && rooms[roomAt(ac, ar)].arena) || (roomAt(bc, br) >= 0 && rooms[roomAt(bc, br)].arena)) continue;   // never a way around the arena door
    g[r][c] = "."; addDoor(c, r, true); secrets++; firstSecret = firstSecret || [c, r, ac, ar];
  }

  const props = [], used = new Set(), closets = [];
  const mark = (c, r) => used.add(key(c, r));
  const wantClosets = labyrinth ? 0 : 1 + (tier > 0.4 ? 1 : 0) + (rng() < 0.4 ? 1 : 0);
  for (let attempt = 0; attempt < 80 && closets.length < wantClosets; attempt++) {
    const room = pickRoom(); if (!room) break;
    const side = pick(["N", "E", "S", "W"]), [dc, dr] = DIRS[side], pc = -dr, pr = dc;     // pc,pr = perpendicular axis
    const along = ri(1, (side === "N" || side === "S" ? room.w : room.h) - 2 + 1) - 1 + 1;   // offset along the side, keeping off the corners
    const ec = side === "E" ? room.x + room.w - 1 : side === "W" ? room.x : room.x + Math.min(room.w - 1, Math.max(0, along));
    const er = side === "S" ? room.y + room.h - 1 : side === "N" ? room.y : room.y + Math.min(room.h - 1, Math.max(0, along));
    if (roomAt(ec, er) !== room.id) continue;
    const doorC = ec + dc, doorR = er + dr;
    let ok = true;
    for (let k = 0; k <= 3 && ok; k++) for (let p = -2; p <= 2 && ok; p++) {
      const c = doorC + dc * k + pc * p, r = doorR + dr * k + pr * p;
      if (c < 1 || r < 1 || c >= C - 1 || r >= R - 1 || g[r][c] !== "#") ok = false;
    }
    if (!ok || nearDoor(doorC, doorR)) continue;
    g[doorR][doorC] = "."; addDoor(doorC, doorR, true);
    const cells = [];
    for (let k = 1; k <= 2; k++) for (let p = -1; p <= 1; p++) { const c = doorC + dc * k + pc * p, r = doorR + dr * k + pr * p; g[r][c] = "."; cells.push([c, r, k, p]); }
    const back = { N: "S", S: "N", E: "W", W: "E" }[side];                                   // direction facing the door (back to the closet)
    const face = (s) => s;
    for (const [c, r, k, p] of cells) {
      if (k === 2 && p === 0) props.push({ t: "chest", c, r, rot: back });
      else if (k === 2) props.push(p < 0 ? { t: "bookshelf", c, r, rot: back } : { t: "barrel", c, r, rot: "S" });
      else props.push({ t: p < 0 ? "crate" : "barrel", c, r, rot: "S" });
      mark(c, r);
    }
    closets.push({ c: doorC, r: doorR, side, room: room.id }); void face;
    if (!firstSecret) firstSecret = [doorC, doorR, ec, er];
  }
  mark(sc, sr); doors.forEach((d) => { mark(d.c, d.r); for (const [a, b] of D4) mark(d.c + a, d.r + b); });
  const closetCells = new Set(props.map((p) => key(p.c, p.r)));

  // ------------------------------------------------------------ stairs
  const stairsRoom = kind === "escape" ? rooms.reduce((a, b) => (b.dist > a.dist ? b : a)) : startRoom;
  const edgeCells = (o) => {
    const out = [];
    for (let r = o.y; r < o.y + o.h; r++) for (let c = o.x; c < o.x + o.w; c++) {
      const walls = D4.filter(([a, b]) => !open(g, c + a, r + b));
      const openings = D4.filter(([a, b]) => open(g, c + a, r + b) && roomAt(c + a, r + b) !== o.id);
      if (walls.length && !openings.length && !used.has(key(c, r))) out.push({ c, r, walls });
    }
    return out;
  };
  const sCells = edgeCells(stairsRoom).filter((e) => e.walls.length >= 2 || stairsRoom.w * stairsRoom.h <= 12);
  const stairsCell = (sCells.length ? sCells : edgeCells(stairsRoom))[0] || { c: stairsRoom.x, r: stairsRoom.y, walls: [] };
  if (stairsCell.c === sc && stairsCell.r === sr) stairsCell.c += 1;
  g[stairsCell.r][stairsCell.c] = "E"; mark(stairsCell.c, stairsCell.r);

  // ------------------------------------------------------------ props: crates/barrels/tables/chests/bookshelves + rugs
  const rugs = [], rugRooms = new Set();
  const farRooms = rooms.filter((o) => o.id !== 0 && o !== stairsRoom && !o.arena).sort((a, b) => b.dist - a.dist);
  const special = new Set();                                   // rooms that hold the goal (tome / princess / wizard): keep their centres clear
  const goalRoom = arena || farRooms[0] || rooms[rooms.length - 1];
  if (kind !== "escape") special.add(goalRoom.id);
  if (kind === "dragon" && tier >= 0.45 && farRooms[1]) special.add(farRooms[1].id);          // a second dragon in later levels
  const princessRooms = farRooms.filter((o) => o.dist >= maxDist * 0.55).slice(0, 5);
  if (kind === "princess") princessRooms.forEach((o) => special.add(o.id));
  for (const room of rooms) {
    if (room.id === 0 || room.arena) continue;
    const [cc, cr] = ctr(room); if (special.has(room.id)) mark(cc, cr);
    const area = room.w * room.h, cells = edgeCells(room);
    for (let i = cells.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [cells[i], cells[j]] = [cells[j], cells[i]]; }
    let budget = labyrinth ? (rng() < 0.55 ? 1 : 0) : Math.min(5, Math.max(1, Math.round(area / 8)));
    for (const e of cells) {
      if (budget <= 0) break;
      if (used.has(key(e.c, e.r))) continue;
      const [wdc, wdr] = pick(e.walls), rot = { "0,-1": "S", "0,1": "N", "1,0": "W", "-1,0": "E" }[wdc + "," + wdr];   // face away from the wall
      const roll = rng();
      let p;
      if (roll < 0.22) p = { t: "bookshelf", rot };
      else if (roll < 0.40) p = { t: "chest", rot };
      else if (roll < 0.62) p = { t: "crate", rot: "S" };
      else if (roll < 0.84) p = { t: "barrel", rot: "S" };
      else p = { t: "table", rot: wdc ? "ns" : "ew" };
      props.push({ ...p, c: e.c, r: e.r }); mark(e.c, e.r); budget--;
    }
    if ((area >= 9 && !labyrinth && rng() < 0.4) || (labyrinth && rng() < 0.18)) {   // persian rug, inset from the walls in big rooms
      const nw = room.w >= 4 ? room.w - 2 : room.w, nh = room.h >= 4 ? room.h - 2 : room.h;
      rugs.push({ c: room.x + (room.w - nw) / 2, r: room.y + (room.h - nh) / 2, w: nw, h: nh, pal: pick(RUG_PALS) }); rugRooms.add(room.id);
    }
  }
  // every room that holds a bookshelf is a library: guarantee a few shelves in the labyrinth
  if (labyrinth) {
    let shelves = props.filter((p) => p.t === "bookshelf" && !closetCells.has(key(p.c, p.r))).length, guard = 0;
    while (shelves < 10 && guard++ < 200) {
      const room = pickRoom(), cells = edgeCells(room).filter((e) => !used.has(key(e.c, e.r)));
      if (!cells.length) continue;
      const e = pick(cells), [wdc, wdr] = pick(e.walls);
      props.push({ t: "bookshelf", c: e.c, r: e.r, rot: { "0,-1": "S", "0,1": "N", "1,0": "W", "-1,0": "E" }[wdc + "," + wdr] }); mark(e.c, e.r); shelves++;
    }
  }

  // ------------------------------------------------------------ enemies
  const enemies = [];
  const weights = [["goblin", 1.0 - tier * 0.45], ["archer", 0.4], ["skeleton", 0.25 + tier * 0.55], ["chaos", 0.04 + tier * 0.5]];
  const roll = () => { const tot = weights.reduce((s, w) => s + w[1], 0); let x = rng() * tot; for (const [t, w] of weights) { if ((x -= w) <= 0) return t; } return "goblin"; };
  const placeCells = (o) => { const out = []; for (let r = o.y; r < o.y + o.h; r++) for (let c = o.x; c < o.x + o.w; c++) if (g[r][c] === "." && !used.has(key(c, r)) && !(special.has(o.id) && c === ctr(o)[0] && r === ctr(o)[1])) out.push([c, r]); return out; };
  const ePlaced = new Set();
  const spawn = (t, c, r) => { enemies.push({ t, c, r }); ePlaced.add(key(c, r)); };
  const density = (labyrinth ? 0.55 : 1 / 9) * (0.8 + tier * 0.9);
  for (const room of rooms) {
    if (room.id === 0 || room.arena) continue;
    const cells = placeCells(room); if (!cells.length) continue;
    let n = labyrinth ? (rng() < density ? 1 + (rng() < tier * 0.5 ? 1 : 0) : 0) : Math.max(1, Math.round(room.w * room.h * density * (0.7 + rng() * 0.6)));
    if (kind === "escape" && room.id !== 0) n += rng() < 0.4 ? 1 : 0;
    for (let k = 0; k < n && cells.length; k++) { const [c, r] = cells.splice(Math.floor(rng() * cells.length), 1)[0]; spawn(roll(), c, r); }
  }
  // wizard + his guard in the goal room
  let wizardCell = null;
  if (kind === "wizard") {
    const [wc, wr] = ctr(goalRoom); wizardCell = [wc, wr]; spawn("wizard", wc, wr);
    const cells = placeCells(goalRoom).filter(([c, r]) => !ePlaced.has(key(c, r)));
    for (let k = 0; k < 3 + Math.round(tier * 3) && cells.length; k++) { const [c, r] = cells.splice(Math.floor(rng() * cells.length), 1)[0]; spawn(rng() < 0.45 + tier * 0.3 ? "chaos" : rng() < 0.5 ? "skeleton" : "archer", c, r); }
  }
  // dragons: the goal room (and, later on, a second lair) — each with a small guard
  if (kind === "dragon") {
    for (const room of tier >= 0.45 && farRooms[1] ? [goalRoom, farRooms[1]] : [goalRoom]) {
      const [dc2, dr2] = ctr(room); spawn("dragon", dc2, dr2);
      const cells = placeCells(room).filter(([c, r]) => !ePlaced.has(key(c, r)));
      for (let k = 0; k < 2 && cells.length; k++) { const [c, r] = cells.splice(Math.floor(rng() * cells.length), 1)[0]; spawn(rng() < 0.5 ? "archer" : "skeleton", c, r); }
    }
  }
  // the final battle: two dragons + the dark wizard guard the captive princess in a big sealed hall
  let lockRoom = null, finalePrincess = null;
  if (kind === "finale") {
    const A = arena, ym = A.y + (A.h >> 1);
    spawn("dragon", A.x + 7, A.y + 3); spawn("dragon", A.x + 7, A.y + A.h - 4); wizardCell = [A.x + 10, ym]; spawn("wizard", A.x + 10, ym);
    finalePrincess = [A.x + A.w - 1, ym]; mark(...finalePrincess); mark(A.x + A.w - 2, ym);
    const cells = placeCells(A).filter(([c, r]) => c > A.x + 3 && !ePlaced.has(key(c, r)) && Math.hypot(c - (A.x + 7), r - (A.y + 3)) > 3 && Math.hypot(c - (A.x + 7), r - (A.y + A.h - 4)) > 3);
    for (let k = 0; k < 7 && cells.length; k++) { const [c, r] = cells.splice(Math.floor(rng() * cells.length), 1)[0]; spawn(k < 4 ? "archer" : "chaos", c, r); }
    rugs.push({ c: A.x + 2, r: A.y + 2, w: A.w - 4, h: A.h - 4, pal: "crimson" });
    lockRoom = { door: [A.x - 1, A.doorRow], rect: [A.x, A.y, A.x + A.w - 1, A.y + A.h - 1] };
  }
  // a roaming sentry or two in corridors of escape levels
  if (kind === "escape") {
    const corr = []; for (let r = 1; r < R - 1; r++) for (let c = 1; c < C - 1; c++) if (g[r][c] === "." && roomAt(c, r) < 0 && !doorSet.has(key(c, r)) && dAt(c, r) > 12 && !closetCells.has(key(c, r))) corr.push([c, r]);
    for (let k = 0; k < 2 && corr.length; k++) { const [c, r] = corr.splice(Math.floor(rng() * corr.length), 1)[0]; spawn(rng() < 0.5 ? "skeleton" : "goblin", c, r); }
  }
  // cap + make sure there is real opposition
  while (enemies.length > 64) { const k = Math.floor(rng() * enemies.length); if (enemies[k].t !== "wizard" && enemies[k].t !== "dragon") enemies.splice(k, 1); }

  // ------------------------------------------------------------ plates
  const plates = [];
  for (let k = 0; k < 1 + Math.floor(tier * 3); k++) {
    const room = pickRoom(), cells = placeCells(room); if (!cells.length) continue;
    const [c, r] = cells[Math.floor(rng() * cells.length)]; plates.push([c, r]);
  }

  // ------------------------------------------------------------ goal data
  const out = {};
  if (kind === "tome") { const [c, r] = ctr(goalRoom); out.tome = [c, r]; }
  if (kind === "princess") out.princessSpots = princessRooms.map(ctr);
  if (kind === "finale") { out.princessSpots = [finalePrincess]; out.lockRoom = lockRoom; }
  out.tier = tier;
  // facing: along the longest free run from the start cell
  let startDir = "N", bestRun = -1;
  for (const [k, [dc, dr]] of Object.entries(DIRS)) { let run = 0; while (open(g, sc + dc * (run + 1), sr + dr * (run + 1))) run++; if (run > bestRun) { bestRun = run; startDir = k; } }

  const hints = [{ c: sc, r: sr, text: TEXT[kind].hint }];
  if (firstSecret && n >= 2) { const [, , hc, hr] = firstSecret; if (open(g, hc, hr) && !(hc === sc && hr === sr)) hints.push({ c: hc, r: hr, text: "The stonework here looks different… a lighter wall — maybe a secret door? Press E beside it." }); }
  return {
    map: g.map((row) => row.join("")), start: [sc, sr], startDir, doors, enemies, props, plates, hints, rugs,
    rooms: rooms.map((o) => ({ c: o.x, r: o.y, w: o.w, h: o.h })), wizardCell, ...out, thin: 1,
  };
}

export function generateLevels() {
  const out = [], counters = { escape: 0, tome: 0, princess: 0, wizard: 0, dragon: 0, finale: 0 };
  ORDER.forEach((kind, i) => {
    const n = i, T = TEXT[kind], nameIdx = counters[kind]++;
    const body = generate(n, kind, 0x51ed + n * 7919 + kind.length * 31, ORDER.length);
    const themeKey = THEME_BY_KIND[kind][nameIdx % THEME_BY_KIND[kind].length];
    const goal = kind === "escape" ? "stairs" : kind;
    out.push({
      id: `gen${i + 1}`, title: kind === "finale" ? "Final Quest" : `Quest ${i + 5}`, subtitle: T.names[nameIdx % T.names.length], desc: T.desc, kind, goal, goalText: T.goalText,
      theme: THEMES[themeKey], ...body,
    });
  });
  return out;
}
