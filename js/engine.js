// Shared engine bits: renderer, textures, model loading, audio, input.
import * as THREE from "three";
import { GLTFLoader } from "../vendor/GLTFLoader.js";
import { MUSIC, SFX } from "./audio-config.js";
export { THREE };

export const T = 3;          // world size of one map tile
export const WALL_H = 3.2;   // wall height

// ------------------------------------------------------------------ renderer
export const renderer = new THREE.WebGLRenderer({ antialias: true });
export const IS_TOUCH = window.matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;
renderer.setPixelRatio(Math.min(window.devicePixelRatio, IS_TOUCH ? 1.5 : 2));
renderer.setClearColor(0x050404);
document.getElementById("game").appendChild(renderer.domElement);
export const camera = new THREE.PerspectiveCamera(74, 1, 0.05, 120);
camera.rotation.order = "YXZ";
function resize() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", resize);
resize();

// ------------------------------------------------------------------ procedural pixel textures
function canvasTex(size, draw) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  draw(c.getContext("2d"), size);
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestMipmapLinearFilter;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
const rnd = (a, b) => a + Math.random() * (b - a);
function noisy(g, x, y, w, h, base, amt) {
  const [r, gg, b] = base;
  for (let i = 0; i < w; i += 2) for (let j = 0; j < h; j += 2) {
    const v = rnd(-amt, amt);
    g.fillStyle = `rgb(${r + v | 0},${gg + v | 0},${b + v | 0})`;
    g.fillRect(x + i, y + j, 2, 2);
  }
}
export const TEX = {
  wall: canvasTex(64, (g, s) => {
    g.fillStyle = "#2a2622"; g.fillRect(0, 0, s, s);
    for (let row = 0; row < 4; row++) {
      const off = row % 2 ? 16 : 0;
      for (let k = -1; k < 3; k++) {
        const x = k * 32 + off, y = row * 16;
        const v = rnd(-14, 14);
        noisy(g, Math.max(0, x + 1), y + 1, Math.min(30, s - Math.max(0, x + 1)), 14, [118 + v, 112 + v, 104 + v], 12);
      }
    }
  }),
  floor: canvasTex(64, (g, s) => {
    g.fillStyle = "#1c1a18"; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      const v = rnd(-10, 10);
      noisy(g, i * 32 + 1, j * 32 + 1, 30, 30, [92 + v, 88 + v, 84 + v], 10);
    }
  }),
  ceil: canvasTex(64, (g, s) => {
    g.fillStyle = "#1a1410"; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 4; i++) noisy(g, 0, i * 16 + 1, s, 14, [74 + i * 3, 56, 40], 8);
  }),
  planks: canvasTex(64, (g, s) => {
    g.fillStyle = "#241508"; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 4; i++) { const v = rnd(-12, 12); noisy(g, 0, i * 16 + 1, s, 14, [146 + v, 100 + v, 56 + v], 9); }
  }),
  plaster: canvasTex(64, (g, s) => {
    noisy(g, 0, 0, s, s, [200, 184, 150], 10);
    g.fillStyle = "#5a3a1c"; g.fillRect(0, 0, s, 6); g.fillRect(0, s - 6, s, 6);
  }),
  rug: canvasTex(32, (g, s) => {
    g.fillStyle = "#7a1c28"; g.fillRect(0, 0, s, s);
    g.strokeStyle = "#e0b030"; g.lineWidth = 2; g.strokeRect(2, 2, s - 4, s - 4);
    g.fillStyle = "#e0b030"; g.fillRect(14, 14, 4, 4);
  }),
};
export function glowTexture() {
  const c = document.createElement("canvas"); c.width = c.height = 64;
  const g = c.getContext("2d");
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.35, "rgba(255,255,255,0.35)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}
export const GLOW = glowTexture();
export function glowSprite(color, size, opacity = 0.9) {
  const m = new THREE.SpriteMaterial({ map: GLOW, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false });
  const s = new THREE.Sprite(m); s.scale.set(size, size, 1); return s;
}
export function labelSprite(lines, color = "#ffe9a8") {
  const c = document.createElement("canvas"); c.width = 256; c.height = 96;
  const g = c.getContext("2d");
  g.fillStyle = "rgba(10,6,2,0.65)"; g.beginPath(); g.roundRect(4, 4, 248, 88, 14); g.fill();
  g.strokeStyle = "#d8b25a"; g.lineWidth = 3; g.stroke();
  g.textAlign = "center"; g.fillStyle = color;
  g.font = "bold 28px 'Trebuchet MS',sans-serif"; g.fillText(lines[0], 128, 42);
  g.font = "bold 24px 'Trebuchet MS',sans-serif"; g.fillStyle = "#ffd24a"; g.fillText(lines[1] || "", 128, 76);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false }));
  s.scale.set(1.3, 0.49, 1); return s;
}

