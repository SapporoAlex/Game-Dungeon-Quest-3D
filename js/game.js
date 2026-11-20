// Level gameplay: first-person dungeon crawl (walls, doors, enemies, items, spells).
import {
  THREE, T, WALL_H, camera, TEX, inst, parts, flashModel, glowSprite, keys, mouse, pressed, lock, sfx, moveInput, rumble,
} from "./engine.js";
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
  goblin: { model: "goblin", name: "Goblin", hp: 2, speed: 3.5, dmg: 1, reach: 1.55, cd: 0.9, wind: 0.28, r: 0.4, scale: 1.1, coins: [1, 2] },
  skeleton: { model: "skeleton", name: "Skeleton", hp: 3, speed: 2.8, dmg: 1, reach: 1.95, cd: 1.0, wind: 0.35, r: 0.38, scale: 1.0, coins: [1, 3] },
  chaos: { model: "chaos", name: "Chaos Warrior", hp: 6, speed: 2.3, dmg: 2, reach: 2.3, cd: 1.5, wind: 0.5, r: 0.6, scale: 1.0, coins: [2, 4] },
  dragon: { model: "dragon", name: "Red Dragon", hp: 26, speed: 2.1, dmg: 3, reach: 3.3, cd: 1.7, wind: 0.6, r: 1.15, scale: 0.95, coins: [8, 12], boss: true },
};
const rand = (a, b) => a + Math.random() * (b - a);
const irand = (a, b) => Math.floor(rand(a, b + 1));
const cx = (c) => (c + 0.5) * T;

