// The five original hand-made quests (data only). js/levels.js post-processes these and appends the generated quests.
export const BASE_LEVELS = [
 {
  "id": "tutorial",
  "title": "Tutorial",
  "subtitle": "Learn the ropes",
  "goal": "stairs",
  "map": [
   "....................",
   "....................",
   "....................",
   "....................",
   "#####.#####.........",
   "#...#.#...#.........",
   "#.#.#.#...#.........",
   "#.#####...##########",
   "#..................#",
   "###############..E.#",
   "..............#....#",
   "..............######",
   "....................",
   "....................",
   "....................",
   "...................."
  ],
  "start": [
   3,
   6
  ],
  "startDir": "E",
  "doors": [
   {
    "key": "door1",
    "c": 2,
    "r": 8
   },
   {
    "key": "door2",
    "c": 6,
    "r": 8
   },
   {
    "key": "door3",
    "c": 10,
    "r": 8
   },
   {
    "key": "door4",
    "c": 14,
    "r": 8
   }
  ],
  "enemies": [
   {
    "t": "goblin",
    "c": 13,
    "r": 8
   }
  ],
  "props": [
   {
    "t": "table",
    "c": 8,
    "r": 5,
    "rot": "ew"
   },
   {
    "t": "barrel",
    "c": 7,
    "r": 5
   },
   {
    "t": "crate",
    "c": 9,
    "r": 6
   },
   {
    "t": "chest",
    "c": 17,
    "r": 8,
    "rot": "W"
   }
  ],
  "plates": [
   [
    4,
    8
   ]
  ],
  "hints": [
   {
    "c": 3,
    "r": 6,
    "text": "Move with W A S D and look with the mouse (or arrow keys). Click the screen to capture the mouse."
   },
   {
    "c": 1,
    "r": 8,
    "text": "Walk up to a door and press E to open / close it."
   },
   {
    "c": 4,
    "r": 8,
    "text": "Careful - hidden pressure plates fire arrow traps!"
   },
   {
    "c": 7,
    "r": 8,
    "text": "Left-click to swing your sword. Smash crates, barrels and chests - items hover out. Walk into them to pick them up."
   },
   {
    "c": 11,
    "r": 8,
    "text": "A goblin! Left-click to attack. Press Q to drink a health potion."
   },
   {
    "c": 15,
    "r": 8,
    "text": "Step onto the stairwell to finish the quest."
   }
  ]
 },
 {
  "id": "quest1",
  "title": "Quest 1",
  "subtitle": "Escape the dungeon",
  "goal": "stairs",
  "map": [
   "....................",
   ".#########.########.",
   ".#..#...#..#..#...#.",
   ".#......#..#......#.",
   ".#..#......#..#...#.",
   ".#..#...#..#..#...#.",
   ".##.########.###.##.",
   "E#..#...#c.#..#...#.",
   ".#..#.........#...#.",
   ".##.##.#########.##.",
   ".#..#...#..#..#...#.",
   ".#..#...#.....#...#.",
   ".#......#..#......#.",
   ".#..#...#..#..#...#.",
   ".########.#########.",
   "...................."
  ],
  "start": [
   9,
   7
  ],
  "startDir": "N",
  "doors": [
   {
    "key": "door1",
    "c": 10,
    "r": 1
   },
   {
    "key": "door2",
    "c": 4,
    "r": 3
   },
   {
    "key": "door3",
    "c": 14,
    "r": 3
   },
   {
    "key": "door4",
    "c": 8,
    "r": 4
   },
   {
    "key": "door5",
    "c": 3,
    "r": 6
   },
   {
    "key": "door6",
    "c": 12,
    "r": 6
   },
   {
    "key": "door7",
    "c": 16,
    "r": 6
   },
   {
    "key": "door8",
    "c": 8,
    "r": 8
   },
   {
    "key": "door9",
    "c": 11,
    "r": 8
   },
   {
    "key": "door10",
    "c": 3,
    "r": 9
   },
   {
    "key": "door11",
    "c": 6,
    "r": 9
   },
   {
    "key": "door12",
    "c": 16,
    "r": 9
   },
   {
    "key": "door13",
    "c": 11,
    "r": 11
   },
   {
    "key": "door14",
    "c": 4,
    "r": 12
   },
   {
    "key": "door15",
    "c": 14,
    "r": 12
   },
   {
    "key": "door16",
    "c": 9,
    "r": 14
   }
  ],
  "enemies": [
   {
    "t": "goblin",
    "c": 7,
    "r": 7
   },
   {
    "t": "goblin",
    "c": 3,
    "r": 7
   },
   {
    "t": "goblin",
    "c": 2,
    "r": 3
   },
   {
    "t": "goblin",
    "c": 3,
    "r": 2
   },
   {
    "t": "skeleton",
    "c": 7,
    "r": 3
   },
   {
    "t": "chaos",
    "c": 6,
    "r": 2
   },
   {
    "t": "chaos",
    "c": 6,
    "r": 4
   },
   {
    "t": "goblin",
    "c": 13,
    "r": 7
   },
   {
    "t": "goblin",
    "c": 13,
    "r": 2
   },
   {
    "t": "skeleton",
    "c": 13,
    "r": 2
   },
   {
    "t": "chaos",
    "c": 13,
    "r": 2
   },
   {
    "t": "goblin",
    "c": 16,
    "r": 3
   },
   {
    "t": "skeleton",
    "c": 16,
    "r": 3
   },
   {
    "t": "chaos",
    "c": 16,
    "r": 3
   },
   {
    "t": "goblin",
    "c": 16,
    "r": 4
   },
   {
    "t": "skeleton",
    "c": 16,
    "r": 4
   },
   {
    "t": "chaos",
    "c": 16,
    "r": 4
   },
   {
    "t": "goblin",
    "c": 17,
    "r": 7
   },
   {
    "t": "skeleton",
    "c": 17,
    "r": 7
   },
   {
    "t": "chaos",
    "c": 16,
    "r": 8
   },
   {
    "t": "skeleton",
    "c": 17,
    "r": 8
   },
   {
    "t": "skeleton",
    "c": 16,
    "r": 11
   },
   {
    "t": "chaos",
    "c": 16,
    "r": 11
   },
   {
    "t": "goblin",
    "c": 15,
    "r": 12
   },
   {
    "t": "goblin",
    "c": 16,
    "r": 12
   },
   {
    "t": "goblin",
    "c": 17,
    "r": 12
   },
   {
    "t": "goblin",
    "c": 15,
    "r": 13
   },
   {
    "t": "goblin",
    "c": 16,
    "r": 13
   },
   {
    "t": "goblin",
    "c": 17,
    "r": 13
   },
   {
    "t": "skeleton",
    "c": 15,
    "r": 12
   },
   {
    "t": "skeleton",
    "c": 16,
    "r": 12
   },
   {
    "t": "skeleton",
    "c": 17,
    "r": 12
   },
   {
    "t": "chaos",
    "c": 15,
    "r": 12
   },
   {
    "t": "chaos",
    "c": 17,
    "r": 12
   },
   {
    "t": "skeleton",
    "c": 9,
    "r": 12
   },
   {
    "t": "skeleton",
    "c": 10,
    "r": 12
   },
   {
    "t": "skeleton",
    "c": 10,
    "r": 10
   },
   {
    "t": "dragon",
    "c": 9,
    "r": 12
   },
   {
    "t": "goblin",
    "c": 0,
    "r": 6
   },
   {
    "t": "goblin",
    "c": 0,
    "r": 8
   },
   {
    "t": "goblin",
    "c": 0,
    "r": 14
   },
   {
    "t": "goblin",
    "c": 0,
    "r": 1
   },
   {
    "t": "skeleton",
    "c": 0,
    "r": 6
   },
   {
    "t": "skeleton",
    "c": 0,
    "r": 8
   },
   {
    "t": "skeleton",
    "c": 0,
    "r": 4
   },
   {
    "t": "chaos",
    "c": 0,
    "r": 6
   },
   {
    "t": "chaos",
    "c": 0,
    "r": 8
   }
  ],
  "props": [
   {
    "t": "barrel",
    "c": 5,
    "r": 7,
    "rot": "S"
   },
   {
    "t": "crate",
    "c": 7,
    "r": 13,
    "rot": "S"
   },
   {
    "t": "barrel",
    "c": 2,
    "r": 13,
    "rot": "S"
   },
   {
    "t": "table",
    "c": 2,
    "r": 7,
    "rot": "ns"
   },
   {
    "t": "chest",
    "c": 2,
    "r": 2,
    "rot": "S"
   },
   {
    "t": "table",
    "c": 6,
    "r": 5,
    "rot": "ew"
   },
   {
    "t": "barrel",
    "c": 10,
    "r": 5,
    "rot": "S"
   },
   {
    "t": "crate",
    "c": 13,
    "r": 8,
    "rot": "S"
   },
   {
    "t": "chest",
    "c": 12,
    "r": 3,
    "rot": "E"
   },
   {
    "t": "table",
    "c": 15,
    "r": 2,
    "rot": "ew"
   },
   {
    "t": "crate",
    "c": 17,
    "r": 5,
    "rot": "S"
   },
   {
    "t": "table",
    "c": 15,
    "r": 7,
    "rot": "ns"
   },
   {
    "t": "chest",
    "c": 12,
    "r": 12,
    "rot": "E"
   },
   {
    "t": "chest",
    "c": 12,
    "r": 10,
    "rot": "S"
   },
   {
    "t": "chest",
    "c": 13,
    "r": 10,
    "rot": "S"
   }
  ],
  "plates": [
   [
    5,
    10
   ],
   [
    6,
    11
   ],
   [
    7,
    12
   ],
   [
    3,
    11
   ],
   [
    2,
    12
   ],
   [
    9,
    3
   ],
   [
    10,
    3
   ],
   [
    5,
    0
   ]
  ],
  "hints": [
   {
    "c": 9,
    "r": 7,
    "text": "Find the stairwell on the far west side of the dungeon. Doors keep rooms sealed - open them with E."
   }
  ],
  "thin": 0.4
 },
 {
  "id": "quest2",
  "title": "Quest 2",
  "subtitle": "Hunt the red dragon",
  "goal": "dragon",
  "map": [
   "E....#........#.....",
   ".##.#####..########.",
   ".#...#..#..#......#.",
   ".#...#..#.........#.",
   ".#...#..#..#####.##.",
   ".#.........#..#...#.",
   ".#...#..#.........#.",
   ".#####.########...#.",
   "........#.....#...#.",
   ".###.#.##..##.##.##.",
   ".#...#..#..#......#.",
   "##...#.....#......#.",
   ".#...#..#..#......#.",
   ".#......#..#......#.",
   ".##.###############.",
   "........#..........."
  ],
  "start": [
   0,
   0
  ],
  "startDir": "S",
  "doors": [
   {
    "key": "door1",
    "c": 3,
    "r": 1
   },
   {
    "key": "door2",
    "c": 16,
    "r": 4
   },
   {
    "key": "door3",
    "c": 6,
    "r": 7
   },
   {
    "key": "door5",
    "c": 4,
    "r": 9
   },
   {
    "key": "door6",
    "c": 6,
    "r": 9
   },
   {
    "key": "door7",
    "c": 13,
    "r": 9
   },
   {
    "key": "door8",
    "c": 16,
    "r": 9
   },
   {
    "key": "door9",
    "c": 3,
    "r": 14
   },
   {
    "key": "door10",
    "c": 11,
    "r": 3
   },
   {
    "key": "door11",
    "c": 5,
    "r": 5
   },
   {
    "key": "door12",
    "c": 8,
    "r": 5
   },
   {
    "key": "door13",
    "c": 1,
    "r": 8
   },
   {
    "key": "door14",
    "c": 8,
    "r": 11
   },
   {
    "key": "door15",
    "c": 5,
    "r": 13
   },
   {
    "key": "door16",
    "c": 11,
    "r": 6
   },
   {
    "key": "door17",
    "c": 14,
    "r": 6
   }
  ],
  "enemies": [
   {
    "t": "goblin",
    "c": 3,
    "r": 5
   },
   {
    "t": "skeleton",
    "c": 7,
    "r": 3
   },
   {
    "t": "goblin",
    "c": 13,
    "r": 3
   },
   {
    "t": "goblin",
    "c": 15,
    "r": 2
   },
   {
    "t": "chaos",
    "c": 12,
    "r": 5
   },
   {
    "t": "skeleton",
    "c": 17,
    "r": 6
   },
   {
    "t": "goblin",
    "c": 15,
    "r": 7
   },
   {
    "t": "skeleton",
    "c": 5,
    "r": 8
   },
   {
    "t": "goblin",
    "c": 9,
    "r": 10
   },
   {
    "t": "goblin",
    "c": 10,
    "r": 12
   },
   {
    "t": "goblin",
    "c": 3,
    "r": 11
   },
   {
    "t": "chaos",
    "c": 16,
    "r": 11
   },
   {
    "t": "chaos",
    "c": 13,
    "r": 11
   },
   {
    "t": "dragon",
    "c": 14,
    "r": 12
   },
   {
    "t": "skeleton",
    "c": 10,
    "r": 0
   },
   {
    "t": "goblin",
    "c": 10,
    "r": 5
   }
  ],
  "props": [
   {
    "t": "table",
    "c": 2,
    "r": 6,
    "rot": "ew"
   },
   {
    "t": "barrel",
    "c": 17,
    "r": 2,
    "rot": "S"
   },
   {
    "t": "crate",
    "c": 13,
    "r": 5,
    "rot": "S"
   },
   {
    "t": "table",
    "c": 17,
    "r": 7,
    "rot": "ns"
   },
   {
    "t": "crate",
    "c": 7,
    "r": 8,
    "rot": "S"
   },
   {
    "t": "barrel",
    "c": 9,
    "r": 8,
    "rot": "S"
   },
   {
    "t": "crate",
    "c": 2,
    "r": 10,
    "rot": "S"
   },
   {
    "t": "table",
    "c": 2,
    "r": 11,
    "rot": "ns"
   },
   {
    "t": "barrel",
    "c": 7,
    "r": 13,
    "rot": "S"
   },
   {
    "t": "chest",
    "c": 17,
    "r": 12,
    "rot": "W"
   },
   {
    "t": "table",
    "c": 12,
    "r": 11,
    "rot": "ns"
   },
   {
    "t": "barrel",
    "c": 7,
    "r": 15,
    "rot": "S"
   },
   {
    "t": "barrel",
    "c": 13,
    "r": 0,
    "rot": "S"
   }
  ],
  "plates": [],
  "hints": [
   {
    "c": 0,
    "r": 0,
    "text": "Hunt down and defeat the Red Dragon, then return to the stairwell where you started."
   }
  ],
  "thin": 1
 },
 {
  "id": "quest3",
  "title": "Quest 3",
  "subtitle": "The Rampage",
  "goal": "clear",
  "map": [
   "....#....#....#.....",
   ".........#..........",
   "....#....#....#.....",
   "....#....#....#.....",
   "#.#####.###.###.....",
   "....#.c..#....#.....",
   "....#....#c...#.....",
   "....#....#....#.....",
   "....#....#....#.....",
   "....#....#....#.....",
   "#.####.#####.##.....",
   "....#....#....#.....",
   "....#.........#.....",
   "....#.c..#....#.....",
   "....#....#....#.....",
   "E...#....#....#....E"
  ],
  "start": [
   1,
   12
  ],
  "startDir": "N",
  "doors": [
   {
    "key": "d1",
    "c": 1,
    "r": 10
   },
   {
    "key": "d2",
    "c": 1,
    "r": 4
   },
   {
    "key": "d3",
    "c": 4,
    "r": 1
   },
   {
    "key": "d4",
    "c": 7,
    "r": 4
   },
   {
    "key": "d5",
    "c": 6,
    "r": 10
   },
   {
    "key": "d6",
    "c": 9,
    "r": 12
   },
   {
    "key": "d7",
    "c": 12,
    "r": 10
   },
   {
    "key": "d8",
    "c": 11,
    "r": 4
   },
   {
    "key": "d9",
    "c": 14,
    "r": 1
   }
  ],
  "enemies": [
   {
    "t": "goblin",
    "c": 1,
    "r": 6
   },
   {
    "t": "goblin",
    "c": 3,
    "r": 7
   },
   {
    "t": "goblin",
    "c": 1,
    "r": 9
   },
   {
    "t": "skeleton",
    "c": 1,
    "r": 2
   },
   {
    "t": "skeleton",
    "c": 2,
    "r": 0
   },
   {
    "t": "goblin",
    "c": 3,
    "r": 3
   },
   {
    "t": "chaos",
    "c": 5,
    "r": 0
   },
   {
    "t": "chaos",
    "c": 7,
    "r": 3
   },
   {
    "t": "goblin",
    "c": 5,
    "r": 6
   },
   {
    "t": "goblin",
    "c": 8,
    "r": 7
   },
   {
    "t": "goblin",
    "c": 6,
    "r": 9
   },
   {
    "t": "skeleton",
    "c": 7,
    "r": 5
   },
   {
    "t": "skeleton",
    "c": 6,
    "r": 14
   },
   {
    "t": "skeleton",
    "c": 8,
    "r": 12
   },
   {
    "t": "chaos",
    "c": 7,
    "r": 14
   },
   {
    "t": "goblin",
    "c": 11,
    "r": 12
   },
   {
    "t": "goblin",
    "c": 13,
    "r": 14
   },
   {
    "t": "goblin",
    "c": 10,
    "r": 14
   },
   {
    "t": "skeleton",
    "c": 12,
    "r": 13
   },
   {
    "t": "chaos",
    "c": 11,
    "r": 7
   },
   {
    "t": "chaos",
    "c": 13,
    "r": 9
   },
   {
    "t": "skeleton",
    "c": 12,
    "r": 6
   },
   {
    "t": "skeleton",
    "c": 11,
    "r": 2
   },
   {
    "t": "skeleton",
    "c": 13,
    "r": 1
   },
   {
    "t": "chaos",
    "c": 12,
    "r": 3
   },
   {
    "t": "skeleton",
    "c": 16,
    "r": 3
   },
   {
    "t": "skeleton",
    "c": 18,
    "r": 5
   },
   {
    "t": "skeleton",
    "c": 17,
    "r": 8
   },
   {
    "t": "goblin",
    "c": 16,
    "r": 11
   },
   {
    "t": "goblin",
    "c": 18,
    "r": 10
   },
   {
    "t": "goblin",
    "c": 17,
    "r": 13
   },
   {
    "t": "goblin",
    "c": 16,
    "r": 6
   },
   {
    "t": "chaos",
    "c": 17,
    "r": 2
   },
   {
    "t": "chaos",
    "c": 18,
    "r": 12
   },
   {
    "t": "chaos",
    "c": 16,
    "r": 9
   }
  ],
  "props": [
   {
    "t": "chest",
    "c": 2,
    "r": 8,
    "rot": "E"
   },
   {
    "t": "chest",
    "c": 0,
    "r": 0,
    "rot": "S"
   },
   {
    "t": "table",
    "c": 6,
    "r": 2,
    "rot": "ew"
   },
   {
    "t": "barrel",
    "c": 3,
    "r": 6
   },
   {
    "t": "barrel",
    "c": 8,
    "r": 9
   },
   {
    "t": "crate",
    "c": 6,
    "r": 11
   },
   {
    "t": "crate",
    "c": 8,
    "r": 15
   },
   {
    "t": "chest",
    "c": 13,
    "r": 11,
    "rot": "W"
   },
   {
    "t": "table",
    "c": 12,
    "r": 5,
    "rot": "ns"
   },
   {
    "t": "barrel",
    "c": 10,
    "r": 8
   },
   {
    "t": "chest",
    "c": 19,
    "r": 0,
    "rot": "W"
   },
   {
    "t": "chest",
    "c": 15,
    "r": 15,
    "rot": "N"
   },
   {
    "t": "crate",
    "c": 15,
    "r": 7
   }
  ],
  "plates": [
   [
    2,
    2
   ],
   [
    2,
    7
   ],
   [
    6,
    6
   ],
   [
    6,
    12
   ],
   [
    12,
    12
   ],
   [
    12,
    7
   ]
  ],
  "hints": [
   {
    "c": 1,
    "r": 12,
    "text": "The Rampage: defeat EVERY enemy, then the stairwells open. Beware the east hall..."
   }
  ]
 },
 {
  "id": "quest4",
  "title": "Quest 4",
  "subtitle": "The Sunken Vault",
  "goal": "dragon",
  "map": [
   "......#......#......",
   "......#......#......",
   "......#......#......",
   "....................",
   "......#......#......",
   "......#......#......",
   "......#......#......",
   "##.######.######.###",
   "......#......#......",
   "......#......#......",
   "......#......#......",
   "....................",
   "......#......#...E..",
   "......#......#......",
   "......#......#......",
   "......#......#......"
  ],
  "start": [
   2,
   2
  ],
  "startDir": "S",
  "doors": [
   {
    "key": "doorA",
    "c": 6,
    "r": 3
   },
   {
    "key": "doorB",
    "c": 13,
    "r": 3
   },
   {
    "key": "doorC",
    "c": 6,
    "r": 11
   },
   {
    "key": "doorD",
    "c": 13,
    "r": 11
   },
   {
    "key": "doorE",
    "c": 2,
    "r": 7
   },
   {
    "key": "doorF",
    "c": 9,
    "r": 7
   },
   {
    "key": "doorG",
    "c": 16,
    "r": 7
   }
  ],
  "enemies": [
   {
    "t": "goblin",
    "c": 8,
    "r": 2
   },
   {
    "t": "goblin",
    "c": 9,
    "r": 4
   },
   {
    "t": "skeleton",
    "c": 15,
    "r": 2
   },
   {
    "t": "chaos",
    "c": 16,
    "r": 4
   },
   {
    "t": "goblin",
    "c": 2,
    "r": 9
   },
   {
    "t": "chaos",
    "c": 9,
    "r": 9
   },
   {
    "t": "skeleton",
    "c": 10,
    "r": 10
   },
   {
    "t": "chaos",
    "c": 15,
    "r": 9
   },
   {
    "t": "chaos",
    "c": 18,
    "r": 10
   },
   {
    "t": "dragon",
    "c": 17,
    "r": 11
   }
  ],
  "props": [
   {
    "t": "table",
    "c": 3,
    "r": 4,
    "rot": "ew"
   },
   {
    "t": "barrel",
    "c": 4,
    "r": 2,
    "rot": "S"
   },
   {
    "t": "crate",
    "c": 10,
    "r": 3,
    "rot": "S"
   },
   {
    "t": "table",
    "c": 18,
    "r": 3,
    "rot": "ew"
   },
   {
    "t": "barrel",
    "c": 3,
    "r": 10,
    "rot": "S"
   },
   {
    "t": "crate",
    "c": 11,
    "r": 9,
    "rot": "S"
   },
   {
    "t": "table",
    "c": 8,
    "r": 11,
    "rot": "ns"
   },
   {
    "t": "chest",
    "c": 18,
    "r": 12,
    "rot": "W"
   },
   {
    "t": "chest",
    "c": 16,
    "r": 13,
    "rot": "S"
   }
  ],
  "plates": [
   [
    5,
    2
   ],
   [
    12,
    9
   ]
  ],
  "hints": [
   {
    "c": 2,
    "r": 2,
    "text": "A dragon guards the vault in the south-east. Slay it, then take the stairs."
   }
  ],
  "thin": 1
 }
];
