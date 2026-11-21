// Persistent player state (saved in localStorage) + derived stats.
const KEY = "dungeonQuest3D_save_v1";
const MOMO_KEY = "dungeonQuest3D_momo";
const DEFAULTS = { gold: 0, amulet: 0, mana: 6, maxMana: 10, baseHp: 4, maxHp: 4, speedLvl: 0, attackLvl: 0, luckLvl: 0, levelIdx: 0 };
export const S = { ...DEFAULTS, hp: 4, momo: false };

// Momo mode: 20 hearts, and every enemy attacks 50% slower (attack rate halved — see Play in game.js). A player preference kept
// separately from the save so it also applies to a new game; `baseHp` is the hearts earned through upgrades.
const readMomo = () => { try { return localStorage.getItem(MOMO_KEY) === "1"; } catch (e) { return false; } };
export function applyMode() { S.maxHp = S.momo ? Math.max(20, S.baseHp) : S.baseHp; S.hp = S.maxHp; }
export function setMomo(on) { S.momo = !!on; try { localStorage.setItem(MOMO_KEY, on ? "1" : "0"); } catch (e) {} applyMode(); if (hasSave()) save(); }
S.momo = readMomo(); applyMode();

export function save() { try { localStorage.setItem(KEY, JSON.stringify({ ...S })); } catch (e) {} }
export function hasSave() { try { return !!localStorage.getItem(KEY); } catch (e) { return false; } }
export function load() {
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (e) {}
  Object.assign(S, DEFAULTS, saved);
  if (saved.baseHp === undefined) S.baseHp = saved.maxHp || DEFAULTS.baseHp;      // saves from before Momo mode
  S.momo = readMomo(); applyMode();
}
export function resetAll() { Object.assign(S, DEFAULTS); S.momo = readMomo(); applyMode(); save(); }

export const moveSpeed = () => 5.0 + 0.55 * S.speedLvl;
export const swordDmg = () => 1 + S.attackLvl;
export const boltDmg = () => 2 + S.attackLvl;
export const BOLT_COST = 5;   // lightning is powerful: 5 magic per bolt

export const SHOP_ITEMS = [
  { id: "amulet", name: "Amulet of Rebirth", price: 100, model: "amulet", desc: "When your health hits zero you rise again at full health — the amulet is then lost (carry one)", max: () => S.amulet >= 1, buy() { S.amulet = 1; } },
  { id: "mana", name: "Mana Potion", price: 20, model: "potion_mana", desc: "+4 magic for your lightning", max: () => S.mana >= S.maxMana, buy() { S.mana = Math.min(S.maxMana, S.mana + 4); } },
  { id: "speed", name: "Speed Potion", price: 50, model: "potion_speed", desc: "Permanently run faster", max: () => S.speedLvl >= 5, buy() { S.speedLvl++; } },
  { id: "attack", name: "Attack Potion", price: 80, model: "potion_attack", desc: "Sword & lightning hit harder", max: () => S.attackLvl >= 5, buy() { S.attackLvl++; } },
  { id: "maxhealth", name: "Heart Potion", price: 80, model: "potion_maxhealth", desc: "+2 max health", max: () => S.momo || S.baseHp >= 14, buy() { S.baseHp += 2; applyMode(); } },
  { id: "search", name: "Seeker Potion", price: 50, model: "potion_search", desc: "Better loot & wider pickup reach", max: () => S.luckLvl >= 5, buy() { S.luckLvl++; S.maxMana += 2; } },
];
