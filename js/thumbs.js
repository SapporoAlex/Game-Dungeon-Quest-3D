// Level-menu "screenshots": a tiny 3D render of each quest's goal (dragon, wizard, tome, princess, stairwell…) in the quest's colours.
// Rendered once with a private WebGL renderer and cached as JPEG data URLs.
import { THREE, TEX, inst } from "./engine.js";
import { makeWizard, makePrincess, makeTome, makeBookshelf } from "./models-extra.js";

const W = 880, H = 200;
let renderer;
const cache = new Map();

function backdrop(sc, theme) {
  sc.background = new THREE.Color(theme.fog); sc.fog = new THREE.FogExp2(theme.fog, 0.055);
  sc.add(new THREE.AmbientLight(theme.amb, 2.2));
  const key = new THREE.PointLight(0xffc880, 55, 0, 1.5); key.position.set(2.2, 3.2, 3.4); sc.add(key);
  const rim = new THREE.PointLight(0x8ab0ff, 14, 0, 1.6); rim.position.set(-3.5, 2.4, -1); sc.add(rim);
  const wt = TEX.wall.clone(); wt.repeat.set(7, 2); wt.needsUpdate = true;
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(22, 6.4), new THREE.MeshLambertMaterial({ map: wt, color: theme.wall })); wall.position.set(0, 3.2, -4.2); sc.add(wall);
  const ft = TEX.floor.clone(); ft.repeat.set(9, 5); ft.needsUpdate = true;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(22, 14), new THREE.MeshLambertMaterial({ map: ft, color: theme.floor })); floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, 2); sc.add(floor);
  for (const x of [-3.6, 3.6]) { const t = inst("torch"); t.position.set(x, 1.8, -4.1); sc.add(t); const l = new THREE.PointLight(0xff8a30, 10, 0, 1.8); l.position.set(x, 2.2, -3.4); sc.add(l); }
}
function glow(sc, color, x, y, z, size, op = 0.6) {
  const c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d");
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.35, "rgba(255,255,255,0.35)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), color, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false }));
  s.position.set(x, y, z); s.scale.set(size, size, 1); sc.add(s); return s;
}

