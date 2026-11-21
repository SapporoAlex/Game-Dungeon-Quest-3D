// Persistent player state (saved in localStorage) + derived stats.
const KEY = "dungeonQuest3D_save_v1";
const DEFAULTS = { gold: 0, amulet: 0, mana: 6, maxMana: 10, maxHp: 4, speedLvl: 0, attackLvl: 0, luckLvl: 0, levelIdx: 0 };
export const S = { ...DEFAULTS, hp: 4 };

export function save() { try { localStorage.setItem(KEY, JSON.stringify({ ...S })); } catch (e) {} }
export function hasSave() { try { return !!localStorage.getItem(KEY); } catch (e) { return false; } }
export function load() {
  try { Object.assign(S, DEFAULTS, JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (e) { Object.assign(S, DEFAULTS); }
  S.hp = S.maxHp;
}
export function resetAll() { Object.assign(S, DEFAULTS); S.hp = S.maxHp; save(); }

export const moveSpeed = () => 5.0 + 0.55 * S.speedLvl;
export const swordDmg = () => 1 + S.attackLvl;
export const boltDmg = () => 2 + S.attackLvl;
export const BOLT_COST = 5;   // lightning is powerful: 5 magic per bolt

export const SHOP_ITEMS = [
  { id: "amulet", name: "Amulet of Rebirth", price: 100, model: "amulet", desc: "When your health hits zero you rise again at full health — the amulet is then lost (carry one)", max: () => S.amulet >= 1, buy() { S.amulet = 1; } },
  { id: "mana", name: "Mana Potion", price: 20, model: "potion_mana", desc: "+4 magic for your lightning", max: () => S.mana >= S.maxMana, buy() { S.mana = Math.min(S.maxMana, S.mana + 4); } },
  { id: "speed", name: "Speed Potion", price: 50, model: "potion_speed", desc: "Permanently run faster", max: () => S.speedLvl >= 5, buy() { S.speedLvl++; } },
  { id: "attack", name: "Attack Potion", price: 80, model: "potion_attack", desc: "Sword & lightning hit harder", max: () => S.attackLvl >= 5, buy() { S.attackLvl++; } },
  { id: "maxhealth", name: "Heart Potion", price: 80, model: "potion_maxhealth", desc: "+2 max health", max: () => S.maxHp >= 14, buy() { S.maxHp += 2; S.hp = S.maxHp; } },
  { id: "search", name: "Seeker Potion", price: 50, model: "potion_search", desc: "Better loot & wider pickup reach", max: () => S.luckLvl >= 5, buy() { S.luckLvl++; S.maxMana += 2; } },
];