// ------------------------------------------------------------------ models (built in Blender -> glb)
const NAMES = ["goblin", "skeleton", "chaos", "dragon", "elf", "crate", "barrel", "chest", "table", "door", "stairs", "plate",
  "arrow", "coin", "sword", "torch", "shelf", "counter", "banner", "potion_health", "potion_speed", "potion_attack",
  "potion_maxhealth", "potion_search", "potion_mana"];
export const MODELS = {};
export async function loadModels(onProgress) {
  const loader = new GLTFLoader();
  let n = 0;
  await Promise.all(NAMES.map((name) => loader.loadAsync(`./models/${name}.glb`).then((g) => {
    MODELS[name] = g.scene; onProgress && onProgress(++n, NAMES.length);
  })));
}
/** clone a model with its own materials (so hit-flashes don't leak between instances) */
export function inst(name) {
  const o = MODELS[name].clone(true);
  o.traverse((c) => {
    if (c.isMesh) {
      c.material = c.material.clone();
      c.userData.baseEmissive = c.material.emissive ? c.material.emissive.clone() : null;
      c.userData.baseEI = c.material.emissiveIntensity;
    }
  });
  return o;
}
export function parts(o, names) {
  const p = {};
  for (const n of names) p[n] = o.getObjectByName(n);
  return p;
}
export function flashModel(o, amount) {   // amount 0..1 red flash
  o.traverse((c) => {
    if (c.isMesh && c.material.emissive) {
      c.material.emissive.copy(c.userData.baseEmissive || new THREE.Color(0));
      c.material.emissiveIntensity = c.userData.baseEI ?? 1;
      if (amount > 0.01) { c.material.emissive.setRGB(1, 0.15, 0.1); c.material.emissiveIntensity = amount * 1.2; }
    }
  });
}

// ------------------------------------------------------------------ audio
const AC = new (window.AudioContext || window.webkitAudioContext)();
export function resumeAudio() { if (AC.state !== "running") AC.resume(); }
function tone(f, d, type = "square", v = 0.08, slide = 0, delay = 0) {
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = type; const t = AC.currentTime + delay;
  o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, f + slide), t + d);
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(g).connect(AC.destination); o.start(t); o.stop(t + d + 0.02);
}
function noise(d, v = 0.2, f0 = 3000, f1 = 300) {
  const n = AC.sampleRate * d | 0, buf = AC.createBuffer(1, n, AC.sampleRate), data = buf.getChannelData(0);
  for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = AC.createBufferSource(); s.buffer = buf;
  const fl = AC.createBiquadFilter(); fl.type = "lowpass"; fl.frequency.setValueAtTime(f0, AC.currentTime); fl.frequency.exponentialRampToValueAtTime(f1, AC.currentTime + d);
  const g = AC.createGain(); g.gain.value = v;
  s.connect(fl).connect(g).connect(AC.destination); s.start();
}
const files = {};
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
/** play a configured sample for `name`; returns true if a file was played (so synth fallback is skipped) */
function sample(name) {
  const c = SFX[name];
  if (!c || !c.files || !c.files.length) return false;
  const src = pick(c.files);
  const a = files[src] || (files[src] = new Audio(src));
  const n = a.cloneNode(); n.volume = c.volume ?? 0.5; n.play().catch(() => {});
  return true;
}
const synth = {
  swing() { noise(0.16, 0.18, 4000, 500); },
  door() { noise(0.45, 0.22, 600, 120); tone(90, 0.4, "sawtooth", 0.04, -30); },
  zap() { noise(0.28, 0.3, 9000, 800); tone(900, 0.25, "sawtooth", 0.07, -700); tone(1400, 0.15, "square", 0.04, -1000, 0.02); },
  coin() { tone(988, 0.08, "square", 0.06); tone(1319, 0.14, "square", 0.06, 0, 0.07); },
  pickup() { tone(520, 0.1, "triangle", 0.1); tone(780, 0.16, "triangle", 0.1, 0, 0.08); },
  mana() { tone(440, 0.4, "sine", 0.12, 660); tone(660, 0.4, "sine", 0.08, 660, 0.05); },
  drink() { noise(0.3, 0.12, 800, 200); tone(300, 0.3, "sine", 0.1, 300); },
  buy() { tone(784, 0.1, "square", 0.07); tone(1047, 0.1, "square", 0.07, 0, 0.09); tone(1568, 0.2, "square", 0.07, 0, 0.18); },
  deny() { tone(160, 0.25, "sawtooth", 0.08, -60); },
  fire() { noise(0.5, 0.25, 1500, 150); tone(120, 0.5, "sawtooth", 0.08, 60); },
  arrow() { noise(0.2, 0.2, 5000, 1500); },
  roar() { noise(0.9, 0.35, 900, 90); tone(70, 0.9, "sawtooth", 0.15, -25); },
  stairs() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.3, "triangle", 0.1, 0, i * 0.12)); },
  smash() { noise(0.3, 0.3, 2500, 200); },
};
export const sfx = {};
for (const name of Object.keys(SFX)) sfx[name] = () => { if (!sample(name) && synth[name]) synth[name](); };
let music;
export function startMusic() {
  if (music || !MUSIC.src) return;
  music = new Audio(MUSIC.src);
  music.loop = true; music.volume = MUSIC.volume ?? 0.2; music.play().catch(() => { music = null; });
}

