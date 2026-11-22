// Models built in code (no .glb needed): dark wizard, elven princess, the Tome of Horass, bookshelves, goblin-archer gear, persian rugs.
// Humanoids follow the same convention as the Blender models: a root group with `body`, `head`, `arm_L`, `arm_R`, `leg_L`, `leg_R`
// children, +Z is "forward", limbs hang down -Y from their pivot.
import { THREE, inst } from "./engine.js";

const lam = (color, extra = {}) => new THREE.MeshLambertMaterial({ color, ...extra });
const glowMat = (color) => new THREE.MeshBasicMaterial({ color });
function mesh(geo, mat, pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1]) {
  const m = new THREE.Mesh(geo, mat); m.position.set(...pos); m.rotation.set(...rot); m.scale.set(...scale); return m;
}
const grp = (name, pos = [0, 0, 0], parent) => { const g = new THREE.Group(); g.name = name; g.position.set(...pos); if (parent) parent.add(g); return g; };
const ball = (r, mat, pos, scale) => mesh(new THREE.SphereGeometry(r, 14, 10), mat, pos, [0, 0, 0], scale);

// ------------------------------------------------------------------ goblin archer = goblin + hood + short bow
export function makeArcher() {
  const m = inst("goblin");
  const cloth = 0x2f5a3a, leather = 0x4a3220;
  m.traverse((c) => {
    if (!c.isMesh) return;
    if (/^(belly)$/.test(c.name)) c.material.color.setHex(cloth);
    if (/^(skirt)$/.test(c.name)) c.material.color.setHex(0x3a2a18);
    if (/dagger/.test(c.name)) c.visible = false;
  });
  const head = m.getObjectByName("head"), armL = m.getObjectByName("arm_L"), armR = m.getObjectByName("arm_R");
  // hood: a cone over the head
  head.add(mesh(new THREE.ConeGeometry(0.3, 0.42, 12), lam(cloth), [0, 0.5, 0.0], [-0.12, 0, 0]));
  head.add(mesh(new THREE.TorusGeometry(0.29, 0.05, 6, 16), lam(0x244a2e), [0, 0.3, 0.0], [Math.PI / 2, 0, 0]));
  // quiver on the back
  const body = m.getObjectByName("body");
  body.add(mesh(new THREE.CylinderGeometry(0.09, 0.07, 0.5, 8), lam(leather), [0.12, 0.95, -0.28], [0.35, 0, 0.25]));
  for (let i = 0; i < 3; i++) body.add(mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.2, 4), lam(0xe8e0c0), [0.15 + i * 0.015, 1.25, -0.36 + i * 0.01], [0.35, 0, 0.25]));
  // short bow held in the left hand (arc bulges forward, +Z)
  const bow = grp("bow", [0, -0.5, 0.06], armL);
  const arc = mesh(new THREE.TorusGeometry(0.34, 0.022, 6, 18, Math.PI), lam(0x8a5a2a), [0, 0, 0], [0, -Math.PI / 2, -Math.PI / 2]);
  bow.add(arc);
  // string: tips of the arc are at y = ±0.34, x(z) = 0
  bow.add(mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.68, 4), lam(0xe8e0c0), [0, 0, 0]));
  m.userData.bow = bow;
  // an arrow nocked in the right hand — shown while aiming
  const nock = mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.55, 4), lam(0xd8c8a0), [0, -0.5, 0.2], [Math.PI / 2, 0, 0]);
  armR.add(nock); m.userData.nock = nock; nock.visible = false;
  return m;
}

