// Expedition floors and walls in pixel art. Each room gets its own floor, baked once at the exact
// art resolution (one texel per art pixel) from the region's palette, so mortar lines and speckles
// are always one crisp pixel wide. The walls are staggered bricks in the region's stone.

const FLOORS = {
  default:   { type: "moss",  tones: ["#2c4a2c", "#374e4a", "#2a3a3a"], hi: "#547e64", lo: "#1f3a2a", accent: ["#3f6a34", "#5f8a3c"], bloom: ["#f9c22b", "#f68181", "#8fd3ff"], wall: ["#3a2c22", "#4a3a2a", "#5a4630"], wallHi: "#7a5a3a" },
  fernwood:  { type: "moss",  tones: ["#2c4a2c", "#374e4a", "#2a3a3a"], hi: "#6a8a5a", lo: "#1f3a2a", accent: ["#3f6a34", "#5f8a3c"], bloom: ["#8fd3ff", "#f68181", "#fbff86"], wall: ["#374e4a", "#2a3a3a", "#3f5a46"], wallHi: "#6a8a5a" },
  thicket:   { type: "earth", tones: ["#4c3e24", "#4a3a2a", "#3a2c22"], hi: "#7a5a3a", lo: "#2a1e16", accent: ["#676633", "#676633"], bloom: ["#c32454", "#e6904e"], wall: ["#3a2c22", "#4a3a2a", "#2c2a24"], wallHi: "#7a5a3a" },
  hollows:   { type: "flag",  tones: ["#2a3a3a", "#313638", "#374e4a"], hi: "#547e64", lo: "#1c2a2a", accent: ["#0b8a8f", "#0eaf9b"], bloom: ["#30e1b9", "#8ff8e2"], wall: ["#2a3a3a", "#374e4a", "#313638"], wallHi: "#547e64" },
  marsh:     { type: "mud",   tones: ["#2c4a2c", "#374e4a", "#2a3a3a"], hi: "#547e64", lo: "#1f3a2a", accent: ["#3f6a34", "#3f6a34"], bloom: ["#cddf6c", "#fbff86"], water: "#0b5e65", waterHi: "#0b8a8f", wall: ["#374e4a", "#2c4a2c", "#313638"], wallHi: "#547e64" },
  grove:     { type: "flag",  tones: ["#625565", "#7f708a", "#6a6a8a"], hi: "#c7dcd0", lo: "#3e3546", accent: ["#c7dcd0", "#ffffff"], bloom: ["#8fd3ff", "#ffffff"], wall: ["#625565", "#7f708a", "#484a77"], wallHi: "#c7dcd0" },
  heartwood: { type: "flag",  tones: ["#45293f", "#3e3546", "#5a3050"], hi: "#905ea9", lo: "#2e222f", accent: ["#6b3e75", "#905ea9"], bloom: ["#ed8099", "#f04f78"], wall: ["#3e3546", "#45293f", "#2e222f"], wallHi: "#7f708a" },
  ashen:     { type: "earth", tones: ["#3a2c22", "#4a3a2a", "#2e222f"], hi: "#625565", lo: "#1a1218", accent: ["#4c3e24", "#625565"], bloom: ["#fb6b1d", "#f9c22b"], wall: ["#3e3546", "#3a2c22", "#2e222f"], wallHi: "#625565" },
  catacombs: { type: "flag",  tones: ["#3e3546", "#484a77", "#34304a"], hi: "#7f708a", lo: "#241c30", accent: ["#6b3e75", "#7f708a"], bloom: ["#c7dcd0", "#eaaded"], wall: ["#34304a", "#3e3546", "#241c30"], wallHi: "#7f708a" },
  starfall:  { type: "moss",  tones: ["#323353", "#2e2f4a", "#3a3f6a"], hi: "#484a77", lo: "#1f2038", accent: ["#484a77", "#4d65b4"], bloom: ["#ffffff", "#8fd3ff", "#eaaded"], wall: ["#323353", "#484a77", "#2e2f4a"], wallHi: "#4d65b4" },
};

