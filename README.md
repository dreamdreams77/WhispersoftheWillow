# Whispers of the Great Willow

A woodland roguelite and life simulation, played in the browser. Tend a village under a great blighted willow, make friends with its creatures, gather and craft, then venture into the corrupted forest to heal the Willow.

## Play it

Open `index.html` in a modern browser. No build step and no server are needed.

Or host it for free with GitHub Pages:

1. Push these files to the root of a repository (`index.html` must sit at the top level).
2. In the repository, go to **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, pick `main` and the `/ (root)` folder, then save.
4. Your game will be live at `https://<your-user>.github.io/<repository-name>/` after a minute or two.

## Controls

| Action | Keyboard | Touch |
| --- | --- | --- |
| Move | Arrow keys or WASD | D-pad |
| Act, talk, whack, throw | Z, Space, Enter or E | Act |
| Strike (expedition) | X or J | Strike |
| Dodge (expedition) | C or Shift | Dodge |
| Menu / journal | M or Tab | Menu |
| Bomb (expedition) | Q | (none) |
| Mute sound | N | (none) |
| Close a panel | Esc | Close |

## The village

- **Wishing Well**: make one wish a day for a small gift.
- **Notice Board**: the village posts news that changes as you play.
- **Mole Hills, Squirrel's Stump, Stone Skip Creek and Firefly Pond**: the village mini-games below.

## Village mini-games

Each mini-game can be played once per village day, and earns Willowlight.

- **Firefly Pond**: catch the fireflies.
- **Stone Skip Creek**: time your throws in the gold zone.
- **Squirrel's Stump**: repeat the squirrel's acorn stash, one more acorn each level.
- **Mole Hills**: whack the dormice and leave the thornlings alone, forty seconds.
- **Ring Toss**: aim along the board and toss five rings at the pegs. The centre peg is worth five.
- **Marigold's Cart**: a hedgehog peddler visits every third day (day 3, 6, 9 and so on) at the southern edge of the village. Buy ingredients with Willowlight, sell what you gather, or open a surprise parcel.
- **Options and guide**: on the title screen and in the in-game menu. Volume slider and mute, save now, export your save to a file, import it back, and a two-tap reset. The How to Play guide is optional.
- **Visible gear**: Thorn Mail, Lightning Claws and the Antler Spear show on your character.
- **Deeds and ranks**: a menu tab with 26 gentle goals. Each pays a little Willowlight, once, and your rank rises as you earn them (Sproutling up to Friend of the Willow). Higher ranks pay more for errands and earn a discount from Marigold.
- **Errands**: read the Notice Board each day for a small errand from a villager. Bring them the item for Willowlight and friendship.
- **Carnival Midway** (the striped tent near the Willow): five fairground games, one try each per day. **Acorn Gallery** (shooting gallery), **High Striker** (time the swing to ring the bell), **Hunt the Acorn** (follow the shells), **Duck Pond** (hook the ducks), **Berry Basket** (catch the harvest, dodge the burrs). Score in all five at least once to become Midway Champion.

## Atmosphere and expeditions

- **Day and night**: the village clock runs through dawn, day, dusk and night (four minutes a day). Lamps, windows, the lighthouse, the Willow and the gates glow in the dark, and the player carries a soft light. Moonlit and stormy weather darken the day too.
- **Living village**: critters walk behind trees and huts, grass sways and bends away from you, and each season has its own drifting petals, pollen, leaves or snow.
- **Torchlit expeditions**: rooms are dim, with light pooling around you, doors, foes, relics and projectiles.
- **Combat feel**: hit-stop, screen shake, knockback and stagger, slash swooshes, damage numbers, death bursts, dodge afterimages and a red pulse at low health.
- **Eight new relics**: Briar Pact and Glass Acorn (cursed), Stormcap, Leech Moss, Echo Bark, Dewdrop Veil, Dust Devil and Magpie's Coin, plus five new resonances.
- **Relic Altar**: a new room type that offers three relics. Take one, or leave them for a little health.
- **Elite modifiers**: elites are Shielded, Thorned, Volatile, Brooding or Frenzied, each with its own colored aura.

## Pixel-art look

