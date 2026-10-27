// Pixel sprites for the critters, villagers and enemies. Each sprite is built from a handful of
// shapes (ellipses, rectangles, polygons, single pixels) on a small grid, then given a dark
// outline and top-lit shading automatically, so they all share one look. They are recoloured
// from a base colour, cached, and blitted one art pixel per sprite pixel, snapped to the pixel grid.

const SPR_OUT = "#2e222f";
const SPR_DEFAULT = { k: "#1a1218", h: "#ffffff", n: "#cf657f", r: "#ed8099", y: "#f9c22b", w: "#f1e6d0", t: "#ffffff" };
const SPR_CACHE = new Map();

// ---- shape helpers: all return plain objects the rasteriser understands ----
const SE = (cx, cy, rx, ry, c) => ({ t: "e", cx, cy, rx, ry, c });
const SR = (x, y, w, h, c) => ({ t: "r", x, y, w, h, c });
const SP = (pts, c) => ({ t: "p", pts, c });
const SX = (x, y, c) => ({ t: "x", x, y, c });
const SL = (x1, y1, x2, y2, th, c) => ({ t: "l", x1, y1, x2, y2, th, c });

function inPoly(pts, x, y) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// Shapes go on a grid in order. Key 'a' is the base colour and is shaded (light on top edges, dark
// on bottom edges). Every empty pixel touching a filled one becomes the outline.
function rasterise(w, h, shapes, k, axp, ayp) {
  // k is grid pixels per world unit and (axp, ayp) the grid pixel of the world origin; both default to a plain grid
  k = k || 1; axp = axp || 0; ayp = ayp || 0;
  const g = new Array(w * h).fill(null);
  for (const s of shapes) {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const px = (x + 0.5 - axp) / k, py = (y + 0.5 - ayp) / k;
      let hit = false;
      if (s.t === "e") hit = ((px - s.cx) / s.rx) ** 2 + ((py - s.cy) / s.ry) ** 2 <= 1;
      else if (s.t === "r") hit = px >= s.x && px <= s.x + s.w && py >= s.y && py <= s.y + s.h;
      else if (s.t === "p") hit = inPoly(s.pts, px, py);
      else if (s.t === "l") {
        const dx = s.x2 - s.x1, dy = s.y2 - s.y1, len2 = dx * dx + dy * dy || 1;
        const u = Math.max(0, Math.min(1, ((px - s.x1) * dx + (py - s.y1) * dy) / len2));
        hit = Math.hypot(px - (s.x1 + dx * u), py - (s.y1 + dy * u)) <= Math.max(s.th / 2, 0.5 / k);
      } else hit = Math.floor(s.x * k + axp) === x && Math.floor(s.y * k + ayp) === y;
      if (hit) g[y * w + x] = s.c === undefined || s.c === null ? null : s.c;
    }
  }
  const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? null : g[y * w + x];
  const out = g.slice();
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (g[y * w + x] !== "a") continue;
    if (!at(x, y - 1) || at(x, y - 1) === "o") out[y * w + x] = "b";
    else if (!at(x, y + 1)) out[y * w + x] = "c";
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (g[y * w + x]) continue;
    if (at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1)) out[y * w + x] = "o";
  }
  return out;
}

function sprColors(base, pal) {
  return Object.assign({ o: SPR_OUT, a: shadeToHex(base, 1), b: shadeToHex(base, 1.3), c: shadeToHex(base, 0.7) }, SPR_DEFAULT, pal || {});
}
function shadeToHex(hex, f) {
  const n = parseInt(String(hex).slice(1), 16);
  const c = v => Math.max(0, Math.min(255, Math.round(v * f))).toString(16).padStart(2, "0");
  return "#" + c((n >> 16) & 255) + c((n >> 8) & 255) + c(n & 255);
}

function sprCanvas(w, h, shapes, base, pal, flip, white, k, axp, ayp) {
  const grid = rasterise(w, h, shapes, k, axp, ayp), col = sprColors(base, pal);
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
  const c = cv.getContext("2d");
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const k = grid[y * w + x];
    if (!k) continue;
    c.fillStyle = white ? (k === "o" ? "#c9bfd0" : "#ffffff") : (col[k] || k);
    c.fillRect(flip ? w - 1 - x : x, y, 1, 1);
  }
  return cv;
}

