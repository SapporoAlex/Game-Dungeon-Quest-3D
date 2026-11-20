// Game flow:  title -> (new game | continue) -> camp <-> shop / quests.
// Progress (inventory + furthest quest) is autosaved when a quest is completed, when you buy something
// and when you reach camp. "Continue" always drops you at camp.
import { renderer, camera, loadModels, endFrame, lock, requestLock, exitLock, resumeAudio, startMusic, pollGamepad, pad, IS_TOUCH } from "./engine.js";
import { LEVELS } from "./levels.js";
import { S, save, load, hasSave, resetAll } from "./state.js";
import { hud } from "./hud.js";
import { Play } from "./game.js";
import { Shop } from "./shop.js";

const screen = document.getElementById("screen");
let cur = null, mode = "title", paused = false, focusIdx = 0;

function show(html, wire) {
  screen.style.display = "flex"; screen.innerHTML = html; focusIdx = 0;
  screen.querySelectorAll("[data-act]").forEach((b) => b.addEventListener("click", () => { resumeAudio(); startMusic(); wire[b.dataset.act](b.dataset.arg); }));
}
function hide() { screen.style.display = "none"; screen.innerHTML = ""; }
const HELP = IS_TOUCH
  ? `<div class="help"><b>Left thumb</b><span>Move</span><b>Right side drag</b><span>Look</span><b>⚔ / ⚡</b><span>Sword / lightning bolt</span><b>E / 🧪</b><span>Use (doors, crates, shop) / drink potion</span></div>`
  : `<div class="help"><b>W A S D</b><span>Move</span><b>Mouse</b><span>Look (click to capture)</span><b>Left click / Space</b><span>Short sword</span>
<b>Right click / F</b><span>Lightning bolt (uses magic)</span><b>E</b><span>Open doors · search crates, tables, chests · buy</span><b>Q</b><span>Drink health potion</span>
<b>Shift</b><span>Sprint</span></div>
<div class="help"><b>🎮 Controller</b><span>Left stick move · Right stick look · RT / X sword · LT / B lightning · A use · Y potion · Start pause · D-pad / A in menus</span></div>`;
const fsBtn = document.fullscreenEnabled ? `<button class="btn small" data-act="fs">⛶ Fullscreen</button>` : "";
const disposeCur = () => { if (cur) { cur.dispose && cur.dispose(); cur = null; } };

// ---------------------------------------------------------------- title
function title() {
  exitLock(); disposeCur(); mode = "title"; paused = false; hud.show(false);
  let cont = "";
  if (hasSave()) {
    load();
    const next = Math.min(S.levelIdx, LEVELS.length - 1);
    const sub = S.levelIdx >= LEVELS.length ? "All quests complete" : `${LEVELS[next].title} · ${S.gold} gold`;
    cont = `<button class="btn" data-act="cont">Continue<br><small>${sub}</small></button>`;
  }
  show(`<h1>DUNGEON QUEST 3D</h1><p>Hack, blast and loot your way through the dungeon. Smash crates for gold and green magic bottles — then spend your spoils at Lirael's shop.</p>
    <div><button class="btn" data-act="new">New Game</button>${cont}</div><div>${fsBtn}</div>${HELP}`,
    { new: () => (hasSave() ? confirmNew() : newGame()), cont: () => camp(), fs: () => document.documentElement.requestFullscreen?.() });
}
function confirmNew() {
  show(`<h2>Start a new game?</h2><p>This replaces your saved progress.</p><div><button class="btn" data-act="yes">Yes, start over</button><button class="btn" data-act="no">Cancel</button></div>`,
    { yes: newGame, no: title });
}
function newGame() { resetAll(); startLevel(0); }

// ---------------------------------------------------------------- camp (between quests)
function camp(note) {
  exitLock(); disposeCur(); mode = "camp"; paused = false; hud.show(false);
  S.mana = Math.max(S.mana, Math.min(S.maxMana, 4));      // a little rest restores some magic
  S.hp = S.maxHp; save();
  const next = S.levelIdx, allDone = next >= LEVELS.length;
  const done = LEVELS.map((l, i) => i < Math.min(next, LEVELS.length)
    ? `<button class="btn small" data-act="play" data-arg="${i}">↻ ${l.title}<br><small>${l.subtitle}</small></button>` : "").join("");
  show(`<h2>Camp</h2>${note ? `<p>${note}</p>` : ""}
    <p>🪙 <b>${S.gold}</b> gold &nbsp; 🧪 <b>${S.potions}</b> potions &nbsp; ♥ <b>${S.maxHp}</b> health &nbsp; ⚡ <b>${S.mana}/${S.maxMana}</b> magic &nbsp; ⚔ <b>${1 + S.attackLvl}</b> power</p>
    ${allDone ? "<p>🏆 You have conquered every quest in the dungeon!</p>" : ""}
    <div><button class="btn" data-act="shop">Visit Lirael's Shop</button>
    ${allDone ? "" : `<button class="btn" data-act="play" data-arg="${next}">Play ${LEVELS[next].title}<br><small>${LEVELS[next].subtitle}</small></button>`}</div>
    ${done ? `<p style="margin-top:14px">Replay a completed quest</p><div id="levels">${done}</div>` : ""}
    <div><button class="btn small" data-act="title">Main Menu</button></div>`,
    { shop: startShop, play: (i) => startLevel(+i), title });
}

