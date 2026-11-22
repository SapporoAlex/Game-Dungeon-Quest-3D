// Level gameplay: first-person dungeon crawl (walls, doors, enemies, items, spells).
import {
  THREE, T, WALL_H, camera, TEX, inst, parts, flashModel, glowSprite, keys, mouse, pressed, lock, sfx, moveInput, rumble, sayLine, narrate, stopLine,
} from "./engine.js";
import { makeArcher, makeWizard, makeSlime, makeCrimson, makePrincess, makeTome, makeBookshelf, makeRug } from "./models-extra.js";
import { PRINCESS, WIZARD, TOME, BOOKS } from "./dialogue.js";
import { LEVELS } from "./levels.js";
import { S, save, moveSpeed, swordDmg, boltDmg, BOLT_COST } from "./state.js";
import { hud } from "./hud.js";

const THEMES = {
  tutorial: { wall: 0xb0a89c, floor: 0xa8a8a8, fog: 0x0a0806, amb: 0x806a58 },
  quest1: { wall: 0x9aa4b4, floor: 0x9ca0aa, fog: 0x06080c, amb: 0x586078 },
  quest2: { wall: 0xb89a78, floor: 0xa89078, fog: 0x0c0704, amb: 0x806048 },
  quest3: { wall: 0xc08a80, floor: 0xb07068, fog: 0x100403, amb: 0x804038 },
  quest4: { wall: 0x7aa8a0, floor: 0x7a9890, fog: 0x030a09, amb: 0x406860 },
};
const DEF = {
  goblin: { model: "goblin", name: "Goblin", hp: 1, speed: 5.9, dmg: 1, reach: 1.55, cd: 0.55, wind: 0.18, r: 0.4, scale: 1.1, coins: [1, 2] },
  archer: { model: "goblin", name: "Goblin Archer", hp: 1, speed: 4.0, dmg: 1, reach: 0, cd: 1.5, wind: 0.48, r: 0.4, scale: 1.1, coins: [1, 3], ranged: { min: 4.5, max: 16, arrow: 12.5 } },
  skeleton: { model: "skeleton", name: "Skeleton", hp: 3, speed: 3.8, dmg: 1, reach: 1.95, cd: 0.7, wind: 0.24, r: 0.38, scale: 1.0, coins: [1, 3] },
  chaos: { model: "chaos", name: "Chaos Warrior", noKnock: true, hp: 8, speed: 3.2, dmg: 3, reach: 2.3, cd: 1.0, wind: 0.34, r: 0.6, scale: 1.0, coins: [2, 4] },
  crimson: { model: "chaos", name: "Crimson Warrior", noKnock: true, hp: 18, speed: 3.5, dmg: 5, reach: 2.4, cd: 0.9, wind: 0.32, r: 0.65, scale: 1.12, coins: [5, 8] },   // red chaos warrior with golden horns: tougher, hits harder
  slime: { model: "slime", name: "Giant Slime", noKnock: true, hp: 104, speed: 2.3, dmg: 1, reach: 0, cd: 2.0, wind: 0.55, r: 1.0, scale: 1.45, coins: [8, 12], boss: true, ranged: { min: 4, max: 15, arrow: 9.5, goo: true } },   // spits goo that slows you
  dragon: { model: "dragon", name: "Red Dragon", noKnock: true, hp: 30, speed: 2.8, dmg: 3, reach: 3.3, cd: 1.2, wind: 0.45, r: 1.15, scale: 0.95, coins: [8, 12], boss: true },
  decoy: { model: "wizard", name: "Dark Wizard", hp: 1, speed: 2.7, dmg: 0, reach: 0, cd: 3.1, wind: 0.95, r: 0.45, scale: 1.1, coins: [0, 0], ranged: { min: 6, max: 19 }, decoy: true },   // harmless copy conjured by the wizard on decoy levels
  wizard: { model: "wizard", name: "Dark Wizard", hp: 14, speed: 2.7, dmg: 2, reach: 0, cd: 3.1, wind: 0.95, r: 0.45, scale: 1.1, coins: [12, 18], boss: true, ranged: { min: 6, max: 19 } },
};
const DIRS = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] };
const TALL_H = WALL_H * 2;   // ceiling height of the big pillared halls
const LORE_QUIET = 14;
const rand = (a, b) => a + Math.random() * (b - a);
const irand = (a, b) => Math.floor(rand(a, b + 1));
const cx = (c) => (c + 0.5) * T;

export class Play {
  constructor(levelIdx, onEnd) {
    this.onEnd = onEnd;
    this.idx = levelIdx;
    const L = (this.L = LEVELS[levelIdx]);
    this.bookName = BOOKS[L.book || 0].name;
    this.bossLabel = L.boss === "slime" ? "Giant Slime" : "Red Dragon";
    this.theme = L.theme || THEMES[L.id] || THEMES.quest1;
    this.rows = L.map.length; this.cols = L.map[0].length;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.theme.fog);
    this.scene.fog = new THREE.FogExp2(this.theme.fog, 0.058);
    this.t = 0; this.state = "play"; this.kills = 0; this.noise = 0;
    this.doors = []; this.props = []; this.enemies = []; this.items = []; this.shots = []; this.fx = []; this.plates = []; this.hazards = []; this.puddles = [];
    this.pillarAt = new Map();                                    // cell index -> [x, z] of the pillar standing in it
    this.torches = []; this.stairs = []; this.hintsDone = new Set();
    this.hasTome = false; this.tome = null; this.princess = null; this.lockState = null; this.bubbleT = 0; this.ambushT = 0; this.ambushMsg = ""; this.ambushed = false;
    this.startGold = S.gold; this.startAmulet = S.amulet; this.startMana = S.mana;
    S.hp = S.maxHp; this.atkMul = S.momo ? 2 : 1;                 // Momo mode: enemies attack at half rate (cooldowns and wind-ups x2)

    // lights
    this.scene.add(new THREE.AmbientLight(this.theme.amb, 1.6));
    this.torch = new THREE.PointLight(0xffc880, 28, 0, 1.6); this.scene.add(this.torch);
    this.torchLights = [];
    for (let i = 0; i < 4; i++) { const l = new THREE.PointLight(0xff8a30, 0, 0, 1.8); this.scene.add(l); this.torchLights.push(l); }

    this.buildLevel();
    this.buildViewmodel();
    this.scene.add(camera);

