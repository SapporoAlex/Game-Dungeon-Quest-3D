// Game flow:  title -> (new game | continue) -> camp <-> shop / quests.
// Progress (inventory + furthest quest) is autosaved when a quest is completed, when you buy something
// and when you reach camp. "Continue" always drops you at camp.
import { renderer, camera, loadModels, endFrame, lock, requestLock, exitLock, resumeAudio, startMusic, pollGamepad, pad, IS_TOUCH } from "./engine.js";
import { LEVELS } from "./levels.js";
import { S, save, load, hasSave, resetAll, setMomo } from "./state.js";
import { hud } from "./hud.js";
import { Play } from "./game.js";
import { Shop } from "./shop.js";
import { thumbFor } from "./thumbs.js";

const screen = document.getElementById("screen");
let cur = null, mode = "title", paused = false, focusIdx = 0;

function show(html, wire) {
  screen.style.display = "flex"; screen.innerHTML = html; focusIdx = 0;
  screen.querySelectorAll("[data-act]").forEach((b) => b.addEventListener("click", () => { resumeAudio(); startMusic(); wire[b.dataset.act](b.dataset.arg); }));
}
function hide() { screen.style.display = "none"; screen.innerHTML = ""; }
const HELP = IS_TOUCH
  ? `<div class="help"><b>Left thumb</b><span>Move</span><b>Right side drag</b><span>Look</span><b>⚔ / ⚡</b><span>Sword / lightning bolt</span><b>E</b><span>Use (doors, crates, shop)</span></div>`
  : `<div class="help"><b>W A S D</b><span>Move</span><b>Mouse</b><span>Look (click to capture)</span><b>Left click / Space</b><span>Short sword</span>
<b>Right click / F</b><span>Lightning bolt (uses magic)</span><b>E</b><span>Open doors · search crates, tables, chests · buy</span>
<b>Shift</b><span>Sprint</span></div>
<div class="help"><b>🎮 Controller</b><span>Left stick move · Right stick look · RT / X sword · LT / B lightning · A use · Start pause · D-pad / A in menus</span></div>`;
const fsBtn = document.fullscreenEnabled ? `<button class="btn small" data-act="fs">⛶ Fullscreen</button>` : "";
const momoBtn = (small) => `<button class="btn ${small ? "small" : ""}" data-act="momo">🐾 Momo Mode: ${S.momo ? "ON" : "OFF"}${small ? "" : "<small>20 hearts · enemies attack 50% slower</small>"}</button>`;
const disposeCur = () => { if (cur) { cur.dispose && cur.dispose(); cur = null; } };

