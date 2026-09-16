# Gloomstep Dungeon

A browser-based roguelike dungeon crawler built with TypeScript and HTML5 Canvas.

Descend through procedurally generated dungeons, fight monsters, collect loot, and see how deep you can go before the darkness claims you.

## Features

- **Procedural dungeons** — Every run generates a unique dungeon layout using BSP (Binary Space Partition)
- **15 playable characters** — Choose from Humans, Elves, Dwarves, and Drow across classes like Warrior, Mage, Rogue, and more
- **35 unique monsters** — Enemies scale across 10 depth tiers, from Cave Bugs to Liches
- **45+ items** — Swords, axes, hammers, bows, armor, shields, helmets, potions, and scrolls
- **Turn-based combat** — Every move counts; plan your approach carefully. Defense mitigates damage proportionally, so armor always helps but never makes you immune
- **Equipment system** — Six gear slots (weapon, body, off-hand, head, hands, legs); bonuses from every equipped piece stack
- **Class abilities** — Every class has a signature ability on a turn cooldown, fired with Q
- **Treasure** — Gold scattered through every level and dropped by slain monsters; collected automatically as you walk over it
- **Field of view** — Explore using recursive shadowcasting; what lurks in the dark?
- **Message log** — The last 200 messages, scrollable with L
- **Permadeath** — One life per run. High scores are saved locally
- **A final floor** — Depth 10 has no way down; slay the Overlord to win
- **Save & resume** — Your run autosaves every turn; press C on the hero screen to pick up where you left off
- **Daily challenge** — Press D on the hero screen: everyone gets the same dungeon and hero for the day, one attempt, result saved locally
- **Touch controls & phone layout** — Play on a phone or tablet with an on-screen d-pad and tappable menus; narrow screens get a 15×13 map and single-column menus
- **Share your runs** — Post your results to Mastodon, Bluesky, or copy to clipboard

## How to Play

### Controls

| Key | Action |
|-----|--------|
| WASD / Arrow Keys | Move |
| G | Pick up item |
| I | Open / close inventory |
| Q | Use class ability |
| L | Open / close the message log (arrows or W/S scroll, PgUp/PgDn page, Home/End jump) |
| C | Continue saved run (hero screen) |
| D | Toggle daily challenge (hero screen) |
| > | Descend stairs |
| . | Wait a turn |
| 1-9, 0 | Use inventory item 1-10 (inventory open) |
| Shift+1-9, Shift+0 | Drop inventory item 1-10 (inventory open) |
| Esc | Close inventory |

### Class Abilities

Each class has one ability. Press **Q** to use it; the HUD shows when it is ready.

| Class | Ability | Effect | Cooldown |
|-------|---------|--------|----------|
| Warrior | Cleave | Strike every adjacent enemy with a normal attack | 10 turns |
| Barbarian | Rage | +3 ATK for 6 turns | 15 turns |
| Mage | Arcane Bolt | 8 + level damage to the nearest enemy in sight (range 6) | 6 turns |
| Rogue | Vanish | Monsters lose sight of you for 5 turns | 15 turns |
| Scout | Survey | Reveals the map layout within 12 tiles | 30 turns |
| Sentinel | Guard Stance | +4 DEF for 6 turns | 15 turns |
| Healer | Mend | Heal 30% of max HP | 12 turns |

Abilities that find no target (Cleave with nothing adjacent, Arcane Bolt with nothing in sight, Mend at full health) do not fire and do not cost a turn. Using Rage or Guard Stance again while active refreshes the duration rather than stacking.

### Touch Controls

On touch devices an on-screen d-pad (with wait in the centre) and Grab, Bag, Skill, Descend, and Log buttons appear under the map. While the log is open the d-pad scrolls it. Every other screen is tappable too: tap a hero card and then **START** on the hero screen (or the Continue banner to resume), tap an inventory row to use it or its `[drop]` label to drop it, tap the close mark or outside the panel to close the inventory, and tap the share options or "play again" on the game over screen.

Below 600 pixels of width the game switches to a compact layout: the map shows 15×13 tiles with a reflowed HUD, and the hero, inventory, and game over screens use a taller single-column canvas. Rotating or resizing switches layouts without losing your run.

### Tips

- Bump into a monster to attack it. Damage is your ATK scaled down by the target's DEF (equal DEF halves a hit) with a small random swing, and a hit always does at least 1
- Pick up weapons and armor, then open inventory and press their number to equip them
- Each piece of gear has its own slot: weapons, body armor, shields (off-hand), helmets (head), gauntlets (hands), and greaves (legs). Equipping into an occupied slot swaps the old piece back into your pack
- Potions are consumed immediately when used; weapons and armor are equipped
- Walk over gold (`$`) to collect it automatically — it adds to your score
- Monsters have a chance to drop gold when slain; deeper monsters drop more
- Find the stairs down (`>`) to descend to the next depth
- Deeper floors have tougher monsters but better loot and more valuable treasure. Newly unlocked gear is the most common find, and weapons or armor from six or more floors up stop appearing entirely. Potions and scrolls always stay in the loot pool. Depth 10 is the final floor: there are no stairs down, and the run ends in victory when the Overlord falls
- Check your inventory to see every slot and how your combined equipment affects your ATK and DEF stats
- Levelling up grants +5 HP and +1 ATK every level, and +1 DEF every second level; deeper monsters have far more HP, so keep upgrading your weapon
- Drop unwanted items with Shift+number to free up inventory space
- Your class ability is often the difference in a tough fight; Rogues can Vanish to slip past a room, Scouts can Survey to find the stairs
- The Overlord waits in the room farthest from where you arrive on depth 10, guarded by two deep-floor monsters. Buff up, bring potions, and open with your ability
- The daily challenge rolls over at midnight UTC. Its hero and dungeon come from the date, so compare scores with friends by sharing the result
- Every run is driven by a seed, so the same seed and the same moves always play out the same way
- The game saves after every turn, so closing the tab is safe. Dying clears the save, and starting a new hero asks once before erasing it
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
  data/         Character, monster, item, and ability definitions
  dungeon/      BSP dungeon generation and population
  ecs/          Entity factory
  render/       Canvas rendering, sprites, HUD, camera
  systems/      Input, movement, combat, damage, AI, FOV, inventory, equipment, abilities, targeting, persistence, rng, daily, scoring
  ui/           Tap regions for canvas screens and the touch control bar
  constants.ts  Game configuration
  types.ts      Core type definitions
  game.ts       Main game orchestrator
  main.ts       Entry point
public/
  sprites/      Character, monster, and item sprite images (32x32 PNG)
tests/          Vitest unit tests and shared test helpers
```
