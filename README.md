# Oscar The Knight

A self-contained hand-painted 2D platformer built with HTML, CSS, and Canvas.

Oscar enters the Lantern Run: a 30-room rogue-lite platforming chain with parkour rooms, elite fights, gauntlets, shops, fountains, altars, relic choices, and permanent Sun Sigil upgrades.

The current build includes an animated prologue, procedural background music, a working Hall of Dawn upgrade screen, and swappable equipment for weapon, armor, and charm slots.

## Run Locally

```bash
npm start
```

Then open `http://localhost:4173`.

## Controls

- Move: arrow keys or A/D
- Jump: Space, W, or Up
- Strike: J, K, or X
- Dash: Shift or L after unlocking Dawn Dash
- Pause: P or Esc
- Mobile: on-screen controls

## Progression

- Sun Sigils are permanent currency earned during runs.
- Skills are permanent upgrades bought in the Hall of Dawn.
- Equipment is free to swap before each run and changes Oscar's stats immediately.

## Deploy

```bash
npm run deploy:vercel
```

The game is also ready for GitHub Pages from the repository root.