// ---------------------------------------------------------------- play / shop
function startLevel(i) {
  disposeCur(); hide(); mode = "play"; paused = false;
  cur = new Play(i, onEnd); requestLock();
}
function startShop() {
  disposeCur(); hide(); mode = "shop"; paused = false;
  cur = new Shop(0, () => camp("You head back to camp.")); requestLock();
}
function onEnd(kind, info) {
  exitLock();
  const idx = cur.idx, snap = cur;
  if (kind === "dead") {
    mode = "dead";
    setTimeout(() => show(`<h2 style="color:#ff5050">You Died</h2><p>The dungeon claims another adventurer…</p>
      <div><button class="btn" data-act="retry">Try Again</button><button class="btn" data-act="camp">Back to Camp</button><button class="btn small" data-act="title">Main Menu</button></div>`,
      { retry: () => { snap.restoreSnapshot(); startLevel(idx); }, camp: () => { snap.restoreSnapshot(); camp("You limp back to camp, defeated."); }, title }), 1600);
  } else {
    mode = "complete"; save();                                        // autosave on quest completion
    const last = idx === LEVELS.length - 1;
    setTimeout(() => show(`<h2>Quest Complete!</h2><p>${LEVELS[idx].title} — ${LEVELS[idx].subtitle}</p>
      <p>Enemies slain: <b>${info.kills}</b> · Gold collected: <b>${info.gold}</b> · Total gold: <b>${S.gold}</b></p>
      ${last ? "<p>🏆 That was the final quest — the dungeon is yours!</p>" : ""}<p><i>Progress saved.</i></p>
      <div><button class="btn" data-act="camp">Continue to Camp</button></div>`,
      { camp: () => camp(last ? "Congratulations, hero!" : `${LEVELS[idx].title} cleared.`) }), 900);
  }
}

// pause: mouse released (desktop), Start button (gamepad) or the pause button (touch)
function showPause() {
  paused = true;
  show(`<h2>Paused</h2><div><button class="btn" data-act="resume">Resume</button><button class="btn" data-act="title">Main Menu</button></div>${HELP}`,
    { resume: () => { paused = false; hide(); requestLock(); }, title: () => { if (mode === "play" && cur && cur.restoreSnapshot) cur.restoreSnapshot(); title(); } });
}
const canPause = () => (mode === "play" || mode === "shop") && cur && cur.state !== "dead" && cur.state !== "complete";
lock.onChange = (active) => {
  if (!active && canPause() && !paused) showPause();
  else if (active && paused) { paused = false; hide(); }
};
window.addEventListener("dq-pause", () => {
  if (paused) { paused = false; hide(); requestLock(); } else if (canPause() && screen.style.display !== "flex") { exitLock(); showPause(); }
});
// controller navigation of HTML menus (D-pad / left stick + A)
function navMenu() {
  const btns = [...screen.querySelectorAll("button.btn")];
  if (!btns.length) return;
  if (pad.up) focusIdx = (focusIdx + btns.length - 1) % btns.length;
  if (pad.down) focusIdx = (focusIdx + 1) % btns.length;
  btns.forEach((b, i) => b.classList.toggle("focus", pad.active && i === focusIdx));
  if (pad.a) btns[focusIdx].click();
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  pollGamepad();
  if (screen.style.display === "flex") navMenu();
  if (cur && !paused && screen.style.display !== "flex") cur.update(dt);
  if (cur) renderer.render(cur.scene, camera);
  endFrame();
  requestAnimationFrame(frame);
}
(async () => {
  const el = document.getElementById("loading");
  try { await loadModels((n, t) => { el.textContent = `Loading models… ${n}/${t}`; }); } catch (e) { el.textContent = "Failed to load models: " + e.message; throw e; }
  el.style.display = "none"; title(); requestAnimationFrame(frame);
})();
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("./sw.js").catch(() => {});
window.__dq = { get cur() { return cur; }, startLevel, startShop, camp, title, S, LEVELS };