    const [sc, sr] = L.start;
    this.p = { x: cx(sc), z: cx(sr), yaw: this.faceYaw(L.startDir), pitch: 0, bob: 0, inv: 0, swing: 0, swingHit: false, cd: 0, boltCd: 0, cast: 0, r: 0.4 };
    const st = this.stairs[0];
    if (st && Math.hypot(st.x - this.p.x, st.z - this.p.z) < 2) { // don't start on top of the exit
      for (const [dc, dr] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) if (!this.solid(sc + dc, sr + dr)) { this.p.x = cx(sc + dc); this.p.z = cx(sr + dr); break; }
    }
    this.explored = new Uint8Array(this.cols * this.rows);
    this.flow = new Int16Array(this.cols * this.rows); this.flowT = 0; this.flowCell = -1;
    this.aliveBoss = null;
    hud.minimap.style.display = "block"; hud.show(true); hud.title(`${L.title} — ${L.subtitle}`, this.objectiveText()); hud.boss(null);
    hud.msg(L.hints[0] ? L.hints[0].text : L.subtitle, 7);
    if (L.hints[0]) { this.hintsDone.add(0); narrate(L.hints[0].text); }
    this.camShake = 0;
  }

  faceYaw(d) { return { N: 0, E: -Math.PI / 2, S: Math.PI, W: Math.PI / 2 }[d] ?? 0; }
  objectiveText() {
    const g = this.L.goal, alive = this.enemies.filter((e) => !e.dead).length;
    if (g === "stairs") return this.L.kind === "escape" ? "Escape! Find the stairwell and descend." : "Find the stairwell and descend.";
    if (g === "dragon") return this.dragonDead() ? `The ${this.bossLabel.toLowerCase()} is dead — return to the stairwell!` : `Slay the ${this.bossLabel}, then take the stairwell.`;
    if (g === "wizard") return this.wizardDead() ? "The Dark Wizard is dead — return to the stairwell!" : "Defeat the Dark Wizard (watch out for lightning!), then take the stairwell.";
    if (g === "tome") return this.hasTome ? `You have the ${this.bookName} — return to the stairwell where you began!` : `Search the labyrinth for the ${this.bookName}.`;
    if (g === "finale") {
      if (!this.bossesDead()) return `Final battle: slay the 2 dragons and the Dark Wizard (${this.enemies.filter((e) => (e.type === "dragon" || e.type === "wizard") && !e.dead).length} left).`;
      return this.princess && this.princess.found ? "Fight your way back to the stairwell!" : "Free the Elven Princess!";
    }
    if (g === "princess") return this.princess && this.princess.found ? "The Elven Princess is following you — reach the stairwell!" : "Find the Elven Princess, hidden in a room far from here.";
    return alive ? `Defeat every enemy (${alive} left).` : "All foes defeated — take a stairwell!";
  }
  dragonDead() { return !this.enemies.some((e) => (e.type === "dragon" || e.type === "slime") && !e.dead); }
  bossesDead() { return !this.enemies.some((e) => (e.type === "dragon" || e.type === "wizard") && !e.dead); }
  wizardDead() { return !this.enemies.some((e) => e.type === "wizard" && !e.dead); }
  stairsOpen() {
    const g = this.L.goal;
    return g === "stairs" || (g === "dragon" && this.dragonDead()) || (g === "wizard" && this.wizardDead()) || (g === "tome" && this.hasTome)
      || (g === "princess" && !!this.princess && this.princess.found) || (g === "finale" && this.bossesDead() && !!this.princess && this.princess.found) || (g === "clear" && !this.enemies.some((e) => !e.dead));
  }
  sealedText() {
    return { dragon: `The stairwell is sealed — slay the ${this.bossLabel} first!`, wizard: "The stairwell is sealed — defeat the Dark Wizard first!", tome: `The stairwell is sealed — find the ${this.bookName} first!`,
      princess: "The stairwell is sealed — find the Elven Princess first!", finale: "The stairwell is sealed — win the final battle and free the princess first!" }[this.L.goal] || "The stairwell is sealed — defeat every enemy first!";
  }
  say(who, text, sec = 6) { hud.bubble(`<b>${who}:</b> ${text}`); sayLine(text); this.bubbleT = sec; }

  // ------------------------------------------------------------------ geometry
  ch(c, r) { return this.L.map[r]?.[c]; }
  isWall(c, r) { return c < 0 || r < 0 || c >= this.cols || r >= this.rows || this.L.map[r][c] === "#"; }
  doorAt(c, r) { return this.doors.find((d) => d.c === c && d.r === r); }
  /** is (x, z) inside a pillar? (pillars are round columns in the middle of a tile) */
  inPillar(x, z, pad = 0) {
    const p = this.pillarAt.get(Math.floor(z / T) * this.cols + Math.floor(x / T));
    return !!p && (x - p[0]) ** 2 + (z - p[1]) ** 2 < (0.75 + pad) ** 2;
  }
  flowWall(c, r) { if (this.isWall(c, r) || this.pillarAt.has(r * this.cols + c)) return true; const d = this.doorAt(c, r); return !!d && (d.locked || (d.secret && d.target === 0)); }
  solid(c, r) { if (this.isWall(c, r)) return true; const d = this.doorAt(c, r); return !!d && d.open < 0.85; }

  buildLevel() {
    const { L, theme } = this;
    const pos = [], nor = [], uv = [], col = [];
    const quad = (a, b, c2, d, n, uw, vh) => {
      pos.push(...a, ...c2, ...b, ...a, ...d, ...c2);
      for (let i = 0; i < 6; i++) nor.push(...n);
      uv.push(0, 0, uw, vh, uw, 0, 0, 0, 0, vh, uw, vh);
      const v = rand(0.82, 1); for (let i = 0; i < 6; i++) col.push(v, v, v);
    };
    const torchFaces = [];
    // ceiling height per tile: ordinary rooms and corridors are WALL_H, the big "hall" rooms are twice as tall
    const hmap = new Float32Array(this.cols * this.rows).fill(WALL_H); this.hmap = hmap;
    for (const t of L.tall || []) for (let r = t.r; r < t.r + t.h; r++) for (let c = t.c; c < t.c + t.w; c++) if (r >= 0 && c >= 0 && r < this.rows && c < this.cols) hmap[r * this.cols + c] = TALL_H;
    for (let r = 0; r < this.rows; r++) for (let c = 0; c < this.cols; c++) {
      if (this.isWall(c, r)) continue;
      const x0 = c * T, x1 = x0 + T, z0 = r * T, z1 = z0 + T, h = hmap[r * this.cols + c], vv = h / T;
      // wall on each side that is solid (faces point into this cell)
      if (this.isWall(c, r - 1)) { quad([x1, 0, z0], [x0, 0, z0], [x0, h, z0], [x1, h, z0], [0, 0, 1], 1, vv); torchFaces.push([c, r, 0, 1]); }
      if (this.isWall(c, r + 1)) { quad([x0, 0, z1], [x1, 0, z1], [x1, h, z1], [x0, h, z1], [0, 0, -1], 1, vv); torchFaces.push([c, r, 0, -1]); }
      if (this.isWall(c - 1, r)) { quad([x0, 0, z0], [x0, 0, z1], [x0, h, z1], [x0, h, z0], [1, 0, 0], 1, vv); torchFaces.push([c, r, 1, 0]); }
      if (this.isWall(c + 1, r)) { quad([x1, 0, z1], [x1, 0, z0], [x1, h, z0], [x1, h, z1], [-1, 0, 0], 1, vv); torchFaces.push([c, r, -1, 0]); }
      // a tall hall opening onto a lower corridor: wall in the gap above the low ceiling
      const lo = (nc, nr) => (this.isWall(nc, nr) ? h : hmap[nr * this.cols + nc]);
      if (lo(c, r - 1) < h) quad([x1, lo(c, r - 1), z0], [x0, lo(c, r - 1), z0], [x0, h, z0], [x1, h, z0], [0, 0, 1], 1, (h - lo(c, r - 1)) / T);
      if (lo(c, r + 1) < h) quad([x0, lo(c, r + 1), z1], [x1, lo(c, r + 1), z1], [x1, h, z1], [x0, h, z1], [0, 0, -1], 1, (h - lo(c, r + 1)) / T);
      if (lo(c - 1, r) < h) quad([x0, lo(c - 1, r), z0], [x0, lo(c - 1, r), z1], [x0, h, z1], [x0, h, z0], [1, 0, 0], 1, (h - lo(c - 1, r)) / T);
      if (lo(c + 1, r) < h) quad([x1, lo(c + 1, r), z1], [x1, lo(c + 1, r), z0], [x1, h, z0], [x1, h, z1], [-1, 0, 0], 1, (h - lo(c + 1, r)) / T);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    this.scene.add(new THREE.Mesh(g, new THREE.MeshLambertMaterial({ map: TEX.wall, vertexColors: true, color: theme.wall })));
    const W = this.cols * T, D = this.rows * T;
    const floorT = TEX.floor.clone(); floorT.repeat.set(this.cols * 2, this.rows * 2); floorT.needsUpdate = true;
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshLambertMaterial({ map: floorT, color: theme.floor }));
    floor.rotation.x = -Math.PI / 2; floor.position.set(W / 2, 0, D / 2); this.scene.add(floor);
    // ceiling: one quad per open tile, at that tile's own height (so tall halls have a high roof)
    const cp = [], cn = [], cu = [];
    for (let r = 0; r < this.rows; r++) for (let c = 0; c < this.cols; c++) {
      if (this.isWall(c, r)) continue;
      const x0 = c * T, x1 = x0 + T, z0 = r * T, z1 = z0 + T, y = hmap[r * this.cols + c];
      cp.push(x0, y, z0, x1, y, z1, x0, y, z1, x0, y, z0, x1, y, z0, x1, y, z1);
      for (let i = 0; i < 6; i++) cn.push(0, -1, 0);
      cu.push(0, 0, 2, 2, 0, 2, 0, 0, 2, 0, 2, 2);
    }
    const cg = new THREE.BufferGeometry();
    cg.setAttribute("position", new THREE.Float32BufferAttribute(cp, 3)); cg.setAttribute("normal", new THREE.Float32BufferAttribute(cn, 3)); cg.setAttribute("uv", new THREE.Float32BufferAttribute(cu, 2));
    this.scene.add(new THREE.Mesh(cg, new THREE.MeshLambertMaterial({ map: TEX.ceil, color: 0x907868, side: THREE.DoubleSide })));
    // pillars in the tall halls: round stone columns that block movement, sight and missiles (cover!)
    const pillarTex = TEX.wall.clone(); pillarTex.repeat.set(1, 2); pillarTex.needsUpdate = true;
    const pillarMat = new THREE.MeshLambertMaterial({ map: pillarTex, color: new THREE.Color(theme.wall).multiplyScalar(0.92) });
    for (const [pc, pr] of L.pillars || []) {
      if (this.isWall(pc, pr)) continue;
      const px = cx(pc), pz = cx(pr), ph = hmap[pr * this.cols + pc], g2 = new THREE.Group();
      g2.add(new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.66, ph, 16), pillarMat).translateY(ph / 2));
      g2.add(new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.35, 1.6), pillarMat).translateY(0.175));
      g2.add(new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.4, 1.45), pillarMat).translateY(ph - 0.2));
      g2.position.set(px, 0, pz); this.scene.add(g2);
      this.pillarAt.set(pr * this.cols + pc, [px, pz]);
    }

    // torches on a deterministic sprinkling of wall faces
    for (const [c, r, nx, nz] of torchFaces) {
      const hsh = (c * 73856093 ^ r * 19349663 ^ (nx + 2) * 83492791 ^ (nz + 3) * 2654435) >>> 0;
      if (hsh % 9 !== 0 || this.torches.length > 46) continue;
      const m = inst("torch");
      const px = cx(c) - nx * (T / 2 - 0.05), pz = cx(r) - nz * (T / 2 - 0.05);
      m.position.set(px, 1.65, pz); m.rotation.y = Math.atan2(nx, nz);
      this.scene.add(m);
      const flame = m.getObjectByName("flame");
      this.torches.push({ x: px + nx * 0.25, z: pz + nz * 0.25, flame, ph: Math.random() * 6 });
    }

    // doors — secret doors are plain wall segments, a touch lighter than the walls around them, that slide aside when used
    const secretMat = new THREE.MeshLambertMaterial({ map: TEX.wall, color: new THREE.Color(theme.wall).multiplyScalar(1.12) });
    for (const d of L.doors) {
      const ns = this.isWall(d.c - 1, d.r) && this.isWall(d.c + 1, d.r);
      let m;
      if (d.secret) { m = new THREE.Mesh(new THREE.BoxGeometry(T - 0.04, WALL_H - 0.002, T - 0.04), secretMat); m.position.set(cx(d.c), WALL_H / 2, cx(d.r)); }
      else { m = inst("door"); m.rotation.y = ns ? 0 : Math.PI / 2; m.position.set(cx(d.c), 0, cx(d.r)); }
      this.scene.add(m);
      this.doors.push({ c: d.c, r: d.r, x: cx(d.c), z: cx(d.r), mesh: m, open: 0, target: 0, secret: !!d.secret, ns, locked: false, found: false });
    }
    // stairs
    for (let r = 0; r < this.rows; r++) for (let c = 0; c < this.cols; c++) if (this.ch(c, r) === "E") {
      const m = inst("stairs");
      let dir = [0, 1];
      for (const [dc, dr] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) if (!this.isWall(c + dc, r + dr)) { dir = [dc, dr]; break; }
      m.position.set(cx(c), 0, cx(r)); m.rotation.y = Math.atan2(dir[0], dir[1]);
      this.scene.add(m);
      const glow = glowSprite(0xffe9a0, 4.5, 0.6); glow.position.set(cx(c) - dir[0] * 1.3, 1.9, cx(r) - dir[1] * 1.3); this.scene.add(glow);
      this.stairs.push({ x: cx(c), z: cx(r), mesh: m, glow, c, r });
    }
    // plates
    for (const [c, r, type] of L.plates) {                     // type: "arrow" (default) · "fire" · "alarm" — all look like the same hidden plate
      if (this.isWall(c, r) || this.pillarAt.has(r * this.cols + c)) continue;
      const m = inst("plate"); m.position.set(cx(c), 0.01, cx(r)); this.scene.add(m);
      this.plates.push({ x: cx(c), z: cx(r), used: false, mesh: m, type: type || "arrow" });
    }
    // persian rugs
    for (const rg of L.rugs || []) {
      const rug = makeRug(rg.w * T - 0.9, rg.h * T - 0.9, rg.pal);
      rug.position.set((rg.c + rg.w / 2) * T, 0.03, (rg.r + rg.h / 2) * T); this.scene.add(rug);
    }
    // props
    for (const p of L.props) this.addProp(p);
    this.buildGoalObjects();
    // enemies (some levels are thinned: the original had random variants per room)
    for (const e of L.enemies) {
      if (e.t === "dragon" && L.goal === "stairs") continue;                 // escape quests have no boss
      if (!L.thin || L.thin >= 1 || Math.random() < L.thin) this.addEnemy(e.t, cx(e.c), cx(e.r));
    }
    if (L.boss === "slime") this.buildPuddles();
  }

  // slime quests: sticky puddles of goo are scattered over the floor (and pooled around the slime's nest); walking through one slows you
  buildPuddles() {
    const [sc, sr] = this.L.start, slimes = this.enemies.filter((e) => e.type === "slime"), cells = [];
    for (let r = 0; r < this.rows; r++) for (let c = 0; c < this.cols; c++) {
      if (this.isWall(c, r) || this.ch(c, r) === "E" || this.doorAt(c, r) || this.pillarAt.has(r * this.cols + c)) continue;
      if (Math.abs(c - sc) + Math.abs(r - sr) < 5 || this.blocked(cx(c), cx(r), 0.6)) continue;
      cells.push([c, r]);
    }
    for (let i = cells.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [cells[i], cells[j]] = [cells[j], cells[i]]; }
    const spots = cells.slice(0, Math.min(22, Math.ceil(cells.length / 14))).map(([c, r]) => [cx(c) + rand(-0.6, 0.6), cx(r) + rand(-0.6, 0.6), rand(0.9, 1.5)]);
    for (const s of slimes) for (let k = 0; k < 5; k++) { const a = rand(0, 6.28), d = rand(1.5, 4.5); spots.push([s.x + Math.cos(a) * d, s.z + Math.sin(a) * d, rand(0.9, 1.5)]); }
    const mat = new THREE.MeshLambertMaterial({ color: 0x4fd95a, emissive: 0x1a7a2a, transparent: true, opacity: 0.78 });
    for (const [x, z, rad] of spots) {
      if (this.isWall(Math.floor(x / T), Math.floor(z / T)) || this.blocked(x, z, 0.4)) continue;
      const m = new THREE.Mesh(new THREE.CircleGeometry(rad, 20), mat); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.035, z); m.scale.set(1, rand(0.75, 1), 1); m.rotation.z = rand(0, 6.28);
      this.scene.add(m); this.puddles.push({ x, z, r: rad * 0.85 });
    }
  }
  updatePuddles() {
    const p = this.p;
    for (const pd of this.puddles) if ((p.x - pd.x) ** 2 + (p.z - pd.z) ** 2 < pd.r * pd.r) {
      if (!(p.slow > 0) && !this.puddleMsg) { this.puddleMsg = true; hud.msg("Sticky goo! It slows you down — go around it.", 2.5); }
      p.slow = Math.max(p.slow || 0, 0.35); break;
    }
  }
  // while the giant slime is awake, fresh chaos warriors and goblin archers keep streaming into the area around its nest
  updateSlimeReinforcements(dt) {
    const sl = this.enemies.find((e) => e.type === "slime" && !e.dead && e.state !== "idle");
    if (!sl) return;
    this.reinfT = (this.reinfT ?? 4) - dt; if (this.reinfT > 0) return;
    this.reinfT = rand(6, 9);
    if (this.enemies.filter((e) => e.reinf && !e.dead).length >= 7) return;
    const hc = Math.floor((sl.homeX ?? sl.x) / T), hr = Math.floor((sl.homeZ ?? sl.z) / T), cands = [];
    for (let r = hr - 13; r <= hr + 13; r++) for (let c = hc - 13; c <= hc + 13; c++) {
      if (this.isWall(c, r) || this.doorAt(c, r) || this.ch(c, r) === "E") continue;
      const d = Math.hypot(c - hc, r - hr); if (d < 5 || d > 13) continue;
      const x = cx(c), z = cx(r);
      if (this.blocked(x, z, 0.6) || Math.hypot(x - this.p.x, z - this.p.z) < 7 || this.los(x, z, this.p.x, this.p.z)) continue;
      cands.push([x, z]);
    }
    if (!cands.length) return;
    const [x, z] = cands[Math.floor(Math.random() * cands.length)], tier = this.L.tier ?? 0.5;
    const type = Math.random() < 0.5 ? "archer" : tier > 0.6 && Math.random() < 0.3 ? "crimson" : "chaos";
    const e = this.addEnemy(type, x, z); e.state = "chase"; e.reinf = true; this.burst(x, 1, z, 0x5ae05a, 10, 2.5, 0.7, 0.07); this.noise = Math.max(this.noise, 0.3);
    if (!this.reinfMsg) { this.reinfMsg = true; hud.msg("The slime's cries summon more fighters!", 3.5); }
  }

  buildGoalObjects() {
    const L = this.L;
    if (L.goal === "tome" && L.tome) {
      const [c, r] = L.tome, m = makeTome(); m.position.set(cx(c), 1.0, cx(r)); this.scene.add(m);
      const glow = glowSprite(0xa070ff, 2.8, 0.7); glow.position.set(cx(c), 1.1, cx(r)); this.scene.add(glow);
      this.tome = { x: cx(c), z: cx(r), mesh: m, glow, c, r };
    }
    if ((L.goal === "princess" || L.goal === "finale") && L.princessSpots && L.princessSpots.length) {
      const [c, r] = L.princessSpots[Math.floor(Math.random() * L.princessSpots.length)];   // a random far-away room each time
      const m = makePrincess(); m.scale.setScalar(1.05); m.position.set(cx(c), 0, cx(r)); this.scene.add(m);
      this.princess = { x: cx(c), z: cx(r), c, r, yaw: rand(0, 6.28), mesh: m, p: parts(m, ["body", "head", "arm_L", "arm_R"]), found: false, walk: 0, sayT: 25, tele: 0 };
    }
  }

  addProp(p) {
    const x = cx(p.c), z = cx(p.r);
    if (p.t === "bookshelf") {                                    // stands against a wall, faces `rot`; searchable like a chest
      const [dx, dz] = DIRS[p.rot] || DIRS.S, bx = x - dx * (T / 2 - 0.32), bz = z - dz * (T / 2 - 0.32), along = dx === 0 ? [1, 0] : [0, 1];
      const sm = makeBookshelf(); sm.position.set(bx, 0, bz); sm.rotation.y = Math.atan2(dx, dz); this.scene.add(sm);
      const sp = { kind: "bookshelf", x: bx, z: bz, mesh: sm, opened: false, r: 0.55, lidA: 0, circles: [-0.85, 0, 0.85].map((k) => [bx + along[0] * k, bz + along[1] * k]) };
      sp.glint = glowSprite(0xffe08a, 0.9, 0.8); sp.glint.position.set(bx + dx * 0.35, 1.45, bz + dz * 0.35); this.scene.add(sp.glint);
      this.props.push(sp); return;
    }
    const m = inst(p.t);
    m.position.set(x, 0, z);
    if (p.t === "table") m.rotation.y = p.rot === "ns" ? Math.PI / 2 : 0;
    else if (p.t === "chest") m.rotation.y = { N: Math.PI, S: 0, E: Math.PI / 2, W: -Math.PI / 2 }[p.rot] ?? 0;
    else m.rotation.y = rand(0, 6.28);
    this.scene.add(m);
    const pr = { kind: p.t, x, z, mesh: m, opened: false, r: 0.55, lid: m.getObjectByName("lid"), lidA: 0 };
    if (p.t === "table") { pr.circles = p.rot === "ns" ? [[x, z - 0.55], [x, z + 0.55]] : [[x - 0.55, z], [x + 0.55, z]]; pr.glint = glowSprite(0xffe08a, 0.9, 0.8); pr.glint.position.set(x, 1.15, z); this.scene.add(pr.glint); }
    if (p.t === "chest") { pr.glint = glowSprite(0xffe08a, 0.8, 0.7); pr.glint.position.set(x, 0.95, z); this.scene.add(pr.glint); }
    this.props.push(pr);
  }

  addEnemy(type, x, z) {
    let d = DEF[type];
    if (d.boss) {   // dragons and the dark wizard grow tougher and a bit quicker in later missions, keeping pace with the player's upgrades
      const i = this.idx || 0;
      d = { ...d, hp: Math.round(d.hp * (1 + 0.06 * i)), speed: d.speed * (1 + Math.min(0.25, 0.005 * i)) };
    }
    const m = type === "archer" ? makeArcher() : type === "wizard" || type === "decoy" ? makeWizard() : type === "slime" ? makeSlime() : type === "crimson" ? makeCrimson() : inst(d.model); m.scale.setScalar(d.scale);
    m.position.set(x, 0, z); this.scene.add(m);
    const pn = type === "dragon"
      ? ["body", "neck", "head", "jaw", "wing_L", "wing_R", "tail1", "tail2", "tail3", "leg_FL", "leg_FR", "leg_BL", "leg_BR"]
      : ["body", "head", "arm_L", "arm_R", "leg_L", "leg_R"];
    const e = { type, d: this.atkMul === 1 ? d : { ...d, cd: d.cd * this.atkMul, wind: d.wind * this.atkMul }, x, z, yaw: rand(0, 6.28), hp: d.hp, mesh: m, p: parts(m, pn), state: "idle", atk: rand(0.2, d.cd), wind: 0, stagger: 0,
      kx: 0, kz: 0, flash: 0, dead: false, deadT: 0, walk: rand(0, 6), senseT: Math.random() * 0.3, los: false, fireCd: rand(1, 3), biting: 0, stuck: 0, strafe: Math.random() < 0.5 ? 1 : -1, strafeT: rand(1, 3), stuckT: 0 };
    if (this.L.id === "tutorial") e.noDoors = true;
    e.homeX = x; e.homeZ = z;
    this.enemies.push(e);
    return e;
  }

  // ------------------------------------------------------------------ collision
  blocked(x, z, r, self) {
    const c0 = Math.floor((x - r) / T), c1 = Math.floor((x + r) / T), r0 = Math.floor((z - r) / T), r1 = Math.floor((z + r) / T);
    for (let rr = r0; rr <= r1; rr++) for (let cc = c0; cc <= c1; cc++) {
      if (!this.solid(cc, rr)) continue;
      const nx = Math.max(cc * T, Math.min(x, (cc + 1) * T)), nz = Math.max(rr * T, Math.min(z, (rr + 1) * T));
      if ((x - nx) ** 2 + (z - nz) ** 2 < r * r) return true;
    }
    if (this.pillarAt.size) for (let rr = r0; rr <= r1; rr++) for (let cc = c0; cc <= c1; cc++) {
      const pl = this.pillarAt.get(rr * this.cols + cc);
      if (pl && (x - pl[0]) ** 2 + (z - pl[1]) ** 2 < (r + 0.75) ** 2) return true;
    }
    for (const p of this.props) {
      if (p.kind !== "table" && p.broken) continue;
      const cs = p.circles || [[p.x, p.z]];
      for (const [px, pz] of cs) if ((x - px) ** 2 + (z - pz) ** 2 < (r + (p.circles ? 0.5 : p.r)) ** 2) return true;
    }
    return false;
  }
  moveEnt(o, dx, dz, r) {
    if (!this.blocked(o.x + dx, o.z, r)) o.x += dx;
    if (!this.blocked(o.x, o.z + dz, r)) o.z += dz;
  }
  los(x0, z0, x1, z1) {
    const dx = x1 - x0, dz = z1 - z0, n = Math.ceil(Math.hypot(dx, dz) / 0.35);
    for (let i = 1; i < n; i++) {
      const x = x0 + dx * i / n, z = z0 + dz * i / n;
      if (this.solid(Math.floor(x / T), Math.floor(z / T)) || this.inPillar(x, z)) return false;
    }
    return true;
  }
  losWide(e, r) {
    const dx = this.p.x - e.x, dz = this.p.z - e.z, l = Math.hypot(dx, dz) || 1, nx = -dz / l * r, nz = dx / l * r;
    return this.los(e.x, e.z, this.p.x, this.p.z) && this.los(e.x + nx, e.z + nz, this.p.x + nx, this.p.z + nz) && this.los(e.x - nx, e.z - nz, this.p.x - nx, this.p.z - nz);
  }
  rayLen(x, z, dx, dz, max) {
    for (let t = 0; t < max; t += 0.2) if (this.solid(Math.floor((x + dx * t) / T), Math.floor((z + dz * t) / T)) || this.inPillar(x + dx * t, z + dz * t)) return t;
    return max;
  }

  // flow field (BFS) from the player's cell: enemies path through open doors but not closed ones
  computeFlow() {
    const { cols, rows, flow } = this;
    flow.fill(-1);
    const pc = Math.floor(this.p.x / T), pr = Math.floor(this.p.z / T);
    const q = [pr * cols + pc]; flow[q[0]] = 0;
    for (let i = 0; i < q.length; i++) {
      const id = q[i], c = id % cols, r = (id / cols) | 0;
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nc = c + dc, nr = r + dr;
        if (this.flowWall(nc, nr) || flow[nr * cols + nc] >= 0) continue;
        flow[nr * cols + nc] = flow[id] + 1; q.push(nr * cols + nc);
      }
    }
  }
  flowDir(e) {
    const { cols } = this;
    const c = Math.floor(e.x / T), r = Math.floor(e.z / T);
    const here = this.flow[r * cols + c];
    if (here < 0) return null;
    let best = here, bc = c, br = r;
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const nc = c + dc, nr = r + dr;
      if (this.flowWall(nc, nr)) continue;
      if (dc && dr && (this.flowWall(c + dc, r) || this.flowWall(c, r + dr))) continue;
      const v = this.flow[nr * cols + nc];
      if (v >= 0 && v < best) { best = v; bc = nc; br = nr; }
    }
    if (bc === c && br === r) return null;
    const tx = cx(bc) - e.x, tz = cx(br) - e.z, l = Math.hypot(tx, tz) || 1;
    return [tx / l, tz / l];
  }

  // ------------------------------------------------------------------ first-person viewmodel
  buildViewmodel() {
    this.vm = new THREE.Group(); camera.add(this.vm);
    this.sword = inst("sword"); this.sword.scale.setScalar(0.42);
    this.vm.add(this.sword);
    const glove = new THREE.Mesh(new THREE.SphereGeometry(0.07, 14, 10), new THREE.MeshStandardMaterial({ color: 0xe8b890, roughness: 1 }));
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.1, 0.5, 12), new THREE.MeshStandardMaterial({ color: 0x24365a, roughness: 1 }));
    sleeve.rotation.x = Math.PI / 2 - 0.15; sleeve.position.set(0, -0.02, 0.22);
    this.hand = new THREE.Group(); this.hand.add(glove, sleeve); this.hand.scale.setScalar(0.55);
    this.orb = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 10), new THREE.MeshBasicMaterial({ color: 0xbff0ff }));
    this.orb.position.set(0, 0.1, -0.06); this.hand.add(this.orb);
    this.orbGlow = glowSprite(0x6ac8ff, 0.4, 0.9); this.orbGlow.position.copy(this.orb.position); this.hand.add(this.orbGlow);
    this.vm.add(this.hand);
    this.camLight = new THREE.PointLight(0x9ad0ff, 0, 9, 2); this.camLight.position.set(-0.3, 0, -2.2); camera.add(this.camLight);
    // arm of the sword hand (sleeve)
    const sw = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 0.55, 12), new THREE.MeshStandardMaterial({ color: 0x6a3a22, roughness: 1 }));
    sw.rotation.x = Math.PI / 2; sw.position.set(0.05, -0.05, 0.3); this.swordArm = sw; this.sword.add(sw);
    sw.position.set(0.0, -0.15, 0.2); sw.rotation.set(Math.PI / 2 + 0.2, 0, 0);
  }
  updateViewmodel(dt) {
    const p = this.p, t = this.t;
    const bobx = Math.sin(p.bob) * 0.012, boby = Math.abs(Math.cos(p.bob)) * 0.014;
    // sword swing: 0..1
    let sx = 0.34 + bobx, sy = -0.36 - boby, sz = -0.6, rx = -0.45, ry = 0, rz = 0.3;
    if (p.swing > 0) {
      const u = 1 - p.swing / 0.32;   // 0 -> 1
      const wind = Math.min(1, u / 0.3), slash = Math.max(0, Math.min(1, (u - 0.3) / 0.35)), back = Math.max(0, (u - 0.65) / 0.35);
      const k = wind * (1 - slash) + slash * (1 - back) * 0 ; // helper unused
      const a = wind * (1 - slash) , b = slash * (1 - back);
      sx = 0.34 + 0.2 * a - 0.5 * b; sy = -0.36 + 0.15 * a - 0.02 * b; sz = -0.6 - 0.1 * b;
      rz = 0.3 - 1.4 * a + 1.8 * b; rx = -0.45 - 0.6 * b; ry = -0.2 * a + 0.6 * b;
      if (back > 0) { const f = 1 - back; sx = 0.34 + (sx - 0.34) * f; sy = -0.36 + (sy + 0.36) * f; rz = 0.3 + (rz - 0.3) * f; rx = -0.45 + (rx + 0.45) * f; ry *= f; }
    }
    this.sword.position.set(sx, sy, sz); this.sword.rotation.set(rx, ry, rz);
    // magic hand
    const cast = p.cast > 0 ? p.cast / 0.3 : 0;
    this.hand.position.set(-0.32 + Math.sin(p.bob + 1) * 0.01, -0.33 - boby + cast * 0.05, -0.6 - cast * 0.18);
    this.hand.rotation.set(-0.15 + cast * 0.2, 0.2, 0);
    const has = S.mana >= BOLT_COST;
    this.orb.visible = this.orbGlow.visible = has;
    const pulse = 1 + Math.sin(t * 12) * 0.15 + cast * 2.2;
    this.orbGlow.scale.setScalar(0.38 * pulse);
    this.orb.scale.setScalar(1 + cast);
    this.camLight.intensity = has ? 0.5 + cast * 6 : 0;
  }

  // ------------------------------------------------------------------ fx helpers
  burst(x, y, z, color, n = 8, speed = 3, life = 0.6, size = 0.08) {
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(size, 5, 4), new THREE.MeshBasicMaterial({ color, transparent: true }));
      m.position.set(x, y, z); this.scene.add(m);
      this.fx.push({ kind: "p", m, vx: rand(-1, 1) * speed, vy: rand(0.2, 1.2) * speed, vz: rand(-1, 1) * speed, life, max: life });
    }
  }
  bolt(a, b, color = 0xbff0ff) {
    const g = new THREE.Group();
    const pts = [a.clone()];
    const dir = b.clone().sub(a), len = dir.length(), n = Math.max(4, Math.ceil(len / 0.8));
    const up = new THREE.Vector3(0, 1, 0), side = new THREE.Vector3().crossVectors(dir.clone().normalize(), up).normalize();
    for (let i = 1; i < n; i++) pts.push(a.clone().addScaledVector(dir, i / n).addScaledVector(side, rand(-0.25, 0.25)).addScaledVector(up, rand(-0.25, 0.25)));
    pts.push(b.clone());
    for (let i = 0; i < pts.length - 1; i++) {
      const v = pts[i + 1].clone().sub(pts[i]), l = v.length();
      for (const [rad, col, op] of [[0.035, 0xffffff, 1], [0.1, color, 0.45]]) {
        const m = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, 1, 6), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false }));
        m.position.copy(pts[i]).addScaledVector(v, 0.5); m.scale.y = l;
        m.quaternion.setFromUnitVectors(up, v.clone().normalize()); g.add(m);
      }
    }
    const lt = new THREE.PointLight(color, 6, 9, 2); lt.position.copy(b); g.add(lt);
    this.scene.add(g); this.fx.push({ kind: "bolt", m: g, life: 0.22, max: 0.22 });
  }
  updateFx(dt) {
    for (let i = this.fx.length - 1; i >= 0; i--) {
      const f = this.fx[i]; f.life -= dt;
      if (f.kind === "p") {
        f.vy -= 9 * dt; f.m.position.x += f.vx * dt; f.m.position.y = Math.max(0.03, f.m.position.y + f.vy * dt); f.m.position.z += f.vz * dt;
        f.m.material.opacity = Math.max(0, f.life / f.max);
      } else if (f.kind === "bolt") {
        f.m.traverse((c) => { if (c.material) c.material.opacity = (c.material.opacity > 0.9 ? 1 : 0.45) * Math.max(0, f.life / f.max); });
      }
      if (f.life <= 0) { this.scene.remove(f.m); f.m.traverse?.((c) => { c.geometry?.dispose(); c.material?.dispose?.(); }); this.fx.splice(i, 1); }
    }
  }

  // ------------------------------------------------------------------ items & loot
  spawnItem(kind, x, z) {
    const model = kind === "coin" ? "coin" : kind === "health" ? "potion_health" : "potion_mana";
    const m = inst(model);
    const a = rand(0, 6.28), s = rand(1.5, 3);
    const glow = glowSprite(kind === "coin" ? 0xffd040 : kind === "health" ? 0xff5060 : 0x50ff80, kind === "coin" ? 0.6 : 0.9, 0.55);
    const it = { kind, x, z, y: 0.9, vy: 3.5, vx: Math.cos(a) * s, vz: Math.sin(a) * s, mesh: m, glow, ph: rand(0, 6), age: 0 };
    this.scene.add(m, glow); this.items.push(it);
  }
  rollLoot(kind) {
    let n = kind === "chest" ? 3 : kind === "bookshelf" ? 2 : 1 + (Math.random() < 0.25 + 0.1 * S.luckLvl ? 1 : 0);
    const out = [];
    for (let i = 0; i < n; i++) {
      const r = Math.random();
      if (kind !== "chest" && i === 0 && r < 0.08) continue;                // nothing (rare)
      if (r < 0.42) out.push(["coin", irand(1, 3)]);
      else if (r < 0.78) out.push(["mana", 1]);                              // green bottles live in boxes & tables
      else out.push(["health", 1]);
    }
    if (kind === "chest" && !out.some((o) => o[0] === "mana")) out.push(["mana", 1]);
    return out;
  }
  dropLoot(x, z, list) { for (const [k, n] of list) for (let i = 0; i < n; i++) this.spawnItem(k, x + rand(-0.3, 0.3), z + rand(-0.3, 0.3)); }
  updateItems(dt) {
    const reach = 1.15 + 0.3 * S.luckLvl;
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i]; it.age += dt;
      // toss physics, then hover
      if (it.age < 0.7) {
        it.vy -= 12 * dt; it.y = Math.max(0.55, it.y + it.vy * dt);
        const nx = it.x + it.vx * dt, nz = it.z + it.vz * dt;
        if (!this.solid(Math.floor(nx / T), Math.floor(it.z / T))) it.x = nx; if (!this.solid(Math.floor(it.x / T), Math.floor(nz / T))) it.z = nz;
        it.vx *= 0.96; it.vz *= 0.96;
      } else it.y = 0.85 + Math.sin(this.t * 2.4 + it.ph) * 0.12;
      const baseY = it.kind === "coin" ? it.y : it.y - 0.2;
      it.mesh.position.set(it.x, baseY, it.z); it.mesh.rotation.y += dt * 2.2;
      it.glow.position.set(it.x, it.y + (it.kind === "coin" ? 0 : 0.05), it.z); it.glow.material.opacity = 0.45 + Math.sin(this.t * 4 + it.ph) * 0.15;
      const d = Math.hypot(it.x - this.p.x, it.z - this.p.z);
      if (it.age > 0.45 && d < reach) {
        if (it.kind === "mana" && S.mana >= S.maxMana) { if (!it.warned) { it.warned = true; hud.msg("Magic is already full.", 1.5); } continue; }
        if (it.kind === "health" && S.hp >= S.maxHp) { if (!it.warned) { it.warned = true; hud.msg("Health is full — the heart potion waits for you.", 1.8); } continue; }
        if (it.kind === "coin") { S.gold++; sfx.coin(); }
        else if (it.kind === "health") { S.hp = Math.min(S.maxHp, S.hp + 1); sfx.pickup(); hud.msg("Health potion: +1 heart!", 2); hud.flash("255,80,100", 0.2); }
        else { S.mana = Math.min(S.maxMana, S.mana + 3); sfx.mana(); hud.msg("Green bottle: +3 magic!", 2.5); hud.flash("60,255,120", 0.25); }
        this.burst(it.x, it.y, it.z, it.kind === "coin" ? 0xffd040 : it.kind === "health" ? 0xff5060 : 0x50ff80, 6, 2.2, 0.4, 0.05);
        this.scene.remove(it.mesh, it.glow); this.items.splice(i, 1);
      }
    }
  }

  // ------------------------------------------------------------------ containers
  openProp(pr) {
    if (pr.opened) return false;
    pr.opened = true; sfx.open();
    if (pr.kind === "crate" || pr.kind === "barrel") {
      pr.broken = true; sfx.smash();
      this.burst(pr.x, 0.6, pr.z, 0x8a5a2b, 14, 3.5, 0.7, 0.09);
      this.scene.remove(pr.mesh);
    } else if (pr.kind === "bookshelf") { this.burst(pr.x, 1.3, pr.z, 0xf0e2b8, 14, 2.5, 0.7, 0.06); hud.msg("You rummage through the dusty books…", 2); if (pr.glint) { this.scene.remove(pr.glint); pr.glint = null; } }
    else { this.burst(pr.x, 1.0, pr.z, 0xffe08a, 10, 2.5, 0.6, 0.05); if (pr.glint) { this.scene.remove(pr.glint); pr.glint = null; } }
    const loot = this.rollLoot(pr.kind);
    if (!loot.length) hud.msg("Nothing inside…", 1.8);
    this.dropLoot(pr.x, pr.z, loot);
    return true;
  }

  // ------------------------------------------------------------------ combat
  hurtPlayer(dmg, sx, sz) {
    if (this.p.inv > 0 || this.state !== "play") return;
    S.hp = Math.max(0, S.hp - dmg); this.p.inv = 0.8; this.camShake = 0.35;
    sfx.hurt(); rumble(220, 0.8, 0.5); hud.flash("255,0,0", 0.6);
    if (S.hp <= 0 && S.amulet > 0) {                              // Amulet of Rebirth: back to full health, amulet is lost
      S.amulet = 0; S.hp = S.maxHp; this.p.inv = 2.5; save(); sfx.stairs(); rumble(400, 0.5, 0.9); hud.flash("255,225,120", 0.9);
      this.burst(this.p.x, 1.2, this.p.z, 0xffe070, 24, 4, 1, 0.08); hud.msg("The Amulet of Rebirth shatters — you rise again with full health!", 5);
      return;
    }
    if (S.hp <= 0) { this.state = "dead"; this.endT = 0; this.onEnd("dead"); }
  }
  damageEnemy(e, dmg, kx, kz, mag = 1.6) {
    if (e.dead) return;
    e.hp -= dmg; e.flash = 1;
    if (e.d.noKnock) { e.stagger = 0; e.kx = e.kz = 0; }                       // chaos warriors and dragons shrug off hits: no knock-back, attacks are not interrupted
    else { e.stagger = e.d.boss ? 0.05 : 0.28; e.kx = kx * mag; e.kz = kz * mag; e.wind = 0; }
    if (e.state === "idle") this.wake(e);
    sfx.hit();
    this.burst(e.x, 1.1, e.z, 0xff4030, 6, 2.2, 0.35, 0.05);
    if (e.hp <= 0) this.killEnemy(e);
  }
  killEnemy(e) {
    if (e.type === "decoy") { this.vanish(e); return; }          // decoys die in one hit and leave nothing behind
    e.dead = true; e.deadT = 0; this.kills++; sfx.enemyDie();
    if (e.type === "wizard") for (const o of this.enemies) if (o.type === "decoy" && !o.dead) this.vanish(o);   // the copies vanish with the wizard
    const [a, b] = e.d.coins;
    const loot = [["coin", irand(a, b)]];
    // enemies only drop gold (potions come from crates, barrels, tables and chests)
    if (e.type === "dragon" || e.type === "slime") {
      hud.boss(null); hud.msg(e.type === "slime" ? "The Giant Slime has burst!" : "The Red Dragon has fallen!", 5);
      if (this.L.goal === "dragon" && this.dragonDead()) this.queueAmbush(e.type === "slime" ? "The slime's death-cry echoes — creatures swarm from the dark! Fight your way back to the stairwell!" : "The dragon's death-roar echoes — creatures swarm from the dark! Fight your way back to the stairwell!");
    }
    if (e.type === "wizard") {
      hud.boss(null); hud.msg("The Dark Wizard has fallen!", 5);
      if (this.L.goal === "wizard") this.queueAmbush("The wizard's spell breaks — his minions surge from the shadows! Fight your way back to the stairwell!"); this.say("Dark Wizard", WIZARD.dying[0], 4);
      const ud = e.mesh.userData; if (ud.orbLight) ud.orbLight.intensity = 0; if (ud.eyeMat) ud.eyeMat.color.setHex(0x203a24); if (ud.orb) ud.orb.visible = false;
    }
    this.dropLoot(e.x, e.z, loot);
    this.burst(e.x, 1, e.z, 0xcccccc, 10, 2.5, 0.8, 0.1);
    hud.objective(this.objectiveText());
  }
  vanish(e) {
    e.dead = true; e.gone = true; this.scene.remove(e.mesh);
    this.burst(e.x, 1.2, e.z, 0xb890ff, 14, 3, 0.6, 0.07);
  }
  // decoy levels: an awake Dark Wizard periodically conjures harmless copies of himself
  updateDecoys(dt) {
    if (!this.L.decoys || this.state === "complete") return;
    for (const w of this.enemies) {
      if (w.type !== "wizard" || w.dead || w.state === "idle") continue;
      w.decoyT = (w.decoyT ?? 3) - dt;
      if (w.decoyT > 0) continue;
      w.decoyT = rand(6, 9);
      if (this.enemies.filter((o) => o.type === "decoy" && !o.dead).length >= 4) continue;
      for (let k = 0; k < 8; k++) {
        const a = rand(0, 6.28), r = rand(2, 4), x = w.x + Math.cos(a) * r, z = w.z + Math.sin(a) * r;
        if (this.solid(Math.floor(x / T), Math.floor(z / T))) continue;
        this.addEnemy("decoy", x, z);
        const c = this.enemies[this.enemies.length - 1]; c.state = "chase"; c.atk = 1e9; c.yaw = w.yaw;   // never casts
        this.burst(x, 1.2, z, 0xb890ff, 14, 3, 0.6, 0.07); sfx.secret();
        if (!this.decoyMsg) { this.decoyMsg = true; hud.msg("The Dark Wizard splits into copies — only one is real!", 4); }
        break;
      }
    }
  }
  wake(e) { if (e.state !== "idle") return; e.state = "chase"; if (e.type === "dragon" || e.type === "slime") { sfx.roar(); this.aliveBoss = e; } if (e.type === "wizard") { this.aliveBoss = e; this.say("Dark Wizard", WIZARD.taunt[Math.floor(Math.random() * WIZARD.taunt.length)], 5); } }

  swordAttack() {
    const p = this.p; p.swing = 0.32; p.cd = 0.4; p.swingHit = false; sfx.swing(); this.noise = 0.5;
  }
  swordHit() {
    const p = this.p, fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw);
    let hit = false;
    for (const e of this.enemies) {
      if (e.dead) continue;
      const dx = e.x - p.x, dz = e.z - p.z, d = Math.hypot(dx, dz);
      if (d > 2.5 + e.d.r && !(d < 3.2 + e.d.r && e.d.boss)) continue;
      if ((dx * fx + dz * fz) / (d || 1) < 0.45 && d > e.d.r + 0.6) continue;
      this.damageEnemy(e, swordDmg(), dx / (d || 1), dz / (d || 1)); hit = true;
    }
    for (const pr of this.props) {
      if (pr.opened) continue;
      const dx = pr.x - p.x, dz = pr.z - p.z, d = Math.hypot(dx, dz);
      if (d < 2.6 && (dx * fx + dz * fz) / (d || 1) > 0.5) { this.openProp(pr); hit = true; }
    }
    if (hit) this.camShake = Math.max(this.camShake, 0.12);
  }
  castBolt() {
    const p = this.p;
    if (S.mana < BOLT_COST) { sfx.deny(); hud.msg("Out of magic! Find green bottles in crates, barrels, tables and chests.", 3); return; }
    S.mana -= BOLT_COST; p.boltCd = 0.55; p.cast = 0.3; sfx.zap(); rumble(120, 0.2, 0.7); this.noise = 0.8;
    const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw);
    const maxT = this.rayLen(p.x, p.z, fx, fz, 22);
    // find the first target along the ray (horizontal auto-aim, like classic FPS games)
    let best = null, bt = maxT;
    for (const e of this.enemies) {
      if (e.dead) continue;
      const dx = e.x - p.x, dz = e.z - p.z, t = dx * fx + dz * fz;
      if (t < 0 || t > bt + e.d.r) continue;
      const perp = Math.abs(dx * fz - dz * fx);
      if (perp < e.d.r + 0.45 && t - e.d.r < bt) { best = { o: e, e: true }; bt = Math.max(0.5, t - e.d.r * 0.5); }
    }
    for (const pr of this.props) {
      if (pr.opened) continue;
      const dx = pr.x - p.x, dz = pr.z - p.z, t = dx * fx + dz * fz;
      if (t < 0 || t > bt) continue;
      if (Math.abs(dx * fz - dz * fx) < 0.7 && t < bt) { best = { o: pr, e: false }; bt = t; }
    }
    const from = new THREE.Vector3(); this.orb.getWorldPosition(from);
    const end = new THREE.Vector3(p.x + fx * bt, best && best.e ? 1.2 : 1.1, p.z + fz * bt);
    this.bolt(from, end);
    this.burst(end.x, end.y, end.z, 0xbff0ff, 10, 3, 0.4, 0.05);
    if (best && best.e) {
      const bd = (e) => (e.type === "wizard" ? Math.ceil(boltDmg() / 2) : boltDmg());      // dark wizards are twice as resistant to lightning
      this.damageEnemy(best.o, bd(best.o), fx, fz, 2.2);
      // chain to a nearby enemy
      let chain = null, cd = 5.5;
      for (const e of this.enemies) { if (e.dead || e === best.o) continue; const d = Math.hypot(e.x - best.o.x, e.z - best.o.z); if (d < cd && this.los(best.o.x, best.o.z, e.x, e.z)) { cd = d; chain = e; } }
      if (chain) { this.bolt(end, new THREE.Vector3(chain.x, 1.2, chain.z)); this.damageEnemy(chain, Math.ceil(bd(chain) / 2), 0, 0, 0.5); }
    } else if (best) this.openProp(best.o);
  }
  // ------------------------------------------------------------------ enemies
  updateEnemy(e, dt) {
    const p = this.p, d = e.d, m = e.mesh, P = e.p;
    if (e.dead) {
      e.deadT += dt; const u = Math.min(1, e.deadT / 0.6);
      m.rotation.x = -u * 1.45; m.position.y = -Math.max(0, e.deadT - 2.5) * 0.4;
      flashModel(m, 0);
      if (e.deadT > 6) { this.scene.remove(m); e.gone = true; }
      return;
    }
    e.atk -= dt; e.flash = Math.max(0, e.flash - dt * 4); flashModel(m, e.flash);
    const dx = p.x - e.x, dz = p.z - e.z, dist = Math.hypot(dx, dz) || 0.001, nx = dx / dist, nz = dz / dist;
    e.senseT -= dt;
    if (e.senseT <= 0) {
      e.senseT = 0.15 + Math.random() * 0.1;
      e.los = dist < 20 && this.losWide(e, 0.3);
      if (e.state === "idle") {
        const fl = this.flow[Math.floor(e.z / T) * this.cols + Math.floor(e.x / T)];
        if ((e.los && dist < 15) || (this.noise > 0 && fl >= 0 && fl < (this.noise > 0.25 ? 8 : 4))) this.wake(e);
      }
    }
    this.animEnemy(e, dt, dist);
    if (e.state === "idle") { return; }
    if (e.stagger > 0) { e.stagger -= dt; this.moveEnt(e, e.kx * dt * 3, e.kz * dt * 3, d.r); e.kx *= 0.9; e.kz *= 0.9; return; }
    const face = (tx, tz, rate = 10) => { const a = Math.atan2(tx, tz); let df = a - e.yaw; df = Math.atan2(Math.sin(df), Math.cos(df)); e.yaw += df * Math.min(1, rate * dt); };
    if (d.ranged) { this.updateRanged(e, dt, nx, nz, dist, face); return; }
    if (e.wind > 0) {
      face(nx, nz, 14); e.wind -= dt;
      if (e.wind <= 0) {
        e.atk = d.cd; e.strike = 0.25;
        if (dist < d.reach + 0.6) { this.hurtPlayer(d.dmg, e.x, e.z); }
      }
      return;
    }
    // dragon fireball
    if (e.type === "dragon") {
      e.fireCd -= dt;
      if (e.fireCd <= 0 && e.los && dist > 4.5 && dist < 18) { e.fireCd = rand(2.2, 3.4) * this.atkMul; this.fireball(e); }
    }
    if (dist < d.reach && e.los) {
      face(nx, nz, 12);
      if (e.atk <= 0) { e.wind = d.wind; e.biting = d.wind + 0.3; }
      return;
    }
    let dir = null;
    if (e.los && dist < 18) dir = [nx, nz];
    else { dir = this.flowDir(e); if (!dir) dir = [nx, nz]; }
    face(dir[0], dir[1], 8);
    this.openAhead(e, dir);
    const sp = d.speed * (e.type === "dragon" && dist > 8 ? 1.25 : 1);
    const ox = e.x, oz = e.z;
    this.moveEnt(e, dir[0] * sp * dt, dir[1] * sp * dt, d.r);
    // separation
    for (const o of this.enemies) {
      if (o === e || o.dead) continue;
      const ex = e.x - o.x, ez = e.z - o.z, ed = Math.hypot(ex, ez), min = d.r + o.d.r;
      if (ed < min && ed > 0.001) this.moveEnt(e, ex / ed * (min - ed) * 0.5, ez / ed * (min - ed) * 0.5, d.r);
    }
    if (dist < d.r + this.p.r) { this.moveEnt(e, -nx * 0.02, -nz * 0.02, d.r); }
    e.walk += Math.hypot(e.x - ox, e.z - oz) * 2.4 / (e.type === "dragon" ? 1.5 : 1);
  }
  openAhead(e, dir) {
    if (e.noDoors) return;                                  // the tutorial goblin can't open doors
    const dd = this.doorAt(Math.floor((e.x + dir[0] * (e.d.r + 0.8)) / T), Math.floor((e.z + dir[1] * (e.d.r + 0.8)) / T));
    if (dd && dd.target === 0 && !dd.secret && !dd.locked) { dd.target = 1; sfx.door(); }
  }
  // ranged enemies (goblin archers, the dark wizard): keep their distance, sidestep, stop to aim, then shoot / cast
  updateRanged(e, dt, nx, nz, dist, face) {
    const d = e.d, rg = d.ranged, isW = e.type === "wizard";
    e.strafeT -= dt; if (e.strafeT <= 0) { e.strafeT = rand(1.2, 3); e.strafe = Math.random() < 0.5 ? 1 : -1; }
    if (e.wind > 0) {
      face(nx, nz, 14); e.wind -= dt;
      if (e.wind <= 0) { e.atk = d.cd * rand(0.9, 1.35); if (isW) this.wizardCast(e); else if (rg.goo) this.shootGoo(e); else this.shootArrow(e); }
      return;
    }
    if (e.los && dist < rg.max && dist > 0.6 && e.atk <= 0) { e.wind = d.wind; face(nx, nz, 14); return; }
    const px = -nz * e.strafe, pz = nx * e.strafe;
    let dir, sp = d.speed;
    if (e.los && dist < rg.min) dir = [-nx * 0.75 + px * 0.5, -nz * 0.75 + pz * 0.5];                 // too close: back away
    else if (e.los && dist <= rg.max * 0.8) { dir = [px, pz]; sp *= 0.45; }                           // good range: sidestep
    else dir = e.los && dist > 3 ? [nx, nz] : (this.flowDir(e) || [nx, nz]);                           // out of range: close in
    const l = Math.hypot(dir[0], dir[1]) || 1; dir = [dir[0] / l, dir[1] / l];
    if (e.los) face(nx, nz, 8); else face(dir[0], dir[1], 8);
    this.openAhead(e, dir);
    const ox = e.x, oz = e.z;
    this.moveEnt(e, dir[0] * sp * dt, dir[1] * sp * dt, d.r);
    for (const o of this.enemies) {
      if (o === e || o.dead) continue;
      const ex = e.x - o.x, ez = e.z - o.z, ed = Math.hypot(ex, ez), min = d.r + o.d.r;
      if (ed < min && ed > 0.001) this.moveEnt(e, ex / ed * (min - ed) * 0.5, ez / ed * (min - ed) * 0.5, d.r);
    }
    const moved = Math.hypot(e.x - ox, e.z - oz);
    if (moved < sp * dt * 0.25) { e.stuckT += dt; if (e.stuckT > 0.4) { e.strafe = -e.strafe; e.strafeT = rand(1, 2); e.stuckT = 0; } } else e.stuckT = 0;
    e.walk += moved * 2.4;
  }
  // the giant slime spits a ball of goo; if it hits you, you are slowed for 1-2 seconds (see updateShots)
  shootGoo(e) {
    sfx.drink(); e.strike = 0.3;
    const dx = this.p.x - e.x, dz = this.p.z - e.z, a = Math.atan2(dx, dz) + rand(-0.04, 0.04), vx = Math.sin(a), vz = Math.cos(a), sp = e.d.ranged.arrow;
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 10), new THREE.MeshLambertMaterial({ color: 0x5ae05a, emissive: 0x1a6a1a, transparent: true, opacity: 0.9 }));
    m.add(glowSprite(0x6aff6a, 1.1, 0.6));
    m.position.set(e.x + vx * 1.4, 1.3, e.z + vz * 1.4); this.scene.add(m);
    this.shots.push({ kind: "goo", m, x: m.position.x, z: m.position.z, vx: vx * sp, vz: vz * sp, dmg: e.d.dmg, life: 3 });
  }
  shootArrow(e) {
    sfx.bow(); e.strike = 0.25;
    const dx = this.p.x - e.x, dz = this.p.z - e.z, a = Math.atan2(dx, dz) + rand(-0.05, 0.05), vx = Math.sin(a), vz = Math.cos(a), sp = e.d.ranged.arrow;
    const m = inst("arrow"); m.rotation.y = Math.atan2(vx, vz); m.position.set(e.x + vx * 0.9, 1.15, e.z + vz * 0.9); this.scene.add(m);
    this.shots.push({ kind: "arrow", m, x: m.position.x, z: m.position.z, vx: vx * sp, vz: vz * sp, dmg: e.d.dmg, life: 2.5 });
  }
  wizardCast(e) {
    const p = this.p, dx = p.x - e.x, dz = p.z - e.z, dist = Math.hypot(dx, dz) || 1;
    const from = new THREE.Vector3(e.x, 2.2, e.z); const orb = e.mesh.userData.orb; if (orb) orb.getWorldPosition(from);
    const hit = dist < 20 && this.losWide(e, 0.25);
    const reach = hit ? Math.max(0.5, dist - 1.1) : Math.min(dist, this.rayLen(e.x, e.z, dx / dist, dz / dist, 20));   // the bolt ends just short of the camera
    const to = new THREE.Vector3(e.x + dx / dist * reach, hit ? 0.9 : 1.2, e.z + dz / dist * reach);
    this.bolt(from, to, 0xa070ff); this.burst(to.x, to.y, to.z, 0xb890ff, 12, 3.5, 0.5, 0.06);
    sfx.lightning(); e.strike = 0.3; this.camShake = Math.max(this.camShake, hit ? 0.2 : 0.05);
    if (hit) { hud.flash("170,110,255", 0.5); this.hurtPlayer(e.d.dmg, e.x, e.z); }
  }
  animEnemy(e, dt, dist) {
    const P = e.p, m = e.mesh, t = this.t;
    m.position.x = e.x; m.position.z = e.z; m.rotation.y = e.yaw;
    if (e.dead) return;
    if (e.strike > 0) e.strike -= dt;
    const idle = e.state === "idle";
    const w = idle ? 0 : Math.sin(e.walk);
    if (e.type === "dragon") {
      const f = idle ? Math.sin(t * 1.6) * 0.15 : Math.sin(t * 6) * 0.55;
      P.wing_R.rotation.z = 0.35 + f; P.wing_L.rotation.z = -0.35 - f;
      P.tail1.rotation.y = Math.sin(t * 1.6 + 1) * 0.3; P.tail2.rotation.y = Math.sin(t * 1.6 + 2) * 0.4; P.tail3.rotation.y = Math.sin(t * 1.6 + 3) * 0.5;
      P.leg_FL.rotation.x = w * 0.5; P.leg_BR.rotation.x = w * 0.5; P.leg_FR.rotation.x = -w * 0.5; P.leg_BL.rotation.x = -w * 0.5;
      P.body.position.y = idle ? Math.sin(t * 1.6) * 0.03 : Math.abs(w) * 0.06;
      const open = e.biting > 0 ? Math.min(0.8, e.biting * 1.4) : 0.05 + Math.sin(t * 1.6) * 0.04;
      P.jaw.rotation.x = open; if (e.biting > 0) e.biting -= dt;
      P.neck.rotation.x = -0.5 + (e.wind > 0 ? 0.45 * (1 - e.wind / e.d.wind) - 0.3 : 0) + Math.sin(t * 1.3) * 0.05;
      return;
    }
    P.leg_L.rotation.x = w * 0.8; P.leg_R.rotation.x = -w * 0.8;
    P.arm_L.rotation.x = -w * 0.6;
    if (e.wind > 0) { const u = 1 - e.wind / e.d.wind; P.arm_R.rotation.x = -2.6 * u; P.arm_R.rotation.z = 0.2; }
    else if (e.strike > 0) { const u = e.strike / 0.25; P.arm_R.rotation.x = -2.6 * u + 0.9 * (1 - u); }
    else { P.arm_R.rotation.x = idle ? Math.sin(t * 1.5 + e.walk) * 0.05 : w * 0.6; P.arm_R.rotation.z = 0; }
    P.body.position.y = idle ? Math.sin(t * 1.5 + e.walk) * 0.015 : Math.abs(w) * 0.05;
    P.head.rotation.y = idle ? Math.sin(t * 0.8 + e.walk) * 0.25 : 0;
    P.body.rotation.x = e.wind > 0 ? 0.25 * (1 - e.wind / e.d.wind) : (idle ? 0 : 0.1);
    if (e.type === "archer") {
      const aiming = e.wind > 0, ud = m.userData;
      if (ud.nock) ud.nock.visible = aiming;
      if (aiming || e.strike > 0) { P.arm_L.rotation.x = -1.45; P.arm_L.rotation.z = 0; P.arm_R.rotation.x = aiming ? -1.35 : -0.5; P.arm_R.rotation.z = aiming ? 0.35 : 0.1; P.body.rotation.x = 0; }
      else if (!idle) P.arm_L.rotation.x = -0.9;                                  // bow carried ready
    }
    if (e.type === "slime") {                                                       // wobbles; swells before spitting
      const u = e.wind > 0 ? 1 - e.wind / e.d.wind : 0, sq = Math.sin(t * 3.2 + e.walk) * 0.07 + (e.strike > 0 ? -0.12 : 0);
      P.body.scale.set(1 + sq + u * 0.22, 1 - sq - u * 0.18, 1 + sq + u * 0.22); P.body.rotation.x = 0; P.body.position.y = 0;
    }
    if (e.type === "wizard" || e.type === "decoy") {
      const ud = m.userData, u = e.wind > 0 ? 1 - e.wind / e.d.wind : 0, pulse = u + (e.strike > 0 ? 1 : 0);
      if (ud.orb) { ud.orb.scale.setScalar(1 + pulse * 1.6 + Math.sin(t * 5) * 0.08); ud.orbLight.intensity = 1.4 + pulse * 4.5; }
      if (ud.eyeMat) ud.eyeMat.color.setRGB(0.22 + u * 0.6, 1, 0.36 + u * 0.4);
      P.body.position.y = 0.12 + Math.sin(t * 2.2 + e.walk) * 0.07;                 // hovers slightly
    }
  }
  fireball(e) {
    sfx.fire(); e.biting = 0.8;
    const dx = this.p.x - e.x, dz = this.p.z - e.z, l = Math.hypot(dx, dz);
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), new THREE.MeshBasicMaterial({ color: 0xff8a20 }));
    const g = glowSprite(0xff6a10, 1.6, 0.9); m.add(g);
    m.position.set(e.x + dx / l * 1.8, 1.7, e.z + dz / l * 1.8); this.scene.add(m);
    this.shots.push({ kind: "fire", m, x: m.position.x, z: m.position.z, vx: dx / l * 9, vz: dz / l * 9, dmg: 2, life: 4 });
  }
  springTrap(pl) {
    if (pl.type === "fire") {                                   // flames: a short warning, then a blast around the plate — run!
      sfx.lock(); hud.msg("Click! The floor glows — flames are about to erupt. RUN!", 2.5);
      const glow = glowSprite(0xff6a10, 4.2, 0.8); glow.position.set(pl.x, 0.5, pl.z); this.scene.add(glow);
      this.hazards.push({ kind: "fire", x: pl.x, z: pl.z, t: 0.9, glow });
    } else if (pl.type === "alarm") {                           // a hidden gong wakes everything nearby
      sfx.lock(); this.camShake = 0.25; this.noise = 1; hud.msg("A hidden gong crashes — the dungeon wakes!", 3);
      this.computeFlow();
      for (const e of this.enemies) if (!e.dead && e.state === "idle") { const f = this.flow[Math.floor(e.z / T) * this.cols + Math.floor(e.x / T)]; if (f >= 0 && f < 40) this.wake(e); }
    } else this.trapArrows();
  }
  updateHazards(dt) {
    for (let i = this.hazards.length - 1; i >= 0; i--) {
      const h = this.hazards[i]; h.t -= dt;
      h.glow.material.opacity = 0.35 + (1 - Math.max(0, h.t) / 0.9) * 0.6; h.glow.scale.setScalar(3 + Math.sin(this.t * 30) * 0.3);
      if (h.t > 0) continue;
      this.scene.remove(h.glow); this.hazards.splice(i, 1);
      sfx.fire(); this.camShake = Math.max(this.camShake, 0.25);
      this.burst(h.x, 0.6, h.z, 0xff8a20, 34, 5, 0.7, 0.12); this.burst(h.x, 0.6, h.z, 0xffd060, 18, 3.5, 0.6, 0.08);
      if (Math.hypot(this.p.x - h.x, this.p.z - h.z) < 2.4) { hud.flash("255,120,30", 0.5); this.hurtPlayer(2, h.x, h.z); }
    }
  }
  trapArrows() {
    sfx.arrow(); hud.msg("Click! A pressure plate — arrows fly from the walls!", 3);
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]].sort(() => Math.random() - 0.5);
    let n = 0;
    for (const [dx, dz] of dirs) {
      const d = this.rayLen(this.p.x, this.p.z, dx, dz, 8);
      if (d < 2.6) continue;
      const dist = Math.min(d - 0.4, 7);
      const m = inst("arrow"); m.rotation.y = Math.atan2(-dx, -dz); m.position.set(this.p.x + dx * dist, 1.2, this.p.z + dz * dist); this.scene.add(m);
      this.shots.push({ kind: "arrow", m, x: m.position.x, z: m.position.z, vx: -dx * 14, vz: -dz * 14, dmg: 1, life: 2 });
      if (++n >= 2) break;
    }
  }
  updateShots(dt) {
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const s = this.shots[i]; s.life -= dt; s.x += s.vx * dt; s.z += s.vz * dt; s.m.position.x = s.x; s.m.position.z = s.z;
      let dead = s.life <= 0 || this.solid(Math.floor(s.x / T), Math.floor(s.z / T)) || this.inPillar(s.x, s.z);
      if (!dead && Math.hypot(s.x - this.p.x, s.z - this.p.z) < (s.kind === "goo" ? 0.75 : 0.55)) {
        this.hurtPlayer(s.dmg, s.x, s.z); dead = true; if (s.kind === "fire") this.burst(s.x, 1.4, s.z, 0xff8a20, 12, 3.5, 0.5, 0.09);
        if (s.kind === "goo") { this.p.slow = rand(1, 2); hud.flash("90,230,90", 0.35); hud.msg("Slimed! You are slowed.", 1.5); }     // goo slows you for 1-2 seconds
      }
      if (dead) { if (s.kind === "goo") this.burst(s.x, 1.1, s.z, 0x5ae05a, 10, 3, 0.5, 0.08); this.scene.remove(s.m); this.shots.splice(i, 1); }
    }
  }

  // ------------------------------------------------------------------ interaction
  interactTarget() {
    const p = this.p, fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw);
    let best = null, bd = 1e9;
    const consider = (kind, o, x, z, range) => {
      const dx = x - p.x, dz = z - p.z, d = Math.hypot(dx, dz);
      if (d > range) return; if (d > 1.0 && (dx * fx + dz * fz) / d < 0.5) return;
      if (d < bd) { bd = d; best = { kind, o }; }
    };
    for (const d of this.doors) consider("door", d, d.x, d.z, d.secret ? 2.4 : 3.0);
    for (const pr of this.props) if (!pr.opened) consider("prop", pr, pr.x, pr.z, 2.5);
    return best;
  }
  interact() {
    const t = this.interactTarget(); if (!t) return;
    if (t.kind === "door") {
      const d = t.o;
      if (d.locked) { hud.msg("The door is sealed by dark magic — clear the hall first!", 2.5); sfx.deny(); return; }
      if (d.target === 1) { // closing: refuse if someone stands in the doorway
        if (Math.hypot(this.p.x - d.x, this.p.z - d.z) < 1.3 || this.enemies.some((e) => !e.dead && Math.hypot(e.x - d.x, e.z - d.z) < 1.5)) { hud.msg("Something is in the way.", 1.5); sfx.deny(); return; }
      }
      d.target = d.target ? 0 : 1; this.noise = Math.max(this.noise, 0.2);
      if (d.secret && !d.found) { d.found = true; sfx.secret(); hud.msg("A secret door grinds open!", 3); this.burst(d.x, 1.4, d.z, 0xc8b898, 14, 2, 0.8, 0.07); } else sfx.door();
    } else this.openProp(t.o);
  }

  // ------------------------------------------------------------------ main update
  update(dt) {
    if (this.state === "complete") { this.updateAfter(dt); return; }
    this.t += dt; const p = this.p;
    p.inv -= dt; p.cd -= dt; p.boltCd -= dt; p.cast -= dt; this.noise -= dt; if (p.slow > 0) p.slow -= dt;
    if (p.swing > 0) { p.swing -= dt; if (!p.swingHit && p.swing < 0.2) { p.swingHit = true; this.swordHit(); } }
    if (this.state === "dead") { this.endT += dt; camera.rotation.z = Math.min(0.8, this.endT * 1.2); camera.position.y = Math.max(0.3, 1.55 - this.endT * 1.2); this.updateFx(dt); this.updateEnemiesOnly(dt); return; }

    // look
    p.yaw -= mouse.dx * 0.0024; p.pitch = Math.max(-0.9, Math.min(0.9, p.pitch + mouse.dy * 0.0024));
    const turn = (keys.ArrowLeft ? 1 : 0) - (keys.ArrowRight ? 1 : 0); p.yaw += turn * 2.4 * dt;
    if (keys.ArrowUp) p.pitch = Math.min(0.9, p.pitch + dt); if (keys.ArrowDown) p.pitch = Math.max(-0.9, p.pitch - dt);
    // move
    const [f, s] = moveInput();
    const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw), rx = Math.cos(p.yaw), rz = -Math.sin(p.yaw);
    let mx = fx * f + rx * s, mz = fz * f + rz * s; const ml = Math.hypot(mx, mz);
    if (ml > 0) { const k = Math.min(1, ml); mx /= ml; mz /= ml; const sp = moveSpeed() * (keys.ShiftLeft ? 1.25 : 1) * k * (p.slow > 0 ? 0.4 : 1); this.moveEnt(p, mx * sp * dt, mz * sp * dt, p.r); p.bob += dt * sp * 1.7; this.noise = Math.max(this.noise, 0.12); }
    // actions
    const canClick = lock.active || lock.failed;
    if ((mouse.leftPressed && canClick || pressed("Space")) && p.cd <= 0) this.swordAttack();
    if ((mouse.rightPressed && canClick || pressed("KeyF")) && p.boltCd <= 0) this.castBolt();
    if (pressed("KeyE")) this.interact();

    // world
    this.flowT -= dt; const pc = Math.floor(p.z / T) * this.cols + Math.floor(p.x / T);
    if (this.flowT <= 0 || pc !== this.flowCell) { this.flowT = 0.3; this.flowCell = pc; this.computeFlow(); }
    for (const d of this.doors) {
      if (d.open !== d.target) { d.open += Math.sign(d.target - d.open) * dt * 1.6; if (Math.abs(d.open - d.target) < 0.03) d.open = d.target; }
      if (d.secret) d.mesh.position.set(d.x + (d.ns ? d.open * (T - 0.05) : 0), WALL_H / 2, d.z + (d.ns ? 0 : d.open * (T - 0.05)));   // slides into the wall
      else d.mesh.position.y = d.open * 3.05;
    }
    this.updateLockRoom(); this.updateTome(dt); this.updatePrincess(dt);
    if (this.ambushT > 0 && (this.ambushT -= dt) <= 0) this.ambush(this.ambushMsg);
    if (this.bubbleT > 0) { this.bubbleT -= dt; if (this.bubbleT <= 0) hud.bubble(null); }
    for (const pr of this.props) { if (pr.lid) { const tgt = pr.opened ? -1.9 : 0; pr.lidA += (tgt - pr.lidA) * Math.min(1, dt * 8); pr.lid.rotation.x = pr.lidA; } if (pr.glint) pr.glint.material.opacity = 0.5 + Math.sin(this.t * 4 + pr.x) * 0.3; }
    for (const e of this.enemies) this.updateEnemy(e, dt);
    this.enemies = this.enemies.filter((e) => !e.gone);
    this.updateDecoys(dt);
    for (const pl of this.plates) if (!pl.used && Math.hypot(pl.x - p.x, pl.z - p.z) < 0.9) { pl.used = true; this.springTrap(pl); }
    this.updateHazards(dt); this.updatePuddles(); this.updateSlimeReinforcements(dt);
    this.updateShots(dt); this.updateItems(dt); this.updateFx(dt);

    // stairs
    const open = this.stairsOpen();
    for (const st of this.stairs) {
      st.glow.material.opacity = open ? 0.55 + Math.sin(this.t * 3) * 0.2 : 0.12;
      if (Math.hypot(st.x - p.x, st.z - p.z) < 1.4) {
        if (open) { this.complete(); break; }
        else if (!st.warned || this.t - st.warned > 4) { st.warned = this.t; hud.msg(this.sealedText(), 3); sfx.deny(); }
      }
    }
    // hints
    this.L.hints.forEach((h, i) => { if (!this.hintsDone.has(i) && Math.floor(p.x / T) === h.c && Math.floor(p.z / T) === h.r) { this.hintsDone.add(i); hud.msg(h.text, 6); narrate(h.text); } });
    // boss bar + objective
    const boss = this.enemies.find((e) => e.d.boss && !e.dead && e.state !== "idle");
    hud.boss(boss ? boss.d.name : null, boss ? boss.hp / boss.d.hp : 0);
    this.objTimer = (this.objTimer || 0) - dt; if (this.objTimer <= 0) { this.objTimer = 0.5; hud.objective(this.objectiveText()); }
    // explored
    const ec = Math.floor(p.x / T), er = Math.floor(p.z / T);
    for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) { const c = ec + dc, r = er + dr; if (c >= 0 && r >= 0 && c < this.cols && r < this.rows && this.los(p.x, p.z, cx(c), cx(r))) this.explored[r * this.cols + c] = 1; }
    this.updateTorches(dt); this.updateViewmodel(dt); this.updateCamera(dt);
    const tgt = this.interactTarget();
    hud.prompt(tgt ? (tgt.kind === "door" ? (tgt.o.secret && !tgt.o.found ? "" : tgt.o.locked ? "The door is sealed" : `E — ${tgt.o.target ? "Close" : "Open"} door`) : `E — Search ${tgt.o.kind}`) : "");
    hud.update(); hud.tick(dt); this.drawMinimap();
  }
  canFreePrincess() { return this.L.goal !== "finale" || this.bossesDead(); }
  queueAmbush(msg) { if (this.ambushed || this.ambushT > 0) return; this.ambushT = 2.2; this.ambushMsg = msg; }
  // the objective is done but the way out is guarded: a fresh wave of enemies appears out of sight and hunts the player
  ambush(msg) {
    this.ambushed = true; const p = this.p, tier = this.L.tier ?? 0.5, n = 6 + Math.round(tier * 9), lr = this.L.lockRoom;
    this.computeFlow();
    // route from the exit back towards the player (the way the player must travel), following the flow field downhill
    const st = this.stairs[0], route = [];
    if (st) {
      let c = st.c, r = st.r;
      for (let guard = 0; guard < 400 && this.flow[r * this.cols + c] > 0; guard++) {
        route.push([c, r]); let best = null;
        for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const v = this.flow[(r + dr) * this.cols + c + dc]; if (v >= 0 && v < this.flow[r * this.cols + c] && (!best || v < best[0])) best = [v, c + dc, r + dr]; }
        if (!best) break; c = best[1]; r = best[2];
      }
    }
    const nearRoute = new Set();
    route.forEach(([c, r], i) => { if (i % 2) return; for (let dr = -3; dr <= 3; dr++) for (let dc = -3; dc <= 3; dc++) nearRoute.add((r + dr) * this.cols + c + dc); });
    const exitCells = [], routeCells = [], cells = [];
    for (let r = 0; r < this.rows; r++) for (let c = 0; c < this.cols; c++) {
      const d = this.flow[r * this.cols + c];
      if (d < 5 || d > 60 || this.ch(c, r) === "E" || this.doorAt(c, r)) continue;
      if (lr && c >= lr.rect[0] && c <= lr.rect[2] && r >= lr.rect[1] && r <= lr.rect[3]) continue;
      const x = cx(c), z = cx(r); if (this.blocked(x, z, 0.5) || this.los(x, z, p.x, p.z)) continue;
      if (st && Math.abs(c - st.c) + Math.abs(r - st.r) <= 7 && d >= 5) exitCells.push([x, z]);
      else if (nearRoute.has(r * this.cols + c) && d >= 7) routeCells.push([x, z]);
      else if (d >= 7 && d <= 36) cells.push([x, z]);
    }
    const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    // the wave gathers around the exit (~40%), in rooms along the way to it (~40%), and elsewhere (rest)
    const nExit = Math.ceil(n * 0.4), nRoute = Math.ceil(n * 0.4);
    const picked = [...shuffle(exitCells).slice(0, nExit), ...shuffle(routeCells).slice(0, nRoute)];
    const rest = shuffle([...cells, ...exitCells.slice(nExit), ...routeCells.slice(nRoute)]);
    cells.length = 0; cells.push(...picked, ...rest);
    const w = [["goblin", 1], ["archer", 0.7], ["skeleton", 0.5 + tier], ["chaos", this.idx < 5 ? 0 : 0.2 + tier * 0.8], ["crimson", this.idx < 5 ? 0 : Math.max(0, tier - 0.4) * 0.9]], tot = w.reduce((a, b) => a + b[1], 0);
    for (const [x, z] of cells.slice(0, n)) {
      let k = Math.random() * tot, type = "goblin"; for (const [t, v] of w) { if ((k -= v) <= 0) { type = t; break; } }
      const e = this.addEnemy(type, x, z); e.state = "chase"; e.ambush = true; this.burst(x, 1, z, 0xb070ff, 8, 2.5, 0.7, 0.07);
    }
    sfx.roar(); this.camShake = 0.3; hud.msg(msg, 6); this.noise = 1;
  }
  updateLockRoom() {
    const lr = this.L.lockRoom; if (!lr) return;
    const door = this.doorAt(lr.door[0], lr.door[1]); if (!door) return;
    const [c0, r0, c1, r1] = lr.rect, inRect = (x, z) => { const c = Math.floor(x / T), r = Math.floor(z / T); return c >= c0 && c <= c1 && r >= r0 && r <= r1; };
    if (!this.lockState && inRect(this.p.x, this.p.z) && Math.hypot(this.p.x - door.x, this.p.z - door.z) > 1.9) {
      this.lockState = "sealed"; door.target = 0; door.locked = true; flashModel(door.mesh, 0.55); sfx.lock(); this.camShake = 0.3;
      hud.msg("The door slams shut behind you! Defeat every foe in this hall to break the seal.", 5);
    } else if (this.lockState === "sealed" && !this.enemies.some((e) => !e.dead && inRect(e.x, e.z))) {
      this.lockState = "cleared"; door.locked = false; flashModel(door.mesh, 0); sfx.door();
      hud.msg(this.enemies.some((e) => !e.dead) ? "The hall is silent — the seal on the door breaks." : "The hall is silent. The stairwells will open!", 4);
    }
  }
  updateTome(dt) {
    const tm = this.tome; if (!tm || this.hasTome) return;
    tm.mesh.position.y = 1.0 + Math.sin(this.t * 2) * 0.1; tm.mesh.rotation.y += dt * 1.4; tm.glow.material.opacity = 0.55 + Math.sin(this.t * 3.5) * 0.2;
    if (Math.hypot(tm.x - this.p.x, tm.z - this.p.z) < 1.5) {
      this.hasTome = true; this.scene.remove(tm.mesh, tm.glow); sfx.found(); hud.flash("170,120,255", 0.4);
      this.say("You", TOME.found[this.L.book || 0], 6); hud.msg(`You found the ${this.bookName}! Return to the stairwell.`, 5); hud.objective(this.objectiveText());
      this.queueAmbush("The tome's magic has alarmed the dungeon — reinforcements are closing in! Get back to the stairwell!");
    }
  }
  updatePrincess(dt) {
    const pr = this.princess; if (!pr) return;
    const p = this.p, dx = p.x - pr.x, dz = p.z - pr.z, dist = Math.hypot(dx, dz) || 0.001, P = pr.p, aim = (tx, tz, rate) => { const a = Math.atan2(tx, tz); let df = a - pr.yaw; df = Math.atan2(Math.sin(df), Math.cos(df)); pr.yaw += df * Math.min(1, rate * dt); };
    let moved = 0;
    if (!pr.found) {
      if (dist < 10) aim(dx / dist, dz / dist, 3);
      if (dist < 4.5 && !this.canFreePrincess() && this.los(pr.x, pr.z, p.x, p.z) && this.t - (pr.warned || -99) > 8) { pr.warned = this.t; hud.msg("Dark magic shackles her — defeat her captors first!", 3); }
      if (dist < 3.6 && this.canFreePrincess() && this.los(pr.x, pr.z, p.x, p.z)) {
        pr.found = true; sfx.found(); hud.flash("255,230,140", 0.35);
        this.say("Elven Princess", PRINCESS.found[0], 7); hud.msg("You found the Elven Princess! She will follow you — now reach the stairwell!", 6); hud.objective(this.objectiveText());
        this.queueAmbush("The alarm is raised — enemies pour into the dungeon! Get the princess to the stairwell!");
      }
    } else {
      if (dist > 2.3) {
        let dir = [dx / dist, dz / dist];
        if (!(dist < 9 && this.los(pr.x, pr.z, p.x, p.z))) dir = this.flowDir(pr) || dir;
        this.openAhead({ x: pr.x, z: pr.z, d: { r: 0.4 } }, dir);
        const sp = Math.min(6.4, moveSpeed() * (dist > 6 ? 1.2 : 0.92)), ox = pr.x, oz = pr.z;
        this.moveEnt(pr, dir[0] * sp * dt, dir[1] * sp * dt, 0.4); moved = Math.hypot(pr.x - ox, pr.z - oz);
        aim(dir[0], dir[1], 8);
      } else aim(dx / dist, dz / dist, 5);
      if (dist > 16) {                                             // lost her way: catch up behind the player
        pr.tele += dt;
        if (pr.tele > 3) { const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw); for (const k of [2, 1.2, 0.6, 0]) { const x = p.x - fx * k, z = p.z - fz * k; if (!this.blocked(x, z, 0.4)) { pr.x = x; pr.z = z; break; } } pr.tele = 0; }
      } else pr.tele = 0;
      pr.sayT -= dt;
      if (pr.sayT <= 0 && dist < 6 && this.bubbleT <= 0) { pr.sayT = rand(28, 45); this.say("Elven Princess", PRINCESS.follow[Math.floor(Math.random() * PRINCESS.follow.length)], 4); }
    }
    pr.walk += moved * 2.6;
    const w = Math.sin(pr.walk) * (moved > 0 ? 1 : 0), t = this.t;
    pr.mesh.position.set(pr.x, 0, pr.z); pr.mesh.rotation.y = pr.yaw;
    P.body.position.y = pr.found ? Math.abs(w) * 0.04 : Math.sin(t * 1.8) * 0.012;
    P.arm_L.rotation.x = -w * 0.6 - 0.15; P.arm_R.rotation.x = w * 0.6 - 0.15; P.head.rotation.z = Math.sin(t * 1.1) * 0.04;
    if (!pr.found) { P.arm_R.rotation.z = -0.12 - 0.5 * (Math.sin(t * 3) * 0.5 + 0.5); }                 // waves for help
  }
  updateEnemiesOnly(dt) { for (const e of this.enemies) { if (e.dead) this.updateEnemy(e, dt); } }
  updateAfter(dt) { this.t += dt; this.updateFx(dt); this.updateTorches(dt); this.updateViewmodel(dt); hud.tick(dt); }
  complete() {
    this.state = "complete"; sfx.stairs(); hud.prompt(""); hud.boss(null);
    if (this.princess && this.princess.found) sayLine(PRINCESS.freed[0]);
    S.levelIdx = Math.max(S.levelIdx, this.idx + 1); save();
    this.onEnd("complete", { kills: this.kills, gold: S.gold - this.startGold });
  }
  updateTorches(dt) {
    const p = this.p;
    this.torch.position.set(p.x, 1.8, p.z); this.torch.intensity = 26 + Math.sin(this.t * 9) * 1.2 + Math.sin(this.t * 23) * 0.8;
    const near = this.torches.map((tc) => ({ tc, d: (tc.x - p.x) ** 2 + (tc.z - p.z) ** 2 })).sort((a, b) => a.d - b.d).slice(0, 4);
    this.torchLights.forEach((l, i) => { const n = near[i]; if (n && n.d < 400) { l.position.set(n.tc.x, 1.9, n.tc.z); l.intensity = 14 + Math.sin(this.t * 11 + n.tc.ph) * 2; } else l.intensity = 0; });
    for (const tc of this.torches) if (tc.flame) { const s = 1 + Math.sin(this.t * 14 + tc.ph) * 0.18; tc.flame.scale.set(s, 1 + Math.sin(this.t * 17 + tc.ph) * 0.25, s); }
  }
  updateCamera(dt) {
    const p = this.p;
    this.camShake = Math.max(0, this.camShake - dt * 1.4);
    const sh = this.camShake;
    camera.position.set(p.x + rand(-sh, sh) * 0.15, 1.55 + Math.sin(p.bob * 2) * 0.035 + rand(-sh, sh) * 0.12, p.z + rand(-sh, sh) * 0.15);
    camera.rotation.set(p.pitch, p.yaw, 0);
  }
  drawMinimap() {
    const cv = hud.minimap, g = cv.getContext("2d"), s = Math.floor(Math.min(cv.width / this.cols, cv.height / this.rows));
    g.clearRect(0, 0, cv.width, cv.height);
    for (let r = 0; r < this.rows; r++) for (let c = 0; c < this.cols; c++) {
      if (!this.explored[r * this.cols + c]) continue;
      g.fillStyle = this.isWall(c, r) ? "#8a7a5a" : "#2a2418"; g.fillRect(c * s, r * s, s, s);
    }
    for (const d of this.doors) if (this.explored[d.r * this.cols + d.c]) {
      if (d.secret && !d.found) g.fillStyle = "#8a7a5a";                       // looks like wall until discovered
      else g.fillStyle = d.locked ? "#ff3030" : d.target ? "#5a8a3a" : "#c8782a";
      if (d.secret && !d.found) g.fillRect(d.c * s, d.r * s, s, s); else g.fillRect(d.c * s + 1, d.r * s + 1, s - 2, s - 2);
    }
    if (this.tome && !this.hasTome && this.explored[this.tome.r * this.cols + this.tome.c]) { g.fillStyle = "#b080ff"; g.fillRect(this.tome.c * s + 1, this.tome.r * s + 1, s - 2, s - 2); }
    if (this.princess && (this.princess.found || this.explored[this.princess.r * this.cols + this.princess.c])) { g.fillStyle = "#ff8ad0"; g.beginPath(); g.arc(this.princess.x / T * s, this.princess.z / T * s, 3.5, 0, 7); g.fill(); }
    for (const st of this.stairs) if (this.explored[st.r * this.cols + st.c]) { g.fillStyle = "#ffe070"; g.fillRect(st.c * s, st.r * s, s, s); }
    g.fillStyle = "#ff4040";
    for (const e of this.enemies) if (!e.dead && e.los) g.fillRect(e.x / T * s - 2, e.z / T * s - 2, 4, 4);
    const px = this.p.x / T * s, pz = this.p.z / T * s;
    g.fillStyle = "#6aff8a"; g.beginPath(); g.moveTo(px - Math.sin(this.p.yaw) * 6, pz - Math.cos(this.p.yaw) * 6);
    g.lineTo(px + Math.cos(this.p.yaw) * 3 + Math.sin(this.p.yaw) * 3, pz - Math.sin(this.p.yaw) * 3 + Math.cos(this.p.yaw) * 3);
    g.lineTo(px - Math.cos(this.p.yaw) * 3 + Math.sin(this.p.yaw) * 3, pz + Math.sin(this.p.yaw) * 3 + Math.cos(this.p.yaw) * 3); g.fill();
  }

  restoreSnapshot() { S.gold = this.startGold; S.amulet = this.startAmulet; S.mana = Math.max(this.startMana, Math.min(S.maxMana, 4)); }
  dispose() {
    camera.remove(this.vm); camera.remove(this.camLight); camera.rotation.z = 0;
    this.scene.traverse((o) => { o.geometry?.dispose?.(); });
    hud.boss(null); hud.prompt(""); hud.bubble(null); stopLine();
  }
}