// Draws a sprite canvas with its anchor (ax, ay in sprite pixels) at logical (x, y), snapped to the art grid.
function blitSprite(ctx, cv, x, y, ax, ay, zoom) {
  const M = ctx.getTransform(), z = zoom || 1;
  const px = Math.round(M.a * x + M.c * y + M.e), py = Math.round(M.b * x + M.d * y + M.f);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(cv, px - ax * z, py - ay * z, cv.width * z, cv.height * z);
  ctx.restore();
}

// ---- animals: 24 x 20, facing right, feet on row 18. f is the walk frame (0 or 1). ----
const ANIMAL_W = 24, ANIMAL_H = 20, ANIMAL_AX = 12, ANIMAL_AY = 18;
const ANIMAL_PAL = {
  fox: { w: "#fbe3c4", t: "#fff6e8" }, rabbit: { w: "#f4ebe0", t: "#ffffff", r: "#e8a9a8" },
  mouse: { w: "#dcd8e2", r: "#f0a8b0", t: "#e8b4b0" }, squirrel: { w: "#e7c9a0" },
  hedgehog: { w: "#e8d8c0" }, badger: { w: "#e8e4ea" }, mole: { w: "#8a6a58", n: "#e7a6a0" },
  owl: { w: "#f1dcb8" },
};