function subject(sc, L) {
  const cam = { pos: [0, 1.7, 6.4], look: [0, 1.3, 0] };
  const kind = L.kind;
  if (kind === "dragon") {
    const m = inst("dragon"); m.scale.setScalar(0.62); m.position.set(0.3, 0, -0.6); m.rotation.y = -0.45; sc.add(m);
    glow(sc, 0xff5a10, -1.2, 0.6, 0.5, 4.5, 0.35); cam.pos = [0.2, 2.1, 7.8]; cam.look = [0, 1.5, 0];
  } else if (kind === "finale") {
    const m = inst("dragon"); m.scale.setScalar(0.5); m.position.set(-0.6, 0, -1.2); m.rotation.y = -0.5; sc.add(m);
    const m2 = inst("dragon"); m2.scale.setScalar(0.5); m2.position.set(2.8, 0, -1.4); m2.rotation.y = 0.6; sc.add(m2);
    const w = makeWizard(); w.scale.setScalar(1.0); w.position.set(1.1, 0, 0.6); sc.add(w);
    const aR = w.getObjectByName("arm_R"); if (aR) aR.rotation.x = -1.8;
    glow(sc, 0xb070ff, 1.6, 2.5, 1.0, 3, 0.5); glow(sc, 0xff4a10, 0, 0.6, 0, 6, 0.3); cam.pos = [0.8, 2.0, 8]; cam.look = [0.8, 1.3, 0];
  } else if (kind === "wizard") {
    const m = makeWizard(); m.scale.setScalar(1.15); m.position.set(0, 0, 0); m.rotation.y = -0.2; sc.add(m);
    const aR = m.getObjectByName("arm_R"); if (aR) aR.rotation.x = -1.8;
    glow(sc, 0xb070ff, 0.5, 2.7, 0.9, 3.2, 0.55); glow(sc, 0x39ff5c, 0, 2.0, 0.5, 0.9, 0.5); cam.pos = [0.2, 1.8, 4.6]; cam.look = [0, 1.55, 0];
  } else if (kind === "tome") {
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.7, 0.95, 8), new THREE.MeshLambertMaterial({ color: 0x6a6258 })); ped.position.set(0, 0.48, 0); sc.add(ped);
    const t = makeTome(); t.position.set(0, 1.18, 0); t.rotation.set(0.25, 0.5, 0); sc.add(t);
    glow(sc, 0xa070ff, 0, 1.4, 0.2, 3.4, 0.7);
    for (const [x, ry] of [[-2.4, 0.25], [2.4, -0.25]]) { const b = makeBookshelf(); b.position.set(x, 0, -3.5); b.rotation.y = ry; sc.add(b); }
    cam.pos = [0, 1.9, 4.8]; cam.look = [0, 1.15, 0];
  } else if (kind === "princess") {
    const m = makePrincess(); m.scale.setScalar(1.25); m.position.set(0, 0, 0.2); sc.add(m);
    glow(sc, 0xffe9a0, 0, 1.6, -0.6, 4.2, 0.4);
    for (let i = -5; i <= 5; i++) { const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 3.4, 6), new THREE.MeshLambertMaterial({ color: 0x2a2a30 })); bar.position.set(i * 0.5, 1.7, 1.6); sc.add(bar); }
    cam.pos = [0.1, 1.5, 4.2]; cam.look = [0, 1.25, 0];
  } else if (kind === "clear") {
    const g = [["chaos", 0, 0, 1.0], ["skeleton", -1.7, 0.5, 1.0], ["goblin", 1.6, 0.8, 1.1], ["goblin", -0.9, 1.4, 1.1], ["chaos", 2.7, -0.2, 1.0]];
    for (const [n, x, z, sc2] of g) { const m = inst(n); m.scale.setScalar(sc2); m.position.set(x, 0, z); m.rotation.y = -x * 0.12; sc.add(m); }
    glow(sc, 0xff3020, 0, 0.4, 1.4, 6, 0.25); cam.pos = [0.3, 1.9, 6.6]; cam.look = [0.2, 1.2, 0];
  } else {                                    // stairs: tutorial & escapes
    const m = inst("stairs"); m.position.set(0, 0, -1); sc.add(m);
    glow(sc, 0xffe9a0, 0, 1.9, -1.8, 6.5, 0.7);
    if (kind === "escape") for (const x of [-2.6, 2.6]) { const d = inst("door"); d.position.set(x, 0, -3.9); sc.add(d); }
    cam.pos = [0, 1.7, 6.2]; cam.look = [0, 1.2, -1];
  }
  return cam;
}

export function thumbFor(L) {
  if (cache.has(L.id)) return cache.get(L.id);
  let url = "";
  try {
    if (!renderer) { renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); renderer.setPixelRatio(1); renderer.setSize(W, H, false); }
    const theme = L.theme || { wall: 0xb0a89c, floor: 0xa8a8a8, fog: 0x0a0806, amb: 0x806a58 };
    const sc = new THREE.Scene(); backdrop(sc, theme);
    const cam = subject(sc, L), c = new THREE.PerspectiveCamera(46, W / H, 0.1, 80);
    const zoom = { finale: 0.55, dragon: 0.5, wizard: 0.8, princess: 0.8, tome: 0.7 }[L.kind] || 0.62;                                  // dolly in: the banner is a wide, shallow strip
    for (let k = 0; k < 3; k++) cam.pos[k] = cam.look[k] + (cam.pos[k] - cam.look[k]) * zoom;
    const shift = 2.9 * zoom + 0.6;                                    // frame the subject on the right so the title text sits on the dark left
    c.position.set(cam.pos[0] - shift, cam.pos[1], cam.pos[2]); c.lookAt(cam.look[0] - shift, cam.look[1], cam.look[2]);
    renderer.render(sc, c); url = renderer.domElement.toDataURL("image/jpeg", 0.8);
    sc.traverse((o) => { o.geometry?.dispose?.(); });
  } catch (e) { console.warn("thumbnail failed", L.id, e); }
  cache.set(L.id, url); return url;
}