The whole game is drawn small and scaled up with hard edges, and every pixel is snapped to one shared palette (Resurrect 64 plus a few woodland tones) with an ordered dither, so soft gradients and lighting break into crisp bands. Text is drawn sharp on top in the Jersey 10 pixel font, which loads from Google Fonts (falling back to a plain sans-serif offline). The page's own panels and buttons use square corners and hard shadows to match. All of it lives in `pixel.js`, the `#overlay` canvas and the last block of `style.css`.

## Sprites and expedition floors

- **Pixel sprites** (`sprites.js`): the eight animals (player species and villagers) and the enemy families are built from small shape lists on a grid, then given a dark outline and top-lit shading automatically. They are recoloured from a base colour, show your worn armor and weapons, and are drawn one sprite pixel per art pixel. Bosses are drawn at double size.
- **Expedition floors** (`floors.js`): every room gets its own floor baked at the exact art resolution from the region's palette. Flagstone for the Hollows, Grove, Heartwood and Catacombs, dithered noise terrain for the soil, moss and mud regions, plus pebbles, tufts, flowers and puddles. Walls are staggered bricks in the region's stone.

- **Pixel props** (`props.js`): trees, huts, the well, notice board, scarecrow, flower beds, lamps, shrine, gates, the Midway tent, the lighthouse, the peddler's cart, gathering bushes, companions and the things found in expedition rooms (altar, chest, shrine, signpost, portals) are drawn from shape lists at the current art-pixel scale, so their proportions hold on every screen while outlines stay one pixel wide. The village ground is a dithered noise terrain painted at the exact art resolution.

## Bosses, building and fishing

- **Boss phases**: every guardian has three phases. From two thirds health it adds telegraphed ground slams and thorn volleys. From one third it fights faster and summons help. A health bar with phase notches shows along the bottom.
- **Title cards**: entering a region, a deeper floor or a boss room shows a title card.
- **Builder's Board** (west of the Willow): spend materials and Willowlight to raise a **Fishing Dock**, **Garden Plot** (a seasonal crop each day), **Apiary** (honey each day), **Lantern Walk** (a quarter more light in the gloom) and **Training Post** (+8% strike damage).
- **Fishing** (needs the Dock): six casts a day. Cast, wait for the bite, hook it, then hold Z to keep the marker in the gold zone. Season, hour and weather change what bites, from minnows to the Golden Koi.
- **Cooking**: fish and honey make dishes at the Kitchen. Eat one from the Satchel for a blessing on your next expedition.

## Files

- `index.html`: the page, with the title screen, HUD, menu and touch controls.
- `style.css`: layout and styling, including the phone layout.
- `data.js`, `starfall.js`, `depth.js`: all the content (villagers, items, recipes, regions, lore, dialogue).
- `core.js`, `world.js`, `villagemore.js`, `combat.js`, `ui.js`, `main.js`: game logic, village, expeditions, menus and the main loop.
- `minigame.js`, `skipgame.js`, `acorngame.js`, `whackgame.js`, `ringtoss.js`: the village mini-games.
- `carnival.js`: the Carnival Midway tent and its five games.
- `deeds.js`: the Deeds list, ranks, daily errands and Marigold the peddler.
- `options.js`: the volume slider, save export and import, reset, and the optional How to Play guide.
- `sprites.js`: the pixel sprites for animals, villagers and enemies.
- `props.js`: pixel props for the village and expedition rooms, and the village grass.
- `floors.js`: the baked pixel floors and brick walls for expeditions.
- `pixel.js`: the low-resolution pixel renderer, palette snapping and sharp text overlay.
- `fx.js`: particles, hit-stop and shake, the lighting layer, grass and seasonal air.
- `relics2.js`: the new relics and resonances, the Relic Altar and elite modifiers.
- `boss.js`: boss phases, the boss bar and title cards.
- `fishing.js`: the fishing game, fish, honey and dishes.
- `builds.js`: the Builder's Board and everything it raises.
- `gear.js`: the armor and weapons drawn on the player, and their Satchel icons.
- `gameart.js`: the shared look of the mini-games.
- `audio.js`: sound effects.

Saves are kept in your browser's local storage.
