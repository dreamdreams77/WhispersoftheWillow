// Pixel-art rendering. The game is drawn onto a small canvas (one art pixel is PX.S screen pixels),
// then every pixel is snapped to one shared 64-colour palette with an ordered dither, so soft
// gradients and lighting break into crisp bands. The small canvas is scaled up with hard edges.
// Text is not pixelated: fillText and strokeText calls are queued and redrawn sharply on an overlay canvas.

// The game's text is written for Georgia; every font set on the canvas is swapped for this one.
const PIXEL_FONT = '"Jersey 10", Tahoma, sans-serif';
const PX = { S: 3, overlay: null, octx: null, q: [], dpr: 1 };

// Resurrect 64, by Kerrie Lake, plus a few woodland tones.
const PALETTE = [
  0x2e222f, 0x3e3546, 0x625565, 0x966c6c, 0xab947a, 0x694f62, 0x7f708a, 0x9babb2, 0xc7dcd0, 0xffffff,
  0x6e2727, 0xb33831, 0xea4f36, 0xf57d4a, 0xae2334, 0xe83b3b, 0xfb6b1d, 0xf79617, 0xf9c22b, 0x7a3045,
  0x9e4539, 0xcd683d, 0xe6904e, 0xfbb954, 0x4c3e24, 0x676633, 0xa2a947, 0xd5e04b, 0xfbff86, 0x165a4c,
  0x239063, 0x1ebc73, 0x91db69, 0xcddf6c, 0x313638, 0x374e4a, 0x547e64, 0x92a984, 0xb2ba90, 0x0b5e65,
  0x0b8a8f, 0x0eaf9b, 0x30e1b9, 0x8ff8e2, 0x323353, 0x484a77, 0x4d65b4, 0x4d9be6, 0x8fd3ff, 0x45293f,
  0x6b3e75, 0x905ea9, 0xa884f3, 0xeaaded, 0x753c54, 0xa24b6f, 0xcf657f, 0xed8099, 0x831c5d, 0xc32454,
  0xf04f78, 0xf68181, 0xfca790, 0xfdcbb0,
  // extra earth and leaf tones, so the village's browns and greens don't drift toward pink or olive
  0x8a6a4a, 0xb08a5c, 0xd2b07a, 0x5a4630, 0x7a5a3a, 0x2c4a2c, 0x3f6a34, 0x5f8a3c,
  0x7aa84a, 0x1f3a2a, 0x6a8a5a, 0x9a7a52, 0x3a2c22, 0x4a3a2a, 0xe8d8a8, 0x2a3a3a,
];
const PAL_RGB = new Uint8Array(PALETTE.length * 3);
PALETTE.forEach((c, i) => { PAL_RGB[i * 3] = (c >> 16) & 255; PAL_RGB[i * 3 + 1] = (c >> 8) & 255; PAL_RGB[i * 3 + 2] = c & 255; });

// 5 bits per channel: the nearest palette colour for every cell of the colour cube.
const PAL_LUT = new Uint8Array(32768);
(function buildLut() {
  for (let r = 0; r < 32; r++) for (let g = 0; g < 32; g++) for (let b = 0; b < 32; b++) {
    const R = r * 8 + 4, G2 = g * 8 + 4, B = b * 8 + 4;
    let best = 0, bd = Infinity;
    for (let i = 0; i < PALETTE.length; i++) {
      const dr = R - PAL_RGB[i * 3], dg = G2 - PAL_RGB[i * 3 + 1], db = B - PAL_RGB[i * 3 + 2];
      // weight green most and blue least, roughly as the eye does
      const d = dr * dr * 2 + dg * dg * 4 + db * db * 3;
      if (d < bd) { bd = d; best = i; }
    }
    PAL_LUT[(r << 10) | (g << 5) | b] = best;
  }
})();

const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const DITHER = 0.9;