// ------------------------------------------------------------------ input
export const keys = {};
const pressedKeys = new Set();
export const mouse = { dx: 0, dy: 0, left: false, right: false, leftPressed: false, rightPressed: false };
export const lock = { active: false, failed: false };
export function pressed(code) { return pressedKeys.has(code); }
export function endFrame() { pressedKeys.clear(); mouse.leftPressed = mouse.rightPressed = false; mouse.dx = mouse.dy = 0; }
window.addEventListener("keydown", (e) => {
  if (e.repeat) return;
  keys[e.code] = true; pressedKeys.add(e.code);
  if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Tab"].includes(e.code)) e.preventDefault();
});
window.addEventListener("keyup", (e) => { keys[e.code] = false; });
window.addEventListener("blur", () => { for (const k in keys) keys[k] = false; });
renderer.domElement.addEventListener("contextmenu", (e) => e.preventDefault());
window.addEventListener("mousedown", (e) => {
  resumeAudio();
  if (e.button === 0) { mouse.left = true; mouse.leftPressed = true; }
  if (e.button === 2) { mouse.right = true; mouse.rightPressed = true; }
});
window.addEventListener("mouseup", (e) => { if (e.button === 0) mouse.left = false; if (e.button === 2) mouse.right = false; });
window.addEventListener("mousemove", (e) => { if (lock.active) { mouse.dx += e.movementX; mouse.dy += e.movementY; } });
document.addEventListener("pointerlockchange", () => { lock.active = document.pointerLockElement === renderer.domElement; lock.onChange && lock.onChange(lock.active); });
document.addEventListener("pointerlockerror", () => { lock.failed = true; });
export function requestLock() {
  try { const p = renderer.domElement.requestPointerLock(); if (p && p.catch) p.catch(() => { lock.failed = true; }); } catch (e) { lock.failed = true; }
}
export function exitLock() { if (document.pointerLockElement) document.exitPointerLock(); }

// ------------------------------------------------------------------ touch + gamepad input
const clamp1 = (v) => Math.max(-1, Math.min(1, v));
export const touch = { move: { x: 0, y: 0 } };
export const pad = { active: false, x: 0, y: 0, up: false, down: false, a: false };
/** unified movement input: [forward, strafe] each in -1..1 (keyboard + gamepad stick + touch joystick) */
export function moveInput() {
  const f = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0) - pad.y - touch.move.y;
  const s = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0) + pad.x + touch.move.x;
  return [clamp1(f), clamp1(s)];
}
export function rumble(ms = 150, strong = 0.6, weak = 0.4) {
  try {
    const gp = [...(navigator.getGamepads?.() || [])].find((g) => g && g.connected);
    if (gp?.vibrationActuator?.playEffect) gp.vibrationActuator.playEffect("dual-rumble", { duration: ms, strongMagnitude: strong, weakMagnitude: weak });
    else if (IS_TOUCH && navigator.vibrate) navigator.vibrate(ms);
  } catch (e) {}
}
function pause() { window.dispatchEvent(new CustomEvent("dq-pause")); }