const ANIMALS = {
  fox: f => [
    SE(5, 11, 5, 3, "a"), SE(1.5, 11.5, 2.2, 2, "t"),
    SR(7 + f, 14.5, 2, 4, "c"), SR(10 - f, 14.5, 2, 4, "c"),
    SE(12, 12, 7, 4, "a"), SE(13, 14, 5, 1.4, "w"),
    SR(16 - f, 14.5, 2, 4, "a"), SR(16 - f, 17, 2, 1.5, "c"), SR(14 + f, 14.5, 2, 4, "c"),
    SP([[16, 5], [17, 1], [19, 5]], "a"), SP([[19, 5], [21, 1], [22.5, 5]], "c"), SX(17, 3, "r"),
    SE(18, 8, 4.5, 3.5, "a"), SE(21.5, 9, 2.6, 1.8, "a"), SE(21, 10.5, 2.2, 1, "w"), SE(19, 10, 2.2, 1, "w"),
    SX(23, 9, "k"), SX(19, 7, "k"),
  ],
  rabbit: f => [
    SE(4.5, 12, 2, 2, "t"),
    SR(15 - f, 14.5, 2, 4, "a"), SR(13 + f, 14.5, 2, 4, "c"),
    SE(11, 12, 6, 4.5, "a"), SE(12, 14, 4, 1.5, "w"), SE(8.5, 13, 3.4, 3.4, "b"),
    SR(6 + f, 17, 4, 1.5, "a"),
    SE(16, 2.5, 1.5, 4.5, "c"), SE(19, 3.5, 1.6, 4.4, "a"), SE(19, 4, 0.7, 3, "r"),
    SE(17, 9, 3.6, 3.2, "a"), SE(20, 10, 2, 1.6, "w"), SX(21, 9, "n"), SX(18, 8, "k"),
  ],
  mouse: f => [
    SR(1, 15 + (f ? 0 : 1), 6, 1, "t"), SX(0, 14 + f, "t"),
    SR(7 + f, 16, 1.5, 2.5, "c"), SR(10 - f, 16, 1.5, 2.5, "c"),
    SE(11, 14, 5.6, 3.6, "a"), SE(12, 15.5, 4, 1.2, "w"),
    SR(15 - f, 16, 1.5, 2.5, "a"), SR(13 + f, 16, 1.5, 2.5, "c"),
    SE(16, 9.5, 2.3, 2.3, "c"), SE(19, 10, 2.2, 2.2, "a"), SE(19, 10, 1.1, 1.1, "r"),
    SE(17.5, 13, 3.3, 2.8, "a"), SE(21, 14, 2, 1.4, "a"), SX(23, 14, "n"), SX(18, 12, "k"),
  ],
  squirrel: f => [
    SE(5, 9, 3.6, 7, "c"), SE(5.5, 7.5, 2.2, 5, "a"), SE(7, 3.5, 2.5, 2, "a"),
    SR(9 + f, 17, 3, 1.5, "c"), SR(12 - f, 17, 3, 1.5, "a"),
    SE(11.5, 12.5, 4, 5, "a"), SE(13, 13.5, 2.5, 3.5, "w"),
    SR(12 - f, 13.5, 3, 1.4, "c"),
    SP([[11, 3.5], [11.5, 0.5], [13.5, 3]], "a"), SP([[14, 3], [16, 0.5], [16.5, 3.5]], "c"),
    SR(10, 9.3, 5, 1, "c"),
    SE(13.5, 6.5, 3.4, 3, "a"), SE(16, 7.8, 1.8, 1.3, "w"), SX(17, 7, "n"), SX(14, 5, "k"),
  ],
  hedgehog: f => [
    SR(6 + f, 16.5, 2, 2, "c"), SR(10 - f, 16.5, 2, 2, "c"),
    SE(11, 12.5, 8, 5.2, "c"),
    SP([[3, 11], [4, 6], [6, 9]], "c"), SP([[6, 9], [8, 4], [10, 8]], "c"), SP([[10, 8], [12, 4], [14, 8]], "c"), SP([[14, 8], [16, 5], [17, 10]], "c"),
    SE(11, 13, 7, 4, "a"), SE(10, 9.5, 4, 1.2, "b"),
    SR(14 - f, 16.5, 2, 2, "a"), SR(17 + f, 16.5, 2, 2, "a"),
    SE(19, 14, 3.5, 3, "w"), SE(22, 15, 1.6, 1.4, "w"), SX(23, 15, "n"), SX(20, 13, "k"),
  ],
  badger: f => [
    SE(3.5, 12, 2, 2, "c"),
    SR(6 + f, 15, 2.5, 3.5, "c"), SR(10 - f, 15, 2.5, 3.5, "c"),
    SE(11.5, 12, 8, 5, "a"), SE(12, 8.5, 6, 1.4, "b"),
    SR(15 - f, 15, 2.8, 3.5, "a"), SR(17 + f, 15, 2.8, 3.5, "c"),
    SP([[16, 8], [17, 5.5], [19, 7.5]], "a"), SP([[19.5, 7.5], [21, 5.5], [22.5, 8]], "c"),
    SE(19, 10.5, 4.4, 3.4, "a"), SE(22, 12, 2, 1.4, "a"),
    SR(19.2, 7.2, 2.2, 3.6, "w"), SR(20, 10, 3.2, 2.4, "w"),
    SX(23, 11, "k"), SX(18, 9, "h"), SX(22, 9, "h"),
  ],
  mole: f => [
    SR(7 + f, 16, 2, 2.5, "c"), SR(10 - f, 16, 2, 2.5, "c"),
    SE(11, 13, 7.5, 5, "a"), SE(11, 15, 5, 2, "w"),
    SE(18, 13.5, 3.4, 2.8, "a"), SE(21.5, 14, 2, 1.6, "n"), SX(18, 12, "k"),
    SR(15 - f, 15.5, 3, 3, "n"), SX(18 - f, 18, "w"), SX(16 - f, 18, "w"),
  ],
  owl: f => [
    SE(6, 12, 2, 4.5, "c"), SE(18, 12, 2, 4.5, "c"),
    SE(12, 12, 6, 6, "a"), SE(12, 13, 4, 4.5, "w"),
    SX(10, 12, "b"), SX(12, 12, "b"), SX(14, 12, "b"), SX(11, 14, "b"), SX(13, 14, "b"), SX(10, 16, "b"), SX(12, 16, "b"), SX(14, 16, "b"),
    SR(9, 17.5, 2, 1, "y"), SR(13, 17.5, 2, 1, "y"),
    SP([[7.5, 5], [8, 0.5], [10.5, 4]], "a"), SP([[13.5, 4], [16, 0.5], [16.5, 5]], "a"),
    SE(12, 6.5, 5.4, 4.4, "a"), SE(12, 7, 4.5, 3.4, "b"),
    SE(9.8, 6.8, 1.8, 1.8, "y"), SE(14.2, 6.8, 1.8, 1.8, "y"), SX(9, 6, "k"), SX(14, 6, "k"),
    SX(11, 9, "n"), SX(12, 9, "n"),
  ],
};