// ------------------------------------------------------------------ dark wizard: purple robes, green glowing eyes, staff
export function makeWizard() {
  const root = new THREE.Group();
  const purple = lam(0x5a2a9a), dark = lam(0x2e1654), trim = lam(0xb890ff), skin = lam(0xb8c4a8), white = lam(0xd8d4e0);
  const body = grp("body", [0, 0, 0], root);
  body.add(mesh(new THREE.CylinderGeometry(0.2, 0.62, 1.35, 16), purple, [0, 0.7, 0]));
  body.add(mesh(new THREE.CylinderGeometry(0.63, 0.63, 0.07, 16), trim, [0, 0.06, 0]));
  body.add(mesh(new THREE.CylinderGeometry(0.27, 0.3, 0.09, 14), dark, [0, 0.98, 0]));
  body.add(ball(0.3, purple, [0, 1.42, 0], [1.25, 0.55, 0.8]));          // shoulders
  const legs = [grp("leg_L", [-0.14, 0.4, 0], body), grp("leg_R", [0.14, 0.4, 0], body)];
  legs.forEach((l) => l.add(mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), dark, [0, -0.3, 0.2])));
  const head = grp("head", [0, 1.58, 0], body);
  head.add(ball(0.2, skin, [0, 0.12, 0], [0.95, 1.05, 0.95]));
  head.add(mesh(new THREE.ConeGeometry(0.17, 0.55, 12), white, [0, -0.05, 0.12], [0.35, 0, 0]));   // beard
  head.add(mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.04, 16), dark, [0, 0.27, 0]));              // hat brim
  head.add(mesh(new THREE.ConeGeometry(0.27, 0.8, 14), dark, [0, 0.68, 0], [-0.14, 0, 0]));        // hat
  head.add(mesh(new THREE.TorusGeometry(0.265, 0.03, 6, 16), trim, [0, 0.31, 0], [Math.PI / 2, 0, 0]));
  const eyeMat = glowMat(0x39ff5c);
  for (const s of [-1, 1]) {
    head.add(ball(0.05, eyeMat, [s * 0.085, 0.17, 0.17], [1.5, 0.8, 0.8]));
    head.add(mesh(new THREE.BoxGeometry(0.11, 0.025, 0.03), dark, [s * 0.085, 0.235, 0.18], [0, 0, -s * 0.35])); // brow
  }
  // arms: sleeves + hands; the staff is carried in arm_R
  const aL = grp("arm_L", [-0.4, 1.42, 0], body), aR = grp("arm_R", [0.4, 1.42, 0], body);
  for (const a of [aL, aR]) {
    a.add(mesh(new THREE.CylinderGeometry(0.075, 0.12, 0.62, 10), purple, [0, -0.3, 0]));
    a.add(ball(0.065, skin, [0, -0.66, 0]));
  }
  const staff = grp("staff", [0, -0.66, 0.08], aR);
  staff.add(mesh(new THREE.CylinderGeometry(0.03, 0.035, 2.0, 6), lam(0x4a2c12), [0, 0.35, 0]));
  const orb = ball(0.12, glowMat(0xb06cff), [0, 1.42, 0]); orb.name = "orb"; staff.add(orb);
  staff.add(mesh(new THREE.TorusGeometry(0.13, 0.018, 6, 14), lam(0x8a6a2c), [0, 1.3, 0], [Math.PI / 2, 0, 0]));
  const orbLight = new THREE.PointLight(0xa060ff, 1.4, 5, 2); orbLight.position.set(0, 1.42, 0); staff.add(orbLight);
  root.userData.eyeMat = eyeMat; root.userData.orb = orb; root.userData.orbLight = orbLight;
  return root;
}

// ------------------------------------------------------------------ giant slime: a wobbling green blob with a big grin (spits goo)
export function makeSlime() {
  const root = new THREE.Group();
  const gel = lam(0x4fd95a, { transparent: true, opacity: 0.82 }), core = lam(0x2a9a3a, { transparent: true, opacity: 0.9 });
  const body = grp("body", [0, 0, 0], root);
  body.add(ball(0.85, gel, [0, 0.72, 0], [1.05, 0.82, 1.05]));
  body.add(ball(0.32, core, [-0.2, 0.55, -0.15]));                       // organic bits floating inside
  body.add(ball(0.2, core, [0.28, 0.8, -0.05]));
  body.add(ball(0.5, gel, [0, 0.12, 0], [1.9, 0.35, 1.9]));              // puddle at the base
  const head = grp("head", [0, 0.95, 0.55], body);
  const white = lam(0xf4fff0), black = glowMat(0x102010);
  for (const s of [-1, 1]) { head.add(ball(0.13, white, [s * 0.26, 0.12, 0.15])); head.add(ball(0.06, black, [s * 0.26, 0.12, 0.27])); }
  head.add(mesh(new THREE.TorusGeometry(0.2, 0.035, 6, 14, Math.PI), lam(0x155a20), [0, -0.12, 0.2], [0, 0, Math.PI]));   // grin
  for (const n of ["arm_L", "arm_R", "leg_L", "leg_R"]) grp(n, [0, 0.5, 0], body);                                  // (unused limbs — keeps the shared animation code happy)
  return root;
}

// ------------------------------------------------------------------ crimson chaos warrior: the chaos model re-coloured red with golden horns
export function makeCrimson() {
  const m = inst("chaos");
  const near = (c, hex) => { const k = new THREE.Color(hex); return Math.abs(c.r - k.r) + Math.abs(c.g - k.g) + Math.abs(c.b - k.b) < 0.04; };
  m.traverse((c) => {
    if (!c.isMesh) return;
    const col = c.material.color;
    if (/^horn/.test(c.name)) { col.setHex(0xffc72c); c.material.emissive && c.material.emissive.setHex(0x553300); c.userData.baseEmissive = c.material.emissive ? c.material.emissive.clone() : null; c.scale.multiplyScalar(1.45); }
    else if (near(col, 0x34344a)) col.setHex(0x8a1418);        // dark steel -> deep crimson
    else if (near(col, 0x52526c)) col.setHex(0xc4262c);        // plate -> bright red
    else if (near(col, 0x40405a)) col.setHex(0x9a1c22);        // shield
    else if (near(col, 0x4a1668)) col.setHex(0x4a0a10);        // cape
    else if (near(col, 0x8a32c0)) col.setHex(0xffc72c);        // purple trim / emblem -> gold
    else if (near(col, 0x1c1c26)) col.setHex(0x2a0a0c);
  });
  return m;
}