function initPixel(ctx, canvas) {
  PX.ctx = ctx; PX.canvas = canvas;
  PX.overlay = document.getElementById("overlay");
  PX.octx = PX.overlay.getContext("2d");
  // strokes never get thinner than one art pixel, or outlines would fade away
  const lw = Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype, "lineWidth");
  Object.defineProperty(ctx, "lineWidth", { get() { return lw.get.call(this); }, set(v) { lw.set.call(this, Math.max(v, PX.S)); }, configurable: true });
  const fd = Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype, "font");
  Object.defineProperty(ctx, "font", { get() { return fd.get.call(this); }, set(v) { fd.set.call(this, String(v).replace(/(\d+(?:\.\d+)?)px/, (m, n) => Math.max(16, Math.round(n * 1.32)) + "px").replace(/Georgia/g, PIXEL_FONT)); }, configurable: true });
  if (document.fonts && document.fonts.load) { document.fonts.load('16px "Jersey 10"'); }
  // text is queued and drawn sharp, on top, after the pixels are done
  for (const m of ["fillText", "strokeText"]) {
    ctx[m] = function (text, x, y, maxW) {
      PX.q.push({ m, text, x, y, maxW, font: this.font, fs: this.fillStyle, ss: this.strokeStyle, lw: this.lineWidth, ta: this.textAlign, tb: this.textBaseline,
        ga: this.globalAlpha, sc: this.shadowColor, sb: this.shadowBlur, ox: this.shadowOffsetX, oy: this.shadowOffsetY, mx: this.getTransform() });
    };
  }
}

// Sizes both canvases for the view. Returns the art-pixel size in screen pixels.
function sizePixelView(vw, vh, dpr) {
  PX.S = Math.max(2, Math.min(5, Math.round(vh / 320)));
  PX.dpr = dpr;
  const c = PX.canvas;
  c.width = Math.ceil(vw / PX.S); c.height = Math.ceil(vh / PX.S);
  // whole multiples only, so every art pixel is the same size on screen
  c.style.width = c.width * PX.S + "px"; c.style.height = c.height * PX.S + "px";
  PX.ctx.setTransform(1 / PX.S, 0, 0, 1 / PX.S, 0, 0);
  PX.ctx.imageSmoothingEnabled = true; PX.ctx.imageSmoothingQuality = "high";
  PX.overlay.width = Math.floor(vw * dpr); PX.overlay.height = Math.floor(vh * dpr);
  PX.overlay.style.width = vw + "px"; PX.overlay.style.height = vh + "px";
}

function pixelBegin() {
  PX.q.length = 0;
  const o = PX.overlay;
  PX.octx.setTransform(1, 0, 0, 1, 0, 0);
  PX.octx.clearRect(0, 0, o.width, o.height);
}

// Snaps the finished frame to the palette, then draws the queued text sharply.
function pixelFinish() {
  const c = PX.canvas, w = c.width, h = c.height;
  const img = PX.ctx.getImageData(0, 0, w, h), d = img.data;
  for (let y = 0, i = 0; y < h; y++) {
    const row = (y & 3) * 4;
    for (let x = 0; x < w; x++, i += 4) {
      const t = (BAYER4[row + (x & 3)] - 7.5) * DITHER;
      let r = d[i] + t, g = d[i + 1] + t, b = d[i + 2] + t;
      r = r < 0 ? 0 : r > 255 ? 255 : r; g = g < 0 ? 0 : g > 255 ? 255 : g; b = b < 0 ? 0 : b > 255 ? 255 : b;
      const k = PAL_LUT[((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3)] * 3;
      d[i] = PAL_RGB[k]; d[i + 1] = PAL_RGB[k + 1]; d[i + 2] = PAL_RGB[k + 2]; d[i + 3] = 255;
    }
  }
  PX.ctx.putImageData(img, 0, 0);

  const o = PX.octx, base = new DOMMatrix().scale(PX.S * PX.dpr);
  for (const q of PX.q) {
    o.setTransform(base.multiply(q.mx));
    o.font = q.font; o.textAlign = q.ta; o.textBaseline = q.tb; o.globalAlpha = q.ga;
    // a soft glow becomes a hard one-pixel drop shadow
    o.shadowColor = q.sc; o.shadowBlur = 0; o.shadowOffsetX = o.shadowOffsetY = q.sb > 0 ? Math.round(PX.dpr * 1.5) : 0;
    if (q.m === "fillText") { o.fillStyle = q.fs; if (q.maxW != null) o.fillText(q.text, q.x, q.y, q.maxW); else o.fillText(q.text, q.x, q.y); }
    else { o.strokeStyle = q.ss; o.lineWidth = q.lw; o.lineJoin = "round"; if (q.maxW != null) o.strokeText(q.text, q.x, q.y, q.maxW); else o.strokeText(q.text, q.x, q.y); }
  }
  o.setTransform(1, 0, 0, 1, 0, 0); o.globalAlpha = 1; o.shadowBlur = 0;
}