// Where armor and weapons sit on each animal, in sprite pixels.
const GEAR_SPOT = {
  fox: { bx: 12, by: 12, rx: 6, ry: 3, px: 17, py: 17 }, rabbit: { bx: 11, by: 12, rx: 5, ry: 3.5, px: 16, py: 17 },
  mouse: { bx: 11, by: 14, rx: 4.5, ry: 2.8, px: 15, py: 17 }, squirrel: { bx: 11, by: 12.5, rx: 3.2, ry: 4, px: 14, py: 16 },
  hedgehog: { bx: 11, by: 13, rx: 6, ry: 3.5, px: 17, py: 17 }, badger: { bx: 11.5, by: 12, rx: 7, ry: 4, px: 17, py: 17 },
  mole: { bx: 11, by: 13, rx: 6, ry: 4, px: 16, py: 17 }, owl: { bx: 12, by: 13, rx: 4, ry: 5, px: 16, py: 17 },
};

function gearShapes(species) {
  const s = GEAR_SPOT[species];
  if (!s) return [];
  const out = [];
  if (G.equip.weapon === "antlerSpear") {
    out.push(SP([[s.bx - 7, s.by + 5], [s.bx - 6, s.by + 6], [s.bx + 7, s.by - 8], [s.bx + 6, s.by - 9]], "#9a7a50"), SP([[s.bx + 5, s.by - 9], [s.bx + 7.5, s.by - 12], [s.bx + 9, s.by - 8]], "#ece2c6"));
  }
  if (G.equip.armor === "thornMail") {
    out.push(SE(s.bx, s.by, s.rx * 0.85, s.ry * 0.85, "#5f8a3c"), SE(s.bx, s.by + s.ry * 0.45, s.rx * 0.8, 1, "#4a3a2a"));
    for (let i = -2; i <= 2; i++) out.push(SX(Math.round(s.bx + i * 2), Math.round(s.by - 1 + (i & 1)), "#9ac85a"));
  }
  if (G.equip.weapon === "clawGlove") {
    out.push(SR(s.px, s.py, 2, 1.6, "#c9a23a"), SX(s.px + 3, s.py - 1, "#f4f0d0"), SX(s.px + 3, s.py, "#f4f0d0"), SX(s.px + 3, s.py + 1, "#f4f0d0"));
  }
  return out;
}

function animalSprite(kind, base, f, flip, white) {
  const gearKey = white ? "" : (kind === "owl" ? "" : (G.equip.weapon || "") + "/" + (G.equip.armor || ""));
  const key = `${kind}|${base}|${f}|${flip ? 1 : 0}|${white ? 1 : 0}|${gearKey}`;
  let cv = SPR_CACHE.get(key);
  if (!cv) {
    const build = ANIMALS[kind] || ANIMALS.fox;
    const shapes = build(f).concat(white || kind === "owl" ? [] : gearShapes(kind));
    cv = sprCanvas(ANIMAL_W, ANIMAL_H, shapes, base, ANIMAL_PAL[kind] || ANIMAL_PAL.fox, flip, white);
    SPR_CACHE.set(key, cv);
  }
  return cv;
}

// A small soft shadow, drawn as a flat dark ellipse (the palette snap turns it into a clean patch).
function spriteShadow(ctx, x, y, rx) {
  ctx.fillStyle = "rgba(20,12,24,.35)";
  ctx.beginPath(); ctx.ellipse(x, y, rx, rx * 0.36, 0, 0, Math.PI * 2); ctx.fill();
}

