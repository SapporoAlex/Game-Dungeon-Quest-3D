# Dungeon Quest 3D

A first-person (Wolfenstein/Doom-style) 3D dungeon crawler that runs entirely in the browser — no build step, no server code.
Sword + lightning magic, 46 quests (dragons, a dark wizard, the Tome of Horass, an elven princess…), goblin archers, and a shop run by an elf. Inspired by the *Dungeon Quest* board-game-style original.

Plays on **PC (keyboard + mouse or Xbox controller), tablets and phones (touch)**, and can be **installed as an app** (PWA, works offline).

## Put it on GitHub Pages
1. Create a new GitHub repository and upload **the contents of this folder** (so `index.html` sits at the repo root).
2. Repo **Settings → Pages → Build and deployment → Source: "Deploy from a branch"**, branch `main`, folder `/ (root)`.
3. After a minute the game is live at `https://<your-user>.github.io/<repo-name>/`.

Everything uses relative paths, so it works both at a custom domain root and under `/<repo-name>/`.
`.nojekyll` is included so Pages serves every file untouched. When you upload changes, players pick them up on their next visit
(the service worker refreshes cached files in the background).

## Install it as an app
* **PC (Chrome / Edge):** open the page → click the install icon in the address bar (or ⋮ → *Install Dungeon Quest 3D*).
* **Android (Chrome):** ⋮ → *Install app* / *Add to Home screen*.
* **iPhone / iPad (Safari):** Share → *Add to Home Screen*.
Installed, it launches fullscreen in landscape and works offline (music is streamed and only plays online).

## Controls
| | Keyboard + mouse | Xbox / standard gamepad | Touch |
|---|---|---|---|
| Move | W A S D | Left stick | Left-side joystick |
| Look | Mouse (click to capture) / arrow keys | Right stick | Drag on the right side |
| Short sword | Left click / Space | RT / RB / X | ⚔ |
| Lightning bolt (3 magic) | Right click / F | LT / LB / B | ⚡ |
| Use: doors, crates, chests, shop | E | A | E |
| Pause | Esc (release mouse) | Start | ❚❚ |

Menus can be driven with the D-pad / left stick and **A**. Red heart potions heal one heart when picked up (they wait on the floor if you're at full health); green bottles restore magic (found in crates, barrels, tables, chests).

## Saving
Progress (gold, amulet, upgrades, furthest quest) autosaves in the browser's local storage when a quest is completed,
when you buy something, and when you reach camp. **Continue** on the title screen always drops you at camp
(shop · play next quest · replay any completed quest).

## Swapping the music and sound effects
Edit **`js/audio-config.js`** — drop your files in `/audio` and list them there. Current files are placeholders.
Sounds without files (door, zap, coin...) are synthesised in code; give them a `files: [...]` list to replace them.

## Project layout
```
index.html, manifest.webmanifest, sw.js   page + PWA install/offline support
js/        engine.js (renderer, audio, input, touch, gamepad) · game.js (levels, combat, AI)
           shop.js (3D shop) · main.js (title/camp/flow) · levels.js (level data) · state.js (stats, save, shop items)
models/    .glb models exported from Blender
blender/   build_models.py — rebuilds every model:  blender -b --python blender/build_models.py -- models/
audio/     placeholder music + sfx (see audio-config.js)
icons/     app icons (tools/make_icons.py)
vendor/    three.js (MIT, see LICENSE-three.txt) + GLTFLoader
tools/     check_levels.mjs — verifies every quest's stairs/enemies/props are reachable (node tools/check_levels.mjs)
```
Run locally: `python3 -m http.server 8000` in this folder, then open http://localhost:8000/ (it must be served over http, not opened as a file).

## Credits
Built with [three.js](https://threejs.org) (MIT). Level layouts, enemies and items are inspired by *Dungeon Quest* (MIT).
The placeholder music/sound effects were taken from that project — replace them with your own before publishing if you prefer.


## Quests
* **Tutorial + Quests 1-4** are hand-made. Every foe there is paired with another (mostly goblin archers).
* **Quests 5-44** are generated (seeded, so they are always the same) by `js/levelgen.js` in five flavours:
  *Escape* (reach the far stairwell) · *Defeat the Dark Wizard* (purple robes, green eyes, lightning) ·
  *Find the Tome of Horass* (a labyrinth of many small rooms) · *Slay the Dragons* (one, later two) ·
  *Rescue the Elven Princess* (she waits in a random far-away room, follows you once found, and only you need to reach the stairwell).
* Finishing the goal of a Tome / Princess / Wizard quest summons a fresh wave of enemies — you still have to get back to the stairwell.
* **Final Quest**: a huge sealed hall holds two dragons, the dark wizard and the captive princess. The door locks when you step in; beat all three, free her, and escape.
* Some "walls" are secret doors — a slightly lighter wall segment. Stand next to one and press **E**.
* Bookshelves can be searched like chests; persian rugs decorate some rooms.
* Quest 3 (The Rampage): the great east hall seals behind you and re-opens once its enemies are dead; the stairwells open when *every* enemy is dead.
* Check every level with `node tools/check_levels.mjs`.

## Audio
* Music is synthesised in code (`js/music.js`): dark atmospheric dungeon ambience, and a happy flute-and-harp elven tune in the shop. To use real recordings instead, set `MUSIC.src` / `SHOP_MUSIC.src` in `js/audio-config.js` (the old `audio/music.mp3` is still in the repo). Sound effects are configured in the same file.
* **Amulet of Rebirth** (100 gold, one at a time): when your health hits zero you come back at full health and the amulet is lost.
* **Dialogue voice lines**: every spoken line (Lirael, the princess, the dark wizard, the hero) is listed in `js/dialogue.js` and plays `audio/dialogue-<spoken text>.mp3`
  (characters Windows disallows in file names — `? : " * < > | / \` — are dropped). Silent placeholders are included; replace them with real recordings under the same name.
  After adding a line to `js/dialogue.js`, run `node tools/make_dialogue_placeholders.mjs` to create its placeholder (existing files are never overwritten).

## Developing
`node tools/dev-server.mjs` serves the game on http://localhost:8123 without caching (the PWA service worker otherwise serves stale files).