// ------------------------------------------------------------------ elven princess: elf.glb recoloured (gown) + a tiara
export function makePrincess() {
  const m = inst("elf");
  m.traverse((c) => {
    if (!c.isMesh) return;
    if (/^(skirt|bodice|arm_L_puff|arm_R_puff)$/.test(c.name)) c.material.color.setHex(c.name === "bodice" ? 0x6a3aa0 : 0x8a58c8);
    if (/^(hair_cap|hair_back|hair_tip|bangs|hair_side)$/.test(c.name)) c.material.color.setHex(0xf0f0ff);
    if (c.name === "skirt_trim" || c.name === "belt") c.material.color.setHex(0xf0e8a0);
  });
  const head = m.getObjectByName("head");
  head.add(mesh(new THREE.ConeGeometry(0.05, 0.14, 5), glowMat(0xffe070), [0, 0.5, -0.0]));
  return m;
}

// ------------------------------------------------------------------ the Tome of Horass
export function makeTome() {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(0.62, 0.12, 0.84), lam(0x5a1a22), [0, 0, 0]));                     // cover
  g.add(mesh(new THREE.BoxGeometry(0.56, 0.09, 0.78), lam(0xefe4c4), [0.02, 0, 0.0]));               // pages
  g.add(mesh(new THREE.BoxGeometry(0.07, 0.14, 0.86), lam(0x3a0e14), [-0.3, 0, 0]));                  // spine
  g.add(mesh(new THREE.BoxGeometry(0.2, 0.135, 0.2), glowMat(0x9a6cff), [0.0, 0.0, 0.0]));              // glowing rune
  g.add(mesh(new THREE.BoxGeometry(0.3, 0.14, 0.04), lam(0xd8b25a), [0.05, 0, 0.3]));
  g.add(mesh(new THREE.BoxGeometry(0.3, 0.14, 0.04), lam(0xd8b25a), [0.05, 0, -0.3]));
  g.rotation.z = 0;
  return g;
}

// ------------------------------------------------------------------ bookshelf: one merged vertex-coloured geometry, shared
let shelfGeo;
function bookshelfGeometry() {
  if (shelfGeo) return shelfGeo;
  const parts = [];
  const add = (w, h, d, x, y, z, color) => {
    const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z);
    const c = new THREE.Color(color), n = g.attributes.position.count, col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
    g.setAttribute("color", new THREE.BufferAttribute(col, 3)); parts.push(g.toNonIndexed());
  };
  const W = 2.3, H = 2.5, D = 0.55, wood = 0x5a3416, dwood = 0x3e2410;
  add(0.1, H, D, -W / 2 + 0.05, H / 2, 0, wood); add(0.1, H, D, W / 2 - 0.05, H / 2, 0, wood);
  add(W, H, 0.06, 0, H / 2, -D / 2 + 0.03, dwood);
  add(W, 0.1, D, 0, H - 0.05, 0, wood); add(W, 0.12, D, 0, 0.06, 0, wood);
  const levels = [0.12, 0.72, 1.32, 1.92];
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const palette = [0x7a1c28, 0x1c3a6a, 0x2a5a32, 0x6a4a1c, 0x4a2a6a, 0x8a6a2c, 0x3a3a42, 0x5a1a1a];
  levels.forEach((y0, li) => {
    if (li > 0) add(W - 0.2, 0.06, D - 0.08, 0, y0 - 0.03, 0.02, wood);
    let x = -W / 2 + 0.14;
    while (x < W / 2 - 0.2) {
      const w = 0.07 + rnd() * 0.08, h = 0.38 + rnd() * 0.17;
      if (rnd() < 0.08) { x += 0.14; continue; }                                       // gaps
      add(w, h, D - 0.18, x + w / 2, y0 + h / 2, 0.0, palette[Math.floor(rnd() * palette.length)]);
      x += w + 0.005;
    }
  });
  shelfGeo = mergeGeos(parts);
  return shelfGeo;
}
function mergeGeos(geos) {
  let n = 0; for (const g of geos) n += g.attributes.position.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3);
  let o = 0;
  for (const g of geos) {
    pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); col.set(g.attributes.color.array, o * 3); o += g.attributes.position.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.BufferAttribute(pos, 3)); out.setAttribute("normal", new THREE.BufferAttribute(nor, 3)); out.setAttribute("color", new THREE.BufferAttribute(col, 3));
  return out;
}
const shelfMat = new THREE.MeshLambertMaterial({ vertexColors: true });
/** front of the shelf faces +Z locally */
export function makeBookshelf() { return new THREE.Mesh(bookshelfGeometry(), shelfMat); }