// ---------------------------------------------------------------- title
const KIND = {
  tutorial: ["🎓", "Tutorial"], escape: ["🚪", "Escape"], dragon: ["🐉", "Slay the Dragon"], clear: ["☠", "Clear the Dungeon"],
  wizard: ["⚡", "Defeat the Dark Wizard"], finale: ["👑", "The Final Battle"], tome: ["📖", "Find the Tome of Horass"], princess: ["👑", "Rescue the Princess"],
};
/** one entry of the vertical quest list: a screenshot banner with the title; hover / focus extends it downwards to show the mission */
function levelCard(i, state) {
  const L = LEVELS[i], [icon, label] = KIND[L.kind] || ["⚔", "Quest"], locked = state === "locked";
  const img = locked ? "" : thumbFor(L);
  const badge = state === "next" ? "NEXT" : state === "done" ? "✓ CLEARED" : locked ? "🔒 LOCKED" : "";
  return `<button class="lvl ${state}" data-act="play" data-arg="${i}" ${locked ? "disabled" : ""}>
    <span class="lvl-banner" style="${img ? `background-image:url(${img})` : ""}"><span class="lvl-shade"></span>
      <span class="lvl-text"><span class="lvl-num">${L.title}</span><span class="lvl-name">${L.subtitle}</span><span class="lvl-goal">${icon} ${label}</span></span>
      ${badge ? `<span class="lvl-badge">${badge}</span>` : ""}</span>
    <span class="lvl-desc"><span class="lvl-desc-in">${locked ? "Clear the previous quest to unlock this mission." : L.desc}</span></span></button>`;
}
function title() {
  exitLock(); disposeCur(); mode = "title"; paused = false; hud.show(false);
  let cont = "";
  if (hasSave()) {
    load();
    const next = Math.min(S.levelIdx, LEVELS.length - 1);
    const sub = S.levelIdx >= LEVELS.length ? "All quests complete" : `${LEVELS[next].title} · ${S.gold} gold`;
    cont = `<button class="btn" data-act="cont">Continue<small>${sub}</small></button>`;
  }
  show(`<div class="crest">⚔</div><h1>Dungeon Quest <span>3D</span></h1><div class="rule"><i></i></div>
    <p class="tag">Hack, blast and loot your way through the dungeon. Smash crates for gold and green magic bottles — then spend your spoils at Lirael's shop.</p>
    <div class="menu"><button class="btn" data-act="new">New Game</button>${cont}${momoBtn()}</div><div>${fsBtn}</div>${HELP}`,
    { momo: () => { setMomo(!S.momo); title(); }, new: () => (hasSave() ? confirmNew() : newGame()), cont: () => camp(), fs: () => document.documentElement.requestFullscreen?.() });
}
function confirmNew() {
  show(`<h2>Start a new game?</h2><div class="rule"><i></i></div><p>This replaces your saved progress.</p><div class="menu"><button class="btn" data-act="yes">Yes, start over</button><button class="btn" data-act="no">Cancel</button></div>`,
    { yes: newGame, no: title });
}
function newGame() { resetAll(); startLevel(0); }

// ---------------------------------------------------------------- camp (between quests)
function camp(note) {
  exitLock(); disposeCur(); mode = "camp"; paused = false; hud.show(false);
  S.mana = Math.max(S.mana, Math.min(S.maxMana, 4));      // a little rest restores some magic
  S.hp = S.maxHp; save();
  const next = S.levelIdx, allDone = next >= LEVELS.length;
  const cards = LEVELS.map((l, i) => levelCard(i, i < next ? "done" : i === next ? "next" : "locked")).join("");
  show(`<div id="campWrap"><div id="campSide"><h2>Camp</h2>${note ? `<p class="note">${note}</p>` : ""}
    <p class="stats">🪙 <b>${S.gold}</b> gold &nbsp; 📿 <b>${S.amulet ? "Rebirth amulet ready" : "no amulet"}</b> &nbsp; ♥ <b>${S.maxHp}</b> health &nbsp; ⚡ <b>${S.mana}/${S.maxMana}</b> magic &nbsp; ⚔ <b>${1 + S.attackLvl}</b> power</p>
    ${allDone ? "<p>🏆 You have conquered every quest in the dungeon!</p>" : ""}
    <div class="menu row"><button class="btn" data-act="shop">Lirael's Shop</button><button class="btn" data-act="title">Main Menu</button>${momoBtn(true)}</div></div>
    <div id="campMain"><div class="rule"><i></i><span>Choose a quest</span><i></i></div>
    <div id="levelList">${cards}</div></div></div>`,
    { momo: () => { setMomo(!S.momo); camp(S.momo ? "Momo mode on: 20 hearts, and enemies attack 50% slower." : "Momo mode off."); }, shop: startShop, play: (i) => startLevel(+i), title });
  requestAnimationFrame(() => document.querySelector("#levelList .lvl.next")?.scrollIntoView({ block: "center" }));
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
    setTimeout(() => show(`<h2 class="dead">You Died</h2><p>The dungeon claims another adventurer…</p>
      <div class="menu"><button class="btn" data-act="retry">Try Again</button><button class="btn" data-act="camp">Back to Camp</button><button class="btn small" data-act="title">Main Menu</button></div>`,
      { retry: () => { snap.restoreSnapshot(); startLevel(idx); }, camp: () => { snap.restoreSnapshot(); camp("You limp back to camp, defeated."); }, title }), 1600);
  } else {
    mode = "complete"; save();                                        // autosave on quest completion
    const last = idx === LEVELS.length - 1;
    setTimeout(() => show(`<h2>Quest Complete!</h2><div class="rule"><i></i></div><p>${LEVELS[idx].title} — ${LEVELS[idx].subtitle}</p>
      <p>Enemies slain: <b>${info.kills}</b> · Gold collected: <b>${info.gold}</b> · Total gold: <b>${S.gold}</b></p>
      ${last ? "<p>🏆 That was the final quest — the dungeon is yours!</p>" : ""}<p><i>Progress saved.</i></p>
      <div class="menu"><button class="btn" data-act="camp">Continue to Camp</button></div>`,
      { camp: () => camp(last ? "Congratulations, hero!" : `${LEVELS[idx].title} cleared.`) }), 900);
  }
}