export class Play {
  constructor(levelIdx, onEnd) {
    this.onEnd = onEnd;
    this.idx = levelIdx;
    const L = (this.L = LEVELS[levelIdx]);
    this.theme = THEMES[L.id];
    this.rows = L.map.length; this.cols = L.map[0].length;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.theme.fog);
    this.scene.fog = new THREE.FogExp2(this.theme.fog, 0.058);
    this.t = 0; this.state = "play"; this.kills = 0; this.noise = 0;
    this.doors = []; this.props = []; this.enemies = []; this.items = []; this.shots = []; this.fx = []; this.plates = [];
    this.torches = []; this.stairs = []; this.hintsDone = new Set();
    this.startGold = S.gold; this.startPotions = S.potions; this.startMana = S.mana;
    S.hp = S.maxHp;

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
    if (L.hints[0]) this.hintsDone.add(0);
    this.camShake = 0;
  }

  faceYaw(d) { return { N: 0, E: -Math.PI / 2, S: Math.PI, W: Math.PI / 2 }[d] ?? 0; }
  objectiveText() {
    const g = this.L.goal;
    if (g === "stairs") return "Find the stairwell and descend.";
    if (g === "dragon") return this.dragonDead() ? "The dragon is dead — return to the stairwell!" : "Slay the Red Dragon, then take the stairwell.";
    return this.enemies.filter((e) => !e.dead).length ? `Defeat every enemy (${this.enemies.filter((e) => !e.dead).length} left).` : "All foes defeated — take a stairwell!";
  }
  dragonDead() { return !this.enemies.some((e) => e.type === "dragon" && !e.dead); }
  stairsOpen() { const g = this.L.goal; return g === "stairs" || (g === "dragon" && this.dragonDead()) || (g === "clear" && !this.enemies.some((e) => !e.dead)); }

  // ------------------------------------------------------------------ geometry
  ch(c, r) { return this.L.map[r]?.[c]; }
  isWall(c, r) { return c < 0 || r < 0 || c >= this.cols || r >= this.rows || this.L.map[r][c] === "#"; }
  doorAt(c, r) { return this.doors.find((d) => d.c === c && d.r === r); }
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
    for (let r = 0; r < this.rows; r++) for (let c = 0; c < this.cols; c++) {
      if (this.isWall(c, r)) continue;
      const x0 = c * T, x1 = x0 + T, z0 = r * T, z1 = z0 + T, h = WALL_H, vv = h / T;
      // wall on each side that is solid (faces point into this cell)
      if (this.isWall(c, r - 1)) { quad([x1, 0, z0], [x0, 0, z0], [x0, h, z0], [x1, h, z0], [0, 0, 1], 1, vv); torchFaces.push([c, r, 0, 1]); }
      if (this.isWall(c, r + 1)) { quad([x0, 0, z1], [x1, 0, z1], [x1, h, z1], [x0, h, z1], [0, 0, -1], 1, vv); torchFaces.push([c, r, 0, -1]); }
      if (this.isWall(c - 1, r)) { quad([x0, 0, z0], [x0, 0, z1], [x0, h, z1], [x0, h, z0], [1, 0, 0], 1, vv); torchFaces.push([c, r, 1, 0]); }
      if (this.isWall(c + 1, r)) { quad([x1, 0, z1], [x1, 0, z0], [x1, h, z0], [x1, h, z1], [-1, 0, 0], 1, vv); torchFaces.push([c, r, -1, 0]); }
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
    const ceilT = TEX.ceil.clone(); ceilT.repeat.set(this.cols * 2, this.rows * 2); ceilT.needsUpdate = true;
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshLambertMaterial({ map: ceilT, color: 0x907868 }));
    ceil.rotation.x = Math.PI / 2; ceil.position.set(W / 2, WALL_H, D / 2); this.scene.add(ceil);

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

    // doors
    for (const d of L.doors) {
      const m = inst("door");
      const ns = this.isWall(d.c - 1, d.r) && this.isWall(d.c + 1, d.r);
      m.rotation.y = ns ? 0 : Math.PI / 2;
      m.position.set(cx(d.c), 0, cx(d.r));
      this.scene.add(m);
      this.doors.push({ c: d.c, r: d.r, x: cx(d.c), z: cx(d.r), mesh: m, open: 0, target: 0 });
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
    for (const [c, r] of L.plates) {
      if (this.isWall(c, r)) continue;
      const m = inst("plate"); m.position.set(cx(c), 0.01, cx(r)); this.scene.add(m);
      this.plates.push({ x: cx(c), z: cx(r), used: false, mesh: m });
    }
    // props
    for (const p of L.props) this.addProp(p);
    // enemies (some levels are thinned: the original had random variants per room)
    for (const e of L.enemies) {
      if (e.t === "dragon" && L.goal === "stairs") continue;                 // escape quests have no boss
      if (!L.thin || L.thin >= 1 || Math.random() < L.thin) this.addEnemy(e.t, cx(e.c), cx(e.r));
    }
  }

  addProp(p) {
    const m = inst(p.t);
    const x = cx(p.c), z = cx(p.r);
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
    const d = DEF[type];
    const m = inst(d.model); m.scale.setScalar(d.scale);
    m.position.set(x, 0, z); this.scene.add(m);
    const pn = type === "dragon"
      ? ["body", "neck", "head", "jaw", "wing_L", "wing_R", "tail1", "tail2", "tail3", "leg_FL", "leg_FR", "leg_BL", "leg_BR"]
      : ["body", "head", "arm_L", "arm_R", "leg_L", "leg_R"];
    const e = { type, d, x, z, yaw: rand(0, 6.28), hp: d.hp, mesh: m, p: parts(m, pn), state: "idle", atk: rand(0.2, d.cd), wind: 0, stagger: 0,
      kx: 0, kz: 0, flash: 0, dead: false, deadT: 0, walk: rand(0, 6), senseT: Math.random() * 0.3, los: false, fireCd: rand(1, 3), biting: 0, stuck: 0 };
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
    for (let i = 1; i < n; i++) if (this.solid(Math.floor((x0 + dx * i / n) / T), Math.floor((z0 + dz * i / n) / T))) return false;
    return true;
  }
  losWide(e, r) {
    const dx = this.p.x - e.x, dz = this.p.z - e.z, l = Math.hypot(dx, dz) || 1, nx = -dz / l * r, nz = dx / l * r;
    return this.los(e.x, e.z, this.p.x, this.p.z) && this.los(e.x + nx, e.z + nz, this.p.x + nx, this.p.z + nz) && this.los(e.x - nx, e.z - nz, this.p.x - nx, this.p.z - nz);
  }
  rayLen(x, z, dx, dz, max) {
    for (let t = 0; t < max; t += 0.2) if (this.solid(Math.floor((x + dx * t) / T), Math.floor((z + dz * t) / T))) return t;
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
        if (this.isWall(nc, nr) || flow[nr * cols + nc] >= 0) continue;
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
      if (this.isWall(nc, nr)) continue;
      if (dc && dr && (this.isWall(c + dc, r) || this.isWall(c, r + dr))) continue;
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
    let n = kind === "chest" ? 3 : 1 + (Math.random() < 0.25 + 0.1 * S.luckLvl ? 1 : 0);
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
        if (it.kind === "health" && S.potions >= 20) continue;
        if (it.kind === "coin") { S.gold++; sfx.coin(); }
        else if (it.kind === "health") { S.potions++; sfx.pickup(); hud.msg("Picked up a health potion (Q to drink)", 2.5); }
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
    } else { this.burst(pr.x, 1.0, pr.z, 0xffe08a, 10, 2.5, 0.6, 0.05); if (pr.glint) { this.scene.remove(pr.glint); pr.glint = null; } }
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
    if (S.hp <= 0) { this.state = "dead"; this.endT = 0; this.onEnd("dead"); }
  }
  damageEnemy(e, dmg, kx, kz, mag = 1.6) {
    if (e.dead) return;
    e.hp -= dmg; e.flash = 1; e.stagger = e.d.boss ? 0.05 : 0.28; e.kx = kx * mag; e.kz = kz * mag; e.wind = 0;
    if (e.state === "idle") this.wake(e);
    sfx.hit();
    this.burst(e.x, 1.1, e.z, 0xff4030, 6, 2.2, 0.35, 0.05);
    if (e.hp <= 0) this.killEnemy(e);
  }
  killEnemy(e) {
    e.dead = true; e.deadT = 0; this.kills++; sfx.enemyDie();
    const [a, b] = e.d.coins;
    const loot = [["coin", irand(a, b)]];
    if (Math.random() < 0.28) loot.push(["mana", 1]);
    if (Math.random() < 0.22) loot.push(["health", 1]);
    if (e.type === "dragon") { loot.push(["health", 2], ["mana", 2]); hud.boss(null); hud.msg("The Red Dragon has fallen!", 5); }
    this.dropLoot(e.x, e.z, loot);
    this.burst(e.x, 1, e.z, 0xcccccc, 10, 2.5, 0.8, 0.1);
    hud.objective(this.objectiveText());
  }
  wake(e) { if (e.state !== "idle") return; e.state = "chase"; if (e.type === "dragon") { sfx.roar(); this.aliveBoss = e; } }

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
      this.damageEnemy(best.o, boltDmg(), fx, fz, 2.2);
      // chain to a nearby enemy
      let chain = null, cd = 5.5;
      for (const e of this.enemies) { if (e.dead || e === best.o) continue; const d = Math.hypot(e.x - best.o.x, e.z - best.o.z); if (d < cd && this.los(best.o.x, best.o.z, e.x, e.z)) { cd = d; chain = e; } }
      if (chain) { this.bolt(end, new THREE.Vector3(chain.x, 1.2, chain.z)); this.damageEnemy(chain, Math.ceil(boltDmg() / 2), 0, 0, 0.5); }
    } else if (best) this.openProp(best.o);
  }
  drinkPotion() {
    if (S.potions <= 0) { sfx.deny(); hud.msg("No health potions!", 1.5); return; }
    if (S.hp >= S.maxHp) { hud.msg("Already at full health.", 1.5); return; }
    S.potions--; S.hp = S.maxHp; sfx.drink(); hud.flash("255,80,100", 0.3); hud.msg("Health restored!", 1.5);
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
      if (e.fireCd <= 0 && e.los && dist > 4.5 && dist < 18) { e.fireCd = rand(2.2, 3.4); this.fireball(e); }
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
    { const dd = this.doorAt(Math.floor((e.x + dir[0] * (d.r + 0.8)) / T), Math.floor((e.z + dir[1] * (d.r + 0.8)) / T)); if (dd && dd.target === 0) { dd.target = 1; sfx.door(); } }
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
  }
  fireball(e) {
    sfx.fire(); e.biting = 0.8;
    const dx = this.p.x - e.x, dz = this.p.z - e.z, l = Math.hypot(dx, dz);
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), new THREE.MeshBasicMaterial({ color: 0xff8a20 }));
    const g = glowSprite(0xff6a10, 1.6, 0.9); m.add(g);
    m.position.set(e.x + dx / l * 1.8, 1.7, e.z + dz / l * 1.8); this.scene.add(m);
    this.shots.push({ kind: "fire", m, x: m.position.x, z: m.position.z, vx: dx / l * 9, vz: dz / l * 9, dmg: 2, life: 4 });
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
      let dead = s.life <= 0 || this.solid(Math.floor(s.x / T), Math.floor(s.z / T));
      if (!dead && Math.hypot(s.x - this.p.x, s.z - this.p.z) < 0.55) { this.hurtPlayer(s.dmg, s.x, s.z); dead = true; if (s.kind === "fire") this.burst(s.x, 1.4, s.z, 0xff8a20, 12, 3.5, 0.5, 0.09); }
      if (dead) { this.scene.remove(s.m); this.shots.splice(i, 1); }
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
    for (const d of this.doors) consider("door", d, d.x, d.z, 3.0);
    for (const pr of this.props) if (!pr.opened) consider("prop", pr, pr.x, pr.z, 2.5);
    return best;
  }
  interact() {
    const t = this.interactTarget(); if (!t) return;
    if (t.kind === "door") {
      const d = t.o;
      if (d.target === 1) { // closing: refuse if someone stands in the doorway
        if (Math.hypot(this.p.x - d.x, this.p.z - d.z) < 1.3 || this.enemies.some((e) => !e.dead && Math.hypot(e.x - d.x, e.z - d.z) < 1.5)) { hud.msg("Something is in the way.", 1.5); sfx.deny(); return; }
      }
      d.target = d.target ? 0 : 1; sfx.door(); this.noise = Math.max(this.noise, 0.2);
    } else this.openProp(t.o);
  }

  // ------------------------------------------------------------------ main update
  update(dt) {
    if (this.state === "complete") { this.updateAfter(dt); return; }
    this.t += dt; const p = this.p;
    p.inv -= dt; p.cd -= dt; p.boltCd -= dt; p.cast -= dt; this.noise -= dt;
    if (p.swing > 0) { p.swing -= dt; if (!p.swingHit && p.swing < 0.2) { p.swingHit = true; this.swordHit(); } }
    if (this.state === "dead") { this.endT += dt; camera.rotation.z = Math.min(0.8, this.endT * 1.2); camera.position.y = Math.max(0.3, 1.55 - this.endT * 1.2); this.updateFx(dt); this.updateEnemiesOnly(dt); return; }

    // look
    p.yaw -= mouse.dx * 0.0024; p.pitch = Math.max(-0.9, Math.min(0.9, p.pitch - mouse.dy * 0.0024));
    const turn = (keys.ArrowLeft ? 1 : 0) - (keys.ArrowRight ? 1 : 0); p.yaw += turn * 2.4 * dt;
    if (keys.ArrowUp) p.pitch = Math.min(0.9, p.pitch + dt); if (keys.ArrowDown) p.pitch = Math.max(-0.9, p.pitch - dt);
    // move
    const [f, s] = moveInput();
    const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw), rx = Math.cos(p.yaw), rz = -Math.sin(p.yaw);
    let mx = fx * f + rx * s, mz = fz * f + rz * s; const ml = Math.hypot(mx, mz);
    if (ml > 0) { const k = Math.min(1, ml); mx /= ml; mz /= ml; const sp = moveSpeed() * (keys.ShiftLeft ? 1.25 : 1) * k; this.moveEnt(p, mx * sp * dt, mz * sp * dt, p.r); p.bob += dt * sp * 1.7; this.noise = Math.max(this.noise, 0.12); }
    // actions
    const canClick = lock.active || lock.failed;
    if ((mouse.leftPressed && canClick || pressed("Space")) && p.cd <= 0) this.swordAttack();
    if ((mouse.rightPressed && canClick || pressed("KeyF")) && p.boltCd <= 0) this.castBolt();
    if (pressed("KeyE")) this.interact();
    if (pressed("KeyQ")) this.drinkPotion();

    // world
    this.flowT -= dt; const pc = Math.floor(p.z / T) * this.cols + Math.floor(p.x / T);
    if (this.flowT <= 0 || pc !== this.flowCell) { this.flowT = 0.3; this.flowCell = pc; this.computeFlow(); }
    for (const d of this.doors) {
      if (d.open !== d.target) { d.open += Math.sign(d.target - d.open) * dt * 1.6; if (Math.abs(d.open - d.target) < 0.03) d.open = d.target; }
      d.mesh.position.y = d.open * 3.05;
    }
    for (const pr of this.props) { if (pr.lid) { const tgt = pr.opened ? -1.9 : 0; pr.lidA += (tgt - pr.lidA) * Math.min(1, dt * 8); pr.lid.rotation.x = pr.lidA; } if (pr.glint) pr.glint.material.opacity = 0.5 + Math.sin(this.t * 4 + pr.x) * 0.3; }
    for (const e of this.enemies) this.updateEnemy(e, dt);
    this.enemies = this.enemies.filter((e) => !e.gone);
    for (const pl of this.plates) if (!pl.used && Math.hypot(pl.x - p.x, pl.z - p.z) < 0.9) { pl.used = true; this.trapArrows(); }
    this.updateShots(dt); this.updateItems(dt); this.updateFx(dt);

    // stairs
    const open = this.stairsOpen();
    for (const st of this.stairs) {
      st.glow.material.opacity = open ? 0.55 + Math.sin(this.t * 3) * 0.2 : 0.12;
      if (Math.hypot(st.x - p.x, st.z - p.z) < 1.4) {
        if (open) { this.complete(); break; }
        else if (!st.warned || this.t - st.warned > 4) { st.warned = this.t; hud.msg(this.L.goal === "dragon" ? "The stairwell is sealed — slay the Red Dragon first!" : "The stairwell is sealed — defeat every enemy first!", 3); sfx.deny(); }
      }
    }
    // hints
    this.L.hints.forEach((h, i) => { if (!this.hintsDone.has(i) && Math.floor(p.x / T) === h.c && Math.floor(p.z / T) === h.r) { this.hintsDone.add(i); hud.msg(h.text, 6); } });
    // boss bar + objective
    const boss = this.enemies.find((e) => e.type === "dragon" && !e.dead && e.state !== "idle");
    hud.boss(boss ? boss.d.name : null, boss ? boss.hp / boss.d.hp : 0);
    this.objTimer = (this.objTimer || 0) - dt; if (this.objTimer <= 0) { this.objTimer = 0.5; hud.objective(this.objectiveText()); }
    // explored
    const ec = Math.floor(p.x / T), er = Math.floor(p.z / T);
    for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) { const c = ec + dc, r = er + dr; if (c >= 0 && r >= 0 && c < this.cols && r < this.rows && this.los(p.x, p.z, cx(c), cx(r))) this.explored[r * this.cols + c] = 1; }
    this.updateTorches(dt); this.updateViewmodel(dt); this.updateCamera(dt);
    const tgt = this.interactTarget();
    hud.prompt(tgt ? (tgt.kind === "door" ? `E — ${tgt.o.target ? "Close" : "Open"} door` : `E — Search ${tgt.o.kind}`) : "");
    hud.update(); hud.tick(dt); this.drawMinimap();
  }
  updateEnemiesOnly(dt) { for (const e of this.enemies) { if (e.dead) this.updateEnemy(e, dt); } }
  updateAfter(dt) { this.t += dt; this.updateFx(dt); this.updateTorches(dt); this.updateViewmodel(dt); hud.tick(dt); }
  complete() {
    this.state = "complete"; sfx.stairs(); hud.prompt(""); hud.boss(null);
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
    for (const d of this.doors) if (this.explored[d.r * this.cols + d.c]) { g.fillStyle = d.target ? "#5a8a3a" : "#c8782a"; g.fillRect(d.c * s + 1, d.r * s + 1, s - 2, s - 2); }
    for (const st of this.stairs) if (this.explored[st.r * this.cols + st.c]) { g.fillStyle = "#ffe070"; g.fillRect(st.c * s, st.r * s, s, s); }
    g.fillStyle = "#ff4040";
    for (const e of this.enemies) if (!e.dead && e.los) g.fillRect(e.x / T * s - 2, e.z / T * s - 2, 4, 4);
    const px = this.p.x / T * s, pz = this.p.z / T * s;
    g.fillStyle = "#6aff8a"; g.beginPath(); g.moveTo(px - Math.sin(this.p.yaw) * 6, pz - Math.cos(this.p.yaw) * 6);
    g.lineTo(px + Math.cos(this.p.yaw) * 3 + Math.sin(this.p.yaw) * 3, pz - Math.sin(this.p.yaw) * 3 + Math.cos(this.p.yaw) * 3);
    g.lineTo(px - Math.cos(this.p.yaw) * 3 + Math.sin(this.p.yaw) * 3, pz + Math.sin(this.p.yaw) * 3 + Math.cos(this.p.yaw) * 3); g.fill();
  }

  restoreSnapshot() { S.gold = this.startGold; S.potions = this.startPotions; S.mana = Math.max(this.startMana, Math.min(S.maxMana, 4)); }
  dispose() {
    camera.remove(this.vm); camera.remove(this.camLight); camera.rotation.z = 0;
    this.scene.traverse((o) => { o.geometry?.dispose?.(); });
    hud.boss(null); hud.prompt("");
  }
}