// ------------------------------------------------------------------ persian rugs (canvas pattern, one texture per palette)
const RUGS = {
  crimson: ["#6e1420", "#d8b25a", "#1c2a5a", "#f0e2b8"],
  indigo: ["#1c2a5a", "#d8b25a", "#7a1c28", "#f0e2b8"],
  emerald: ["#1f5a3a", "#e0c070", "#6e1420", "#efe4c0"],
  amber: ["#8a4a14", "#f0d890", "#3a1a5a", "#f6ecd0"],
};
const rugTex = {};
export function rugTexture(name = "crimson") {
  if (rugTex[name]) return rugTex[name];
  const [base, gold, accent, cream] = RUGS[name] || RUGS.crimson;
  const W = 128, H = 192, c = document.createElement("canvas"); c.width = W; c.height = H; const g = c.getContext("2d");
  g.fillStyle = base; g.fillRect(0, 0, W, H);
  g.strokeStyle = gold; g.lineWidth = 5; g.strokeRect(4, 4, W - 8, H - 8);
  g.strokeStyle = cream; g.lineWidth = 2; g.strokeRect(12, 12, W - 24, H - 24);
  g.strokeStyle = accent; g.lineWidth = 6; g.strokeRect(20, 20, W - 40, H - 40);
  // fringe
  g.strokeStyle = cream; g.lineWidth = 2;
  for (let x = 6; x < W - 4; x += 5) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 4); g.moveTo(x, H); g.lineTo(x, H - 4); g.stroke(); }
  // field: small repeating motifs
  g.fillStyle = accent;
  for (let y = 36; y < H - 30; y += 22) for (let x = 36; x < W - 30; x += 22) { g.beginPath(); g.arc(x, y, 3.5, 0, 7); g.fill(); }
  g.fillStyle = gold; g.strokeStyle = gold; g.lineWidth = 2;
  const mx = W / 2, my = H / 2;
  // central medallion: nested diamonds
  for (const [r, f, col] of [[44, 1, accent], [34, 1, gold], [22, 1, base], [12, 1, cream], [5, 1, accent]]) {
    g.fillStyle = col; g.beginPath(); g.moveTo(mx, my - r * 1.35); g.lineTo(mx + r, my); g.lineTo(mx, my + r * 1.35); g.lineTo(mx - r, my); g.closePath(); g.fill();
  }
  for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { g.fillStyle = gold; g.beginPath(); g.arc(mx + dx * 40, my + dy * 62, 6, 0, 7); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return (rugTex[name] = t);
}
const rugMats = {};
/** rug covering wW x hD world units (x by z); the pattern's long axis follows the rug's long side */
export function makeRug(wW, hD, name) {
  const m = rugMats[name] || (rugMats[name] = new THREE.MeshLambertMaterial({ map: rugTexture(name), polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  const wide = wW > hD;
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(wW, hD), Math.max(wW, hD)), m);
  plane.rotation.x = -Math.PI / 2;
  const holder = new THREE.Group(); holder.add(plane); holder.rotation.y = wide ? Math.PI / 2 : 0; return holder;
}

// ------------------------------------------------------------------ Amulet of Rebirth (shop shelf model)
export function makeAmulet() {
  const g = new THREE.Group(), gold = lam(0xe0b030);
  const chain = mesh(new THREE.TorusGeometry(0.2, 0.012, 6, 24), gold, [0, 0.18, 0], [0.2, 0, 0], [1, 1.25, 1]); g.add(chain);
  g.add(mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.03, 20), gold, [0, -0.1, 0], [Math.PI / 2, 0, 0]));
  g.add(mesh(new THREE.TorusGeometry(0.1, 0.014, 6, 20), gold, [0, -0.1, 0.0], [0, 0, 0]));
  const gem = mesh(new THREE.OctahedronGeometry(0.065, 0), glowMat(0xff5a86), [0, -0.1, 0.03], [0, 0.4, 0], [1, 1.3, 0.7]); g.add(gem);
  for (const s of [-1, 1]) g.add(mesh(new THREE.ConeGeometry(0.035, 0.16, 4), gold, [s * 0.14, -0.04, 0], [0, 0, s * -1.0]));   // little wings
  g.children.forEach((ch) => { ch.position.y += 0.1; });   // keep the pendant clear of the shelf-front price tag
  g.scale.setScalar(0.6);
  return g;
}
