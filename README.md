# Gloomstep Dungeon

A browser-based roguelike dungeon crawler built with TypeScript and HTML5 Canvas.

Descend through procedurally generated dungeons, fight monsters, collect loot, and see how deep you can go before the darkness claims you.

## Features

- **Procedural dungeons** — Every run generates a unique dungeon layout using BSP (Binary Space Partition)
- **15 playable characters** — Choose from Humans, Elves, Dwarves, and Drow across classes like Warrior, Mage, Rogue, and more
- **35 unique monsters** — Enemies scale across 10 depth tiers, from Cave Bugs to Liches
- **45+ items** — Swords, axes, hammers, bows, armor, shields, helmets, potions, and scrolls
- **Turn-based combat** — Every move counts; plan your approach carefully
- **Equipment system** — Six gear slots (weapon, body, off-hand, head, hands, legs); bonuses from every equipped piece stack
- **Treasure** — Gold scattered through every level and dropped by slain monsters; collected automatically as you walk over it
- **Field of view** — Explore using recursive shadowcasting; what lurks in the dark?
- **Permadeath** — One life per run. High scores are saved locally
- **Share your runs** — Post your results to Mastodon, Bluesky, or copy to clipboard

## How to Play

### Controls

| Key | Action |
|-----|--------|
| WASD / Arrow Keys | Move |
| G | Pick up item |
| I | Open / close inventory |
| > | Descend stairs |
| . | Wait a turn |
| 1-9, 0 | Use inventory item 1-10 (inventory open) |
| Shift+1-9, Shift+0 | Drop inventory item 1-10 (inventory open) |
| Esc | Close inventory |

### Tips

- Bump into a monster to attack it
- Pick up weapons and armor, then open inventory and press their number to equip them
- Each piece of gear has its own slot: weapons, body armor, shields (off-hand), helmets (head), gauntlets (hands), and greaves (legs). Equipping into an occupied slot swaps the old piece back into your pack
- Potions are consumed immediately when used; weapons and armor are equipped
- Walk over gold (`$`) to collect it automatically — it adds to your score
- Monsters have a chance to drop gold when slain; deeper monsters drop more
- Find the stairs down (`>`) to descend to the next depth
- Deeper floors have tougher monsters but better loot and more valuable treasure
- Check your inventory to see every slot and how your combined equipment affects your ATK and DEF stats
- Drop unwanted items with Shift+number to free up inventory space
- Actions that do nothing (picking up from an empty tile, using an empty slot) do not cost a turn
- Monsters never fight each other; only you can be attacked

## Development

### Prerequisites

- Node.js 20.19+ (or 22.12+), as required by Vite 8

### Setup

```bash
npm install
npm run dev
```

The game runs at `http://localhost:5173`.

### Testing

```bash
npm test
```

Unit tests live in `tests/` and run with [Vitest](https://vitest.dev). They cover the pure game systems (movement, combat, inventory, input mapping) and the renderer's entity pass, using a recording stand-in for the canvas context so no browser is needed.

### Tech Stack

- TypeScript
- HTML5 Canvas (no game framework)
- Vite
- Vitest (unit tests)

### Project Structure

```
src/
  data/         Character, monster, and item definitions
  dungeon/      BSP dungeon generation and population
  ecs/          Entity factory
  render/       Canvas rendering, sprites, HUD, camera
  systems/      Input, movement, combat, AI, FOV, inventory, equipment, scoring
  constants.ts  Game configuration
  types.ts      Core type definitions
  game.ts       Main game orchestrator
  main.ts       Entry point
public/
  sprites/      Character, monster, and item sprite images (32x32 PNG)
tests/          Vitest unit tests and shared test helpers
```