// pause: mouse released (desktop), Start button (gamepad) or the pause button (touch)
function showPause() {
  paused = true;
  show(`<h2>Paused</h2><div class="rule"><i></i></div><div class="menu"><button class="btn" data-act="resume">Resume</button><button class="btn" data-act="title">Main Menu</button></div>${HELP}`,
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
const menuButtons = () => [...screen.querySelectorAll("button.btn, button.lvl:not(:disabled)")];
// keyboard: arrow keys / W S move between menu entries (the focused quest card extends to show its mission)
window.addEventListener("keydown", (e) => {
  if (screen.style.display !== "flex") return;
  const dir = e.code === "ArrowDown" || e.code === "KeyS" ? 1 : e.code === "ArrowUp" || e.code === "KeyW" ? -1 : 0;
  if (!dir) return;
  const btns = menuButtons(); if (!btns.length) return;
  e.preventDefault();
  const cur2 = btns.indexOf(document.activeElement);
  const nx = cur2 < 0 ? (dir > 0 ? 0 : btns.length - 1) : (cur2 + dir + btns.length) % btns.length;
  btns[nx].focus(); btns[nx].scrollIntoView({ block: "nearest" });
});
// when a quest card extends to show its mission, scroll the list just enough that the whole card stays visible
let revealT = 0;
function revealCard(e) {
  const card = e.target.closest?.(".lvl"); if (!card || card.disabled) return;
  clearTimeout(revealT);
  revealT = setTimeout(() => {
    const list = document.getElementById("levelList"); if (!list || !card.isConnected) return;
    const a = card.getBoundingClientRect(), b = list.getBoundingClientRect();
    if (a.bottom > b.bottom - 34) list.scrollBy({ top: a.bottom - b.bottom + 40, behavior: "smooth" });
    else if (a.top < b.top) list.scrollBy({ top: a.top - b.top - 6, behavior: "smooth" });
  }, 360);
}
screen.addEventListener("mouseover", revealCard); screen.addEventListener("focusin", revealCard);
function navMenu() {
  const btns = menuButtons();
  if (!btns.length) return;
  if (pad.up) focusIdx = (focusIdx + btns.length - 1) % btns.length;
  if (pad.down) focusIdx = (focusIdx + 1) % btns.length;
  focusIdx = Math.min(focusIdx, btns.length - 1);
  btns.forEach((b, i) => b.classList.toggle("focus", pad.active && i === focusIdx));
  if ((pad.up || pad.down) && pad.active) btns[focusIdx].scrollIntoView({ block: "nearest" });
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
  try { await document.fonts?.load("700 22px Cinzel"); } catch (e) {}
  el.style.display = "none"; title(); requestAnimationFrame(frame);
})();
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("./sw.js").catch(() => {});
window.__dq = { get cur() { return cur; }, startLevel, startShop, camp, title, S, LEVELS };