function mulberry32(a) {
  return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
function packHex(hex) { const n = parseInt(hex.slice(1), 16); return (255 << 24) | ((n & 255) << 16) | (((n >> 8) & 255) << 8) | ((n >> 16) & 255); }

const BAYER_F = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

// Smooth value noise on a lattice: returns a function (x, y) -> 0..1.
function noiseField(w, h, cell, rnd) {
  const gw = Math.ceil(w / cell) + 2, gh = Math.ceil(h / cell) + 2, g = new Float32Array(gw * gh);
  for (let i = 0; i < g.length; i++) g[i] = rnd();
  return (x, y) => {
    const fx = x / cell, fy = y / cell, ix = fx | 0, iy = fy | 0;
    let tx = fx - ix, ty = fy - iy;
    tx = tx * tx * (3 - 2 * tx); ty = ty * ty * (3 - 2 * ty);
    const a = g[iy * gw + ix], b = g[iy * gw + ix + 1], c = g[(iy + 1) * gw + ix], d = g[(iy + 1) * gw + ix + 1];
    return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
  };
}

function genFloor(cfg, w, h, a, rnd) {
  const buf = new Uint32Array(w * h);
  const T = cfg.tones.map(packHex), HI = packHex(cfg.hi), LO = packHex(cfg.lo);
  const ACC = cfg.accent.map(packHex), BLOOM = cfg.bloom.map(packHex);
  const L = v => Math.max(1, Math.round(v * a));
  const px = (x, y, c) => { if (x >= 0 && y >= 0 && x < w && y < h) buf[y * w + x] = c; };
  const rect = (x, y, ww, hh, c) => { for (let yy = y; yy < y + hh; yy++) for (let xx = x; xx < x + ww; xx++) px(xx, yy, c); };
  const pick = arr => arr[(rnd() * arr.length) | 0];
  const blobs = (n, rmin, rmax, cols, dens) => {
    for (let i = 0; i < n; i++) {
      const cx = (rnd() * w) | 0, cy = (rnd() * h) | 0, r = L(rmin + rnd() * (rmax - rmin)), c = pick(cols);
      for (let yy = cy - r; yy <= cy + r; yy++) for (let xx = cx - r; xx <= cx + r; xx++) {
        const d = Math.hypot((xx - cx) / 1.4, yy - cy);
        if (d < r * (0.86 + 0.14 * rnd()) && rnd() < dens) px(xx, yy, c);
      }
    }
  };
  rect(0, 0, w, h, T[0]);

  if (cfg.type === "flag") {
    // irregular flagstones in rows, each with its own tone, a lit top-left edge and dark mortar
    let y = 0;
    while (y < h) {
      const rh = L(34 + rnd() * 22);
      let x = -L(rnd() * 40);
      while (x < w) {
        const sw = L(50 + rnd() * 50), tone = pick(T);
        rect(x, y, sw, rh, tone);
        if (rnd() < 0.5) { rect(x, y, sw, 1, HI); rect(x, y, 1, rh, HI); }
        for (let i = 0, n = (sw * rh * 0.035) | 0; i < n; i++) px(x + ((rnd() * sw) | 0), y + ((rnd() * rh) | 0), rnd() < 0.5 ? pick(T) : (rnd() < 0.5 ? LO : HI));
        rect(x + sw - 1, y, 1, rh, LO); rect(x, y + rh - 1, sw, 1, LO);
        x += sw;
      }
      y += rh;
    }
    for (let i = 0; i < 7; i++) {
      let x = (rnd() * w) | 0, y = (rnd() * h) | 0, dx = rnd() < 0.5 ? 1 : -1;
      for (let k = 0, n = L(20 + rnd() * 30); k < n; k++) { px(x, y, LO); x += dx * (rnd() < 0.6 ? 1 : 0); y += rnd() < 0.5 ? 1 : (rnd() < 0.3 ? -1 : 0); }
    }
    blobs(6, 10, 22, ACC, 0.9);
  } else {
    // soil, moss or mud: organic patches of the three tones, with dithered edges like a tileset
    const n1 = noiseField(w, h, L(80), rnd), n2 = noiseField(w, h, L(30), rnd), n3 = noiseField(w, h, L(46), rnd);
    const accT = cfg.type === "moss" ? 0.62 : cfg.type === "earth" ? 0.78 : 0.74;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const bay = (BAYER_F[(y & 3) * 4 + (x & 3)] / 16 - 0.47) * 0.07;
      const v = n1(x, y) * 0.62 + n2(x, y) * 0.38 + bay;
      buf[y * w + x] = v < 0.4 ? T[2] : v < 0.6 ? T[0] : T[1];
      const ac = n3(x, y) + bay;
      if (ac > accT) buf[y * w + x] = ACC[ac > accT + 0.1 ? 1 : 0];
    }
    for (let i = 0, n = (w * h * 0.02) | 0; i < n; i++) px((rnd() * w) | 0, (rnd() * h) | 0, rnd() < 0.6 ? LO : HI);
    if (cfg.type === "mud") {
      const WA = packHex(cfg.water), WH = packHex(cfg.waterHi);
      for (let i = 0; i < 5; i++) {
        const cx = (rnd() * w) | 0, cy = (rnd() * h) | 0, rx = L(26 + rnd() * 34), ry = Math.max(2, L(10 + rnd() * 12));
        for (let yy = cy - ry; yy <= cy + ry; yy++) for (let xx = cx - rx; xx <= cx + rx; xx++) {
          const d = ((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2;
          if (d < 0.8 + 0.2 * rnd() && d <= 1) px(xx, yy, yy === cy - ry + 1 || (yy - cy) % 3 === 0 && rnd() < 0.25 ? WH : WA);
        }
      }
    }
  }

  // small things on the ground: pebbles, grass tufts and flowers
  for (let i = 0, n = L(26); i < n; i++) { const x = (rnd() * w) | 0, y = (rnd() * h) | 0; rect(x, y, 2, 1, HI); px(x + 1, y + 1, LO); px(x, y + 1, LO); }
  for (let i = 0, n = cfg.type === "flag" ? L(8) : L(26); i < n; i++) {
    const x = (rnd() * w) | 0, y = (rnd() * h) | 0, c = pick(ACC);
    px(x, y, c); px(x - 1, y - 1, c); px(x + 1, y - 1, c); px(x, y - 2, c);
  }
  for (let i = 0, n = L(10); i < n; i++) {
    const x = (rnd() * w) | 0, y = (rnd() * h) | 0, c = pick(BLOOM);
    px(x, y, c); px(x - 1, y, c); px(x + 1, y, c); px(x, y - 1, c); px(x, y + 1, c); px(x, y, 0xffd8f0ff);
  }
  return buf;
}

const FLOOR_CACHE = new Map();
function floorTexture(a) {
  const key = `${EX.region}|${EX.depth || 1}|${EX.cur}|${a.toFixed(3)}`;
  let cv = FLOOR_CACHE.get(key);
  if (cv) return cv;
  if (FLOOR_CACHE.size > 40) FLOOR_CACHE.clear();
  const cfg = FLOORS[EX.region] || FLOORS.default;
  const w = Math.ceil(ROOM_W * a), h = Math.ceil(ROOM_H * a);
  let seed = 7;
  for (const ch of key) seed = (seed * 31 + ch.charCodeAt(0)) | 0;
  const buf = genFloor(cfg, w, h, a, mulberry32(seed));
  cv = document.createElement("canvas"); cv.width = w; cv.height = h;
  cv.getContext("2d").putImageData(new ImageData(new Uint8ClampedArray(buf.buffer), w, h), 0, 0);
  FLOOR_CACHE.set(key, cv);
  return cv;
}

function drawExpFloor(region, t) {
  const a = ctx.getTransform().a;
  blitSprite(ctx, floorTexture(a), 0, 0, 0, 0);
  if (EX.depth > 1) { ctx.fillStyle = `rgba(0,0,0,${0.1 * (EX.depth - 1)})`; ctx.fillRect(0, 0, ROOM_W, ROOM_H); }
}

// Walls: staggered bricks, one art pixel of mortar, a lit top edge and a dark bottom edge on every brick.
function stonePiece(x, y, w, h) {
  const cfg = FLOORS[EX.region] || FLOORS.default;
  const a = ctx.getTransform().a, px = 1 / a;
  const hash = (p, q) => { const v = Math.sin(p * 12.9898 + q * 78.233) * 43758.5453; return v - Math.floor(v); };
  ctx.fillStyle = cfg.wall[2];
  ctx.fillRect(x, y, w, h);
  const bh = 13, bw = 34, horiz = w > h;
  for (let by = y, row = 0; by < y + h; by += bh, row++) {
    const off = (row & 1) * bw * 0.5;
    for (let bx = x - off; bx < x + w; bx += bw) {
      const x0 = Math.max(bx, x), x1 = Math.min(bx + bw, x + w), y1 = Math.min(by + bh, y + h);
      if (x1 - x0 < px * 2) continue;
      ctx.fillStyle = cfg.wall[(hash(bx, by) * 3) | 0];
      ctx.fillRect(x0 + px, by + px, x1 - x0 - px, y1 - by - px);
      ctx.fillStyle = cfg.wallHi; ctx.globalAlpha = 0.55;
      ctx.fillRect(x0 + px, by + px, x1 - x0 - px, px);
      ctx.globalAlpha = 1;
      ctx.fillStyle = "rgba(20,12,24,.35)";
      ctx.fillRect(x0 + px, y1 - px, x1 - x0 - px, px);
    }
  }
  // a dark lip where the wall meets the floor
  ctx.fillStyle = "rgba(20,12,24,.55)";
  if (horiz) ctx.fillRect(x, y > ROOM_H / 2 ? y : y + h - px * 2, w, px * 2);
  else ctx.fillRect(x > ROOM_W / 2 ? x : x + w - px * 2, y, px * 2, h);
}
