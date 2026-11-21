// DOM heads-up display helpers.
import { S } from "./state.js";
const $ = (id) => document.getElementById(id);
const el = { hearts: $("hearts"), mana: $("manaFill"), manaTxt: $("manaTxt"), gold: $("gold"), amulet: $("amulet"), title: $("lvlTitle"),
  obj: $("objective"), msg: $("msg"), prompt: $("prompt"), flash: $("flash"), boss: $("boss"), bossFill: $("bossFill"), bossName: $("bossName"),
  mini: $("minimap"), hud: $("hud"), bubble: $("bubble") };
let msgT = 0, lastHearts = "";
export const hud = {
  show(v) { el.hud.style.display = v ? "block" : "none"; },
  update() {
    let h = "";
    for (let i = 0; i < S.maxHp; i++) h += `<span class="${i < S.hp ? "full" : "empty"}">♥</span>`;
    if (h !== lastHearts) { el.hearts.innerHTML = h; lastHearts = h; }
    el.mana.style.width = `${(S.mana / S.maxMana) * 100}%`;
    el.manaTxt.textContent = `${S.mana} / ${S.maxMana}`;
    el.gold.textContent = S.gold;
    el.amulet.style.display = S.amulet ? "block" : "none";
  },
  title(t, o) { el.title.textContent = t; el.obj.textContent = o; },
  objective(o) { el.obj.textContent = o; },
  msg(text, sec = 4) { el.msg.textContent = text; el.msg.style.opacity = 1; msgT = sec; },
  tick(dt) { if (msgT > 0) { msgT -= dt; if (msgT <= 0) el.msg.style.opacity = 0; } const f = parseFloat(el.flash.dataset.a || 0); if (f > 0) { const n = Math.max(0, f - dt * 2.2); el.flash.dataset.a = n; el.flash.style.opacity = n; } },
  prompt(t) { el.prompt.textContent = t || ""; el.prompt.style.opacity = t ? 1 : 0; },
  flash(color = "255,0,0", a = 0.55) { el.flash.style.background = `radial-gradient(ellipse at center, rgba(${color},0) 30%, rgba(${color},0.9) 100%)`; el.flash.dataset.a = a; el.flash.style.opacity = a; },
  boss(name, frac) { if (name === null) { el.boss.style.display = "none"; return; } el.boss.style.display = "block"; el.bossName.textContent = name; el.bossFill.style.width = `${Math.max(0, frac) * 100}%`; },
  bubble(t) { el.bubble.style.display = t ? "block" : "none"; if (t) el.bubble.innerHTML = t; },
  minimap: el.mini,
};