// Gamepad (Xbox / standard mapping): LS move · RS look · RT/RB/X sword · LT/LB/B lightning · A use · Y potion · Start pause
let prev = [], lastStickY = 0, lastPoll = performance.now();
export function pollGamepad() {
  const now = performance.now(), dt = Math.min(0.05, (now - lastPoll) / 1000); lastPoll = now;
  const gp = [...(navigator.getGamepads?.() || [])].find((g) => g && g.connected);
  pad.up = pad.down = pad.a = false;
  if (!gp) { pad.active = false; pad.x = pad.y = 0; return; }
  pad.active = true;
  const dz = (v) => (Math.abs(v) < 0.18 ? 0 : (v - Math.sign(v) * 0.18) / 0.82);
  pad.x = dz(gp.axes[0] || 0); pad.y = dz(gp.axes[1] || 0);
  const rx = dz(gp.axes[2] || 0), ry = dz(gp.axes[3] || 0);
  mouse.dx += rx * Math.abs(rx) * 1000 * dt; mouse.dy += ry * Math.abs(ry) * 700 * dt;
  const b = (i) => !!gp.buttons[i]?.pressed, edge = (i) => b(i) && !prev[i];
  if (b(7) || b(5) || b(2)) pressedKeys.add("Space");                // hold to keep swinging
  if (edge(6) || edge(4) || edge(1) || (gp.buttons[6]?.value > 0.5 && !prev.lt)) pressedKeys.add("KeyF");
  if (edge(0)) { pressedKeys.add("KeyE"); pad.a = true; }
  if (edge(3)) pressedKeys.add("KeyQ");
  if (edge(9)) pause();
  if (edge(12) || (pad.y < -0.6 && lastStickY >= -0.6)) pad.up = true;
  if (edge(13) || (pad.y > 0.6 && lastStickY <= 0.6)) pad.down = true;
  lastStickY = pad.y;
  prev = gp.buttons.map((x) => x.pressed); prev.lt = (gp.buttons[6]?.value || 0) > 0.5;
}

// Touch controls (phones / tablets): left-side joystick, right-side look drag, action buttons
if (IS_TOUCH) {
  document.body.classList.add("touch");
  lock.failed = true;                       // no pointer-lock on touch: clicks/taps always count
  const $ = (id) => document.getElementById(id);
  const stick = $("stick"), knob = $("knob"), moveZone = $("moveZone"), lookZone = $("lookZone");
  let mId = null, mOrigin = null, lId = null, lLast = null;
  const R = 55;
  const setStick = (dx, dy) => {
    const l = Math.hypot(dx, dy), k = l > R ? R / l : 1;
    touch.move.x = (dx * k) / R; touch.move.y = (dy * k) / R;
    knob.style.transform = `translate(${dx * k}px,${dy * k}px)`;
  };
  moveZone.addEventListener("touchstart", (e) => {
    e.preventDefault(); resumeAudio();
    const t = e.changedTouches[0]; if (mId !== null) return;
    mId = t.identifier; mOrigin = [t.clientX, t.clientY];
    stick.style.display = "block"; stick.style.left = `${t.clientX - 70}px`; stick.style.top = `${t.clientY - 70}px`; setStick(0, 0);
  }, { passive: false });
  moveZone.addEventListener("touchmove", (e) => {
    e.preventDefault();
    for (const t of e.changedTouches) if (t.identifier === mId) setStick(t.clientX - mOrigin[0], t.clientY - mOrigin[1]);
  }, { passive: false });
  const endMove = (e) => { for (const t of e.changedTouches) if (t.identifier === mId) { mId = null; touch.move.x = touch.move.y = 0; stick.style.display = "none"; } };
  moveZone.addEventListener("touchend", endMove); moveZone.addEventListener("touchcancel", endMove);
  lookZone.addEventListener("touchstart", (e) => { e.preventDefault(); resumeAudio(); const t = e.changedTouches[0]; if (lId === null) { lId = t.identifier; lLast = [t.clientX, t.clientY]; } }, { passive: false });
  lookZone.addEventListener("touchmove", (e) => {
    e.preventDefault();
    for (const t of e.changedTouches) if (t.identifier === lId) { mouse.dx += (t.clientX - lLast[0]) * 1.5; mouse.dy += (t.clientY - lLast[1]) * 1.5; lLast = [t.clientX, t.clientY]; }
  }, { passive: false });
  const endLook = (e) => { for (const t of e.changedTouches) if (t.identifier === lId) lId = null; };
  lookZone.addEventListener("touchend", endLook); lookZone.addEventListener("touchcancel", endLook);
  // buttons (hold to repeat)
  const bind = (id, code, repeat) => {
    const el = $(id); let timer = null;
    const fire = () => pressedKeys.add(code);
    el.addEventListener("touchstart", (e) => { e.preventDefault(); resumeAudio(); fire(); el.classList.add("down"); if (repeat) timer = setInterval(fire, 110); }, { passive: false });
    const end = () => { el.classList.remove("down"); clearInterval(timer); };
    el.addEventListener("touchend", end); el.addEventListener("touchcancel", end);
  };
  bind("tSword", "Space", true); bind("tBolt", "KeyF", false); bind("tUse", "KeyE", false); bind("tPotion", "KeyQ", false);
  $("tPause").addEventListener("touchstart", (e) => { e.preventDefault(); pause(); }, { passive: false });
  window.addEventListener("contextmenu", (e) => e.preventDefault());
}