// Replaces the old vector critters. Same signatures, so every caller keeps working.
function drawCritter(ctx, x, y, species, facing, walkT, scale) {
  const s = DATA.species[species] || DATA.species.fox;
  const moving = walkT !== 0;
  const f = moving ? (Math.floor(walkT * 8) & 1) : 0;
  const bob = moving && f ? -1 : 0;
  spriteShadow(ctx, x, y + 11, 10);
  blitSprite(ctx, animalSprite(species, s.color, f, facing < 0), x, y + 11 + bob, ANIMAL_AX, ANIMAL_AY);
}

function drawNpc(ctx, x, y, color, kind, name) {
  const t = WORLD.time;
  const face = P_playerX() < x ? -1 : 1;
  const idle = Math.floor(t * 1.6 + x) & 1;
  spriteShadow(ctx, x, y + 22, 12);
  blitSprite(ctx, animalSprite(kind, color, 0, kind !== "owl" && face < 0), x, y + 22 - (idle && kind === "owl" ? 0 : 0), ANIMAL_AX, ANIMAL_AY);
  if (name) {
    ctx.font = "12px Georgia";
    ctx.textAlign = "center";
    const w = ctx.measureText(name).width + 12;
    ctx.fillStyle = "rgba(20,26,18,.7)";
    ctx.fillRect(x - w / 2, y + 28, w, 17);
    ctx.fillStyle = "#fff6dc";
    ctx.fillText(name, x, y + 41);
  }
}
function P_playerX() { return typeof P === "object" && P && typeof P.x === "number" ? P.x : 0; }

// Used by the mini-games (carnival targets, mole hills, deeds) in their own local space:
// the sprite's feet land where the old drawing's feet did, a little below the origin.
function drawAnimalLocal(ctx, kind, base, facing, B, walk, opts) {
  const f = walk ? (Math.floor(walk * 0.7) & 1) : 0;
  const cv = animalSprite(kind, base, f, facing < 0 && kind !== "owl");
  const M = ctx.getTransform();
  // feet at local y = 11; centre the sprite on local x = 0
  blitSprite(ctx, cv, 0, 11 + (B || 0), ANIMAL_AX, ANIMAL_AY);
}

// ---- enemies: 20 x 18, drawn around the foe's centre. Bosses are drawn at twice the size. ----
const ENEMY_W = 20, ENEMY_H = 18, ENEMY_AX = 10, ENEMY_AY = 16;
const ENEMIES = {
  beetle: f => [
    SR(4, 12.5 + f, 1.2, 3, "c"), SR(8, 13, 1.2, 3, "c"), SR(12, 12.5 + (1 - f), 1.2, 3, "c"),
    SE(9, 9.5, 7, 5, "a"), SR(8.6, 5, 1, 9, "c"), SE(7, 7, 2.4, 1.3, "b"),
    SE(16.5, 10, 3, 2.8, "c"), SX(18, 9, "y"), SX(19, 12, "w"), SX(18, 12, "w"),
    SR(17.5, 5.5, 1, 3.5, "c"), SR(15.5, 6, 1, 3, "c"),
  ],
  cap: f => [
    SR(6 + f, 14.5, 3, 1.8, "s"), SR(11 - f, 14.5, 3, 1.8, "s"),
    SR(6.5, 9.5, 7, 6, "s"), SR(11.5, 10, 2, 5, "d"),
    SX(8, 12, "k"), SX(12, 12, "k"), SX(9, 14, "k"), SX(10, 14, "k"), SX(11, 14, "k"),
    SE(10, 6.5, 8, 5.2, "a"), SE(6.5, 5, 1.4, 1.2, "w"), SE(12, 4.2, 1.6, 1.3, "w"), SE(14.5, 7.5, 1, 1, "w"),
  ],
  thorn: f => [
    SP([[10, 0.5], [12, 5], [8, 5]], "c"), SP([[10, 17], [12, 13], [8, 13]], "c"), SP([[0.5, 9], [5, 7], [5, 11]], "c"), SP([[19.5, 9], [15, 7], [15, 11]], "c"),
    SP([[3, 2.5], [8, 5.5], [5.5, 8]], "c"), SP([[17, 2.5], [14.5, 8], [12, 5.5]], "c"), SP([[3, 15.5], [5.5, 10.5], [8, 13]], "c"), SP([[17, 15.5], [12, 13], [14.5, 10.5]], "c"),
    SE(10, 9, 5.5 + f * 0.4, 5.5 + f * 0.4, "a"),
    SX(8, 8, "y"), SX(12, 8, "y"), SX(8, 9, "k"), SX(12, 9, "k"), SX(9, 11, "k"), SX(10, 11, "k"), SX(11, 11, "k"),
  ],
  frost: f => [
    SE(10, 14.5 + f * 0.6, 3.2, 2, "b"), SE(10 + (f ? 1 : -1), 16.3, 1.6, 1.3, "b"),
    SP([[7, 4], [8, 0.5], [9.5, 3.5]], "b"), SP([[10.5, 3.5], [12, 0.5], [13, 4]], "b"),
    SE(10, 8.5, 5.4, 5.5, "a"), SE(10, 7, 3.5, 2.5, "b"),
    SX(8, 8, "k"), SX(12, 8, "k"), SX(8, 7, "h"), SX(12, 7, "h"), SX(9, 11, "k"), SX(10, 11, "k"), SX(11, 11, "k"),
  ],
  wisp: f => [
    SP([[6.5, 10], [10 + (f ? 1.2 : -1.2), 17.5], [13.5, 10]], "b"),
    SE(10, 8, 4.4, 4.4, "a"), SE(10, 8, 2.2, 2.2, "w"), SX(9, 7, "k"), SX(11, 7, "k"),
  ],
  blob: f => [
    SE(10, 11 + f * 0.5, 7.4, 5 - f * 0.4, "a"), SE(8, 9, 2.5, 1.2, "b"),
    SX(7, 9, "h"), SX(12, 9, "h"), SX(7, 10, "k"), SX(12, 10, "k"), SX(9, 13, "k"), SX(10, 13, "k"), SX(11, 13, "k"),
  ],
};
const ENEMY_PAL = { s: "#e9dcc0", d: "#c9bba0", y: "#f9c22b" };

