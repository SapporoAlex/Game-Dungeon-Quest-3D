import { LEVELS } from "../js/levels.js";
for (const L of LEVELS) {
  const R = L.map.length, C = L.map[0].length, wall = (c, r) => c < 0 || r < 0 || c >= C || r >= R || L.map[r][c] === "#";
  const seen = new Set(), q = [L.start]; seen.add(L.start.join());
  while (q.length) { const [c, r] = q.shift(); for (const [dc, dr] of [[1,0],[-1,0],[0,1],[0,-1]]) { const n = [c+dc, r+dr]; if (wall(...n) || seen.has(n.join())) continue; seen.add(n.join()); q.push(n); } }
  const stairs = []; L.map.forEach((row, r) => [...row].forEach((ch, c) => ch === "E" && stairs.push([c, r])));
  const bad = (a) => a.filter((o) => wall(o.c, o.r) || !seen.has(o.c + "," + o.r));
  console.log(L.id, "stairs reachable:", stairs.map((s) => seen.has(s.join())), "| bad enemies:", bad(L.enemies).map((e) => `${e.t}@${e.c},${e.r}`), "| bad props:", bad(L.props).map((e) => `${e.t}@${e.c},${e.r}`), "| bad doors:", L.doors.filter((d) => wall(d.c, d.r)).length, "| dragons:", L.enemies.filter((e) => e.t === "dragon").length);
}
