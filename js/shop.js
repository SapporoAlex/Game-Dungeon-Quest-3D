// The between-levels 3D shop: elf shopkeeper, hovering items on shelves.
import { THREE, camera, TEX, inst, parts, glowSprite, labelSprite, keys, mouse, pressed, lock, sfx, moveInput } from "./engine.js";
import { S, save, SHOP_ITEMS, moveSpeed } from "./state.js";
import { LEVELS } from "./levels.js";
import { hud } from "./hud.js";

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const ROOM = { x0: -6, x1: 6, z0: -8, z1: 4, h: 3.7 };
const BLOCK = [{ x0: -1.95, x1: 1.95, z0: -8, z1: -3.55 }];   // counter + keeper's nook
const GREET = ["Welcome, traveler! Lirael's Emporium has everything a brave adventurer needs.", "Ooh, you survived! Do come in — mind the dungeon mud on my floor."];
const BUY = ["A fine choice! May it serve you well.", "Pleasure doing business with you!", "That one's my favourite, too.", "Thank you kindly! Come back anytime."];
const POOR = ["Oh dear… you're a little short on gold.", "Come back when your purse is heavier, dear."];
const FULL = ["You couldn't possibly carry any more of those!", "You already have all the benefit that one can give."];

export class Shop {
  constructor(nextIdx, onExit) {
    this.nextIdx = nextIdx; this.onExit = onExit; this.t = 0; this.state = "play";
    this.scene = new THREE.Scene(); this.scene.background = new THREE.Color(0x120c06);
    this.scene.fog = new THREE.FogExp2(0x120c06, 0.03);
    this.p = { x: 0, z: 2.6, yaw: 0, pitch: -0.05, bob: 0, r: 0.4 };
    this.items = []; this.wave = 0; this.speech = 0;
    this.build();
    this.scene.add(camera);
    hud.show(true); hud.title("Lirael's Emporium", "Aim at an item and press E to buy. Leave through the door on the right to return to camp."); hud.boss(null); hud.prompt(""); hud.msg("Spend your gold on upgrades — items hover on the shelves.", 5); hud.minimap.style.display = "none";
    this.speak(pick(GREET), 6); this.wave = 2.2;
  }
  build() {
    const s = this.scene;
    s.add(new THREE.AmbientLight(0xffd8a8, 1.7));
    for (const [x, y, z, i] of [[-4, 3.1, -2, 26], [4, 3.1, -2, 26], [0, 3.1, 2.5, 22], [0, 3.1, -5.5, 24]]) { const l = new THREE.PointLight(0xffb060, i, 0, 1.5); l.position.set(x, y, z); s.add(l); }
    const W = ROOM.x1 - ROOM.x0, D = ROOM.z1 - ROOM.z0, cxr = (ROOM.x0 + ROOM.x1) / 2, czr = (ROOM.z0 + ROOM.z1) / 2;
    const mk = (tx, w, h, rx, ry, pos, rot, col = 0xffffff) => {
      const t = tx.clone(); t.repeat.set(w, h); t.needsUpdate = true;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(rx, ry), new THREE.MeshLambertMaterial({ map: t, color: col }));
      m.position.set(...pos); m.rotation.set(...rot); s.add(m); return m;
    };
    mk(TEX.planks, 6, 6, W, D, [cxr, 0, czr], [-Math.PI / 2, 0, 0]);
    mk(TEX.planks, 6, 6, W, D, [cxr, ROOM.h, czr], [Math.PI / 2, 0, 0], 0x886644);
    mk(TEX.plaster, 6, 1.5, W, ROOM.h, [cxr, ROOM.h / 2, ROOM.z0], [0, 0, 0]);
    mk(TEX.plaster, 6, 1.5, W, ROOM.h, [cxr, ROOM.h / 2, ROOM.z1], [0, Math.PI, 0]);
    mk(TEX.plaster, 6, 1.5, D, ROOM.h, [ROOM.x0, ROOM.h / 2, czr], [0, Math.PI / 2, 0]);
    mk(TEX.plaster, 6, 1.5, D, ROOM.h, [ROOM.x1, ROOM.h / 2, czr], [0, -Math.PI / 2, 0]);
    mk(TEX.rug, 1, 1, 4, 6, [0, 0.015, -0.2], [-Math.PI / 2, 0, 0]);
    for (const x of [-4.2, 0, 4.2]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, D), new THREE.MeshLambertMaterial({ color: 0x4a2c12 })); b.position.set(x, ROOM.h - 0.18, czr); s.add(b); }

    // counter + elf
    const counter = inst("counter"); counter.position.set(0, 0, -4.2); s.add(counter);
    this.elf = inst("elf"); this.elf.position.set(0, 0, -5.35); this.elf.scale.setScalar(1.05); s.add(this.elf);
    this.ep = parts(this.elf, ["body", "head", "arm_L", "arm_R"]);
    const lantern = glowSprite(0xffd890, 1.4, 0.55); lantern.position.set(0, 2.4, -5.2); s.add(lantern);
    const ban = inst("banner"); ban.position.set(0, 0.5, -7.9); ban.scale.setScalar(1.4); s.add(ban);

    // shelves with hovering items
    const shelves = [
      { x: -3.8, z: -7.65, yaw: 0, slots: [[0, -0.55, 0], [1, 0.55, 0], [2, -0.55, 1], [3, 0.55, 1]] },
      { x: 3.8, z: -7.65, yaw: 0, slots: [[4, -0.55, 0], [5, 0.55, 0]] },
    ];
    for (const sh of shelves) {
      const m = inst("shelf"); m.position.set(sh.x, 0, sh.z); m.rotation.y = sh.yaw; s.add(m);
      for (const [idx, off, row] of sh.slots) {
        const def = SHOP_ITEMS[idx];
        const boardTop = row ? 1.69 : 0.94;
        const model = inst(def.model); model.scale.setScalar(1.7);
        const x = sh.x + off, z = sh.z + 0.05, y = boardTop + 0.32;
        s.add(model);
        const glow = glowSprite(0xffe8a0, 1.3, 0.5); s.add(glow);
        const tag = labelSprite([def.name, `${def.price} gold`]); tag.scale.set(0.95, 0.36, 1); tag.position.set(x, boardTop + 0.12, z + 0.38); s.add(tag);
        this.items.push({ def, model, glow, x, y, z, ph: rand(0, 6), tag });
      }
    }
    // decor
    for (const [t, x, z] of [["barrel", -5.2, -7.2], ["barrel", 5.3, -6.9], ["crate", 5.2, -5.6], ["crate", -5.2, -6.1], ["barrel", -5.3, 3.2], ["crate", 5.3, 3.2], ["chest", -5.1, 1.2]]) {
      const m = inst(t); m.position.set(x, 0, z); m.rotation.y = t === "chest" ? Math.PI / 2 : rand(0, 6); s.add(m);
    }
    this.flames = [];
    for (const [x, z, yaw] of [[-5.9, -2, Math.PI / 2], [-5.9, 1.5, Math.PI / 2], [5.9, -2.6, -Math.PI / 2], [-2.5, -7.9, 0], [2.5, -7.9, 0]]) {
      const m = inst("torch"); m.position.set(x, 1.7, z); m.rotation.y = yaw; s.add(m); this.flames.push(m.getObjectByName("flame"));
    }
    // exit door on the right wall
    this.door = inst("door"); this.door.position.set(5.86, 0, 0.8); this.door.rotation.y = -Math.PI / 2; s.add(this.door);
    const sign = labelSprite(["EXIT ▶", "Back to camp"], "#9bffb0"); sign.scale.set(1.5, 0.56, 1); sign.position.set(5.4, 3.3, 0.8); s.add(sign);
    const g = glowSprite(0x80ff90, 3, 0.25); g.position.set(5.5, 1.6, 0.8); s.add(g);
  }
  speak(text, sec = 5) { hud.bubble(`<b>Lirael the Elf:</b> ${text}`); this.speech = sec; }

  collide(x, z, r) {
    if (x < ROOM.x0 + 0.5 + r || x > ROOM.x1 - 0.5 - r || z < ROOM.z0 + 0.6 || z > ROOM.z1 - 0.5) return true;
    for (const b of BLOCK) { const nx = Math.max(b.x0, Math.min(x, b.x1)), nz = Math.max(b.z0, Math.min(z, b.z1)); if ((x - nx) ** 2 + (z - nz) ** 2 < r * r) return true; }
    return false;
  }
  aimed() {
    const dir = new THREE.Vector3(); camera.getWorldDirection(dir);
    const o = camera.position; let best = null, bd = 1e9;
    for (const it of this.items) {
      const v = new THREE.Vector3(it.x - o.x, it.y - o.y, it.z - o.z), t = v.dot(dir);
      if (t < 0.3 || t > 8) continue;
      const perp = v.clone().addScaledVector(dir, -t).length();
      if (perp < 0.5 && t < bd) { bd = t; best = it; }
    }
    return best;
  }
  update(dt) {
    this.t += dt; const p = this.p;
    p.yaw -= mouse.dx * 0.0024; p.pitch = Math.max(-0.9, Math.min(0.9, p.pitch - mouse.dy * 0.0024));
    p.yaw += ((keys.ArrowLeft ? 1 : 0) - (keys.ArrowRight ? 1 : 0)) * 2.4 * dt;
    const [f, s] = moveInput();
    let mx = -Math.sin(p.yaw) * f + Math.cos(p.yaw) * s, mz = -Math.cos(p.yaw) * f - Math.sin(p.yaw) * s; const ml = Math.hypot(mx, mz);
    if (ml > 0) { const k = Math.min(1, ml); mx /= ml; mz /= ml; const sp = moveSpeed() * 0.8 * k; if (!this.collide(p.x + mx * sp * dt, p.z, p.r)) p.x += mx * sp * dt; if (!this.collide(p.x, p.z + mz * sp * dt, p.r)) p.z += mz * sp * dt; p.bob += dt * sp * 1.7; }
    camera.position.set(p.x, 1.55 + Math.sin(p.bob * 2) * 0.03, p.z); camera.rotation.set(p.pitch, p.yaw, 0);

    for (const it of this.items) {
      it.model.position.set(it.x, it.y - 0.2 + Math.sin(this.t * 2 + it.ph) * 0.06, it.z); it.model.rotation.y = this.t * 1.2 + it.ph;
      it.glow.position.set(it.x, it.y + 0.05, it.z); it.glow.material.opacity = 0.35 + Math.sin(this.t * 3 + it.ph) * 0.12;
      it.soldOut = it.def.max();
    }
    for (const f of this.flames) { const k = 1 + Math.sin(this.t * 14 + f.id) * 0.2; f.scale.set(k, 1 + Math.sin(this.t * 17 + f.id) * 0.25, k); }
    // elf animation
    const E = this.ep, e = this.elf;
    const want = Math.atan2(p.x - e.position.x, p.z - e.position.z); e.rotation.y += Math.atan2(Math.sin(want - e.rotation.y), Math.cos(want - e.rotation.y)) * Math.min(1, dt * 4);
    e.rotation.y = Math.max(-0.7, Math.min(0.7, e.rotation.y));
    E.body.position.y = Math.sin(this.t * 1.8) * 0.012; E.head.rotation.z = Math.sin(this.t * 1.1) * 0.04; E.head.rotation.x = 0.05;
    E.arm_L.rotation.z = 0.12; E.arm_L.rotation.x = -0.15;
    if (this.wave > 0) { this.wave -= dt; E.arm_R.rotation.z = -2.5 + Math.sin(this.t * 10) * 0.35; E.arm_R.rotation.x = 0; }
    else { E.arm_R.rotation.z += (-0.12 - E.arm_R.rotation.z) * Math.min(1, dt * 6); E.arm_R.rotation.x = -0.15; }
    if (this.speech > 0) { this.speech -= dt; if (this.speech <= 0) hud.bubble(null); }

    // aim + buy
    const a = this.aimed();
    const doorD = Math.hypot(p.x - 5.86, p.z - 0.8);
    let prompt = "";
    if (a) prompt = a.soldOut ? `${a.def.name} — you have the maximum` : `E — Buy ${a.def.name} (${a.def.price} gold)  ·  ${a.def.desc}`;
    else if (doorD < 3.2) prompt = "E — Leave the shop (back to camp)";
    hud.prompt(prompt);
    if (pressed("KeyE") || (mouse.leftPressed && (lock.active || lock.failed))) {
      if (a) this.buy(a);
      else if (doorD < 3.2) { sfx.door(); this.onExit(); return; }
    }
    if (pressed("KeyQ") && S.potions > 0 && S.hp < S.maxHp) { S.potions--; S.hp = S.maxHp; sfx.drink(); }
    hud.update(); hud.tick(dt);
      }
  buy(it) {
    const d = it.def;
    if (d.max()) { sfx.deny(); this.speak(pick(FULL)); return; }
    if (S.gold < d.price) { sfx.deny(); this.speak(pick(POOR)); return; }
    S.gold -= d.price; d.buy(); save(); sfx.buy(); this.wave = 1.6; hud.flash("255,220,100", 0.25);
    this.speak(`${pick(BUY)} <i>(${d.name}: ${d.desc})</i>`);
  }
  dispose() { hud.bubble(null); hud.prompt(""); hud.minimap.style.display = "block"; }
}