function enemyFamily(kind) {
  if (kind === "thornBeetle" || kind === "meteorBeetle" || kind === "ashBeetle" || kind === "cinderMite") return "beetle";
  if (kind === "gloomcap" || kind === "sporeHulk" || kind === "gloomMatriarch") return "cap";
  if (kind === "blightSprite" || kind === "thornwraith" || kind === "bramblemaw" || kind === "blightheart" || kind === "emberStag") return "thorn";
  if (kind === "frostWisp" || kind === "frostHound" || kind === "icewyrm" || kind === "starwarden") return "frost";
  if (kind === "moonWisp" || kind === "starSprite" || kind === "emberWisp") return "wisp";
  return "blob";
}

function enemySprite(fam, color, f, flip, white) {
  const key = `E|${fam}|${color}|${f}|${flip ? 1 : 0}|${white ? 1 : 0}`;
  let cv = SPR_CACHE.get(key);
  if (!cv) {
    const n = parseInt(color.slice(1), 16), lum = ((n >> 16) & 255) * 0.3 + ((n >> 8) & 255) * 0.6 + (n & 255) * 0.1;
    cv = sprCanvas(ENEMY_W, ENEMY_H, (ENEMIES[fam] || ENEMIES.blob)(f), shadeToHex(color, lum > 120 ? 1.05 : 1.5), ENEMY_PAL, flip, white);
    SPR_CACHE.set(key, cv);
  }
  return cv;
}

function drawEnemyBody(ctx, e, t) {
  const fam = enemyFamily(e.kind);
  const bob = e.dead ? 0 : Math.sin(t * 4 + e.x * 0.05) * (e.boss ? 1.5 : 2.5);
  const face = (typeof EX !== "undefined" && EX.px < e.x) ? -1 : 1;
  const zoom = e.r >= 34 ? 2 : 1;
  const f = Math.floor(t * 5 + e.x * 0.1) & 1;
  const a = ctx.getTransform().a;
  spriteShadow(ctx, e.x, e.y + e.r * 0.9, e.r);
  blitSprite(ctx, enemySprite(fam, e.def.color, f, face < 0, e.flash > 0), e.x, e.y + (8 * zoom) / a + bob, ENEMY_AX, ENEMY_AY, zoom);
}
