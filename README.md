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
- **Deeds and ranks**: a menu tab with 23 gentle goals. Each pays a little Willowlight, once, and your rank rises as you earn them (Sproutling up to Friend of the Willow). Higher ranks pay more for errands and earn a discount from Marigold.
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

## Files

- `index.html`: the page, with the title screen, HUD, menu and touch controls.
- `style.css`: layout and styling, including the phone layout.
- `data.js`, `starfall.js`, `depth.js`: all the content (villagers, items, recipes, regions, lore, dialogue).
- `core.js`, `world.js`, `villagemore.js`, `combat.js`, `ui.js`, `main.js`: game logic, village, expeditions, menus and the main loop.
- `minigame.js`, `skipgame.js`, `acorngame.js`, `whackgame.js`, `ringtoss.js`: the village mini-games.
- `carnival.js`: the Carnival Midway tent and its five games.
- `deeds.js`: the Deeds list, ranks, daily errands and Marigold the peddler.
- `options.js`: the volume slider, save export and import, reset, and the optional How to Play guide.
- `fx.js`: particles, hit-stop and shake, the lighting layer, grass and seasonal air.
- `relics2.js`: the new relics and resonances, the Relic Altar and elite modifiers.
- `gear.js`: the armor and weapons drawn on the player, and their Satchel icons.
- `gameart.js`: the shared look of the mini-games.
- `audio.js`: sound effects.

Saves are kept in your browser's local storage.
