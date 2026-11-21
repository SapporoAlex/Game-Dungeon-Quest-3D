// Sanity-checks every level: stairs/goal reachability, props/enemies/doors on valid floor, goal data present.   node tools/check_levels.mjs
import { LEVELS } from "../js/levels.js";
let problems = 0;
for (const L of LEVELS) {
  const R = L.map.length, C = L.map[0].length, wall = (c, r) => c < 0 || r < 0 || c >= C || r >= R || L.map[r][c] === "#";
  const seen = new Set(), q = [L.start]; seen.add(L.start.join());
  while (q.length) { const [c, r] = q.shift(); for (const [dc, dr] of [[1,0],[-1,0],[0,1],[0,-1]]) { const n = [c+dc, r+dr]; if (wall(...n) || seen.has(n.join())) continue; seen.add(n.join()); q.push(n); } }
  const stairs = []; L.map.forEach((row, r) => [...row].forEach((ch, c) => ch === "E" && stairs.push([c, r])));
  const bad = (a) => a.filter((o) => wall(o.c, o.r) || !seen.has(o.c + "," + o.r));
  const tally = {}; for (const e of L.enemies) tally[e.t] = (tally[e.t] || 0) + 1;
  const errs = [];
  if (!stairs.length) errs.push("no stairs"); else if (!stairs.every((s) => seen.has(s.join()))) errs.push("stairs unreachable");
  if (bad(L.enemies).length) errs.push("bad enemies " + bad(L.enemies).map((e) => `${e.t}@${e.c},${e.r}`));
  if (bad(L.props).length) errs.push("bad props " + bad(L.props).map((e) => `${e.t}@${e.c},${e.r}`));
  if (L.doors.some((d) => wall(d.c, d.r))) errs.push("door in wall");
  if (L.goal === "tome" && (!L.tome || !seen.has(L.tome.join()))) errs.push("tome missing/unreachable");
  if (L.goal === "princess" && !(L.princessSpots?.length && L.princessSpots.every((s) => seen.has(s.join())))) errs.push("princess spots");
  if (L.goal === "wizard" && !L.enemies.some((e) => e.t === "wizard")) errs.push("no wizard");
  if (L.goal === "dragon" && !L.enemies.some((e) => e.t === "dragon")) errs.push("no dragon");
  if (L.map.some((row) => row.length !== C)) errs.push("ragged map");
  problems += errs.length;
  console.log(`${L.id.padEnd(9)} ${String(C + "x" + R).padEnd(6)} ${String(L.kind).padEnd(8)} enemies ${String(L.enemies.length).padStart(2)} ${JSON.stringify(tally)} doors ${L.doors.length} (secret ${L.doors.filter((d) => d.secret).length}) props ${L.props.length} rugs ${(L.rugs || []).length}`, errs.length ? "  !! " + errs.join("; ") : "");
}
console.log(problems ? `${problems} PROBLEM(S)` : `All ${LEVELS.length} levels OK`);
process.exit(problems ? 1 : 0);
