// Pixel props for the village and the expeditions: trees, huts, the well, lamps, gates, the tent,
// the lighthouse, the peddler's cart, gathering bushes, pets and the things found in expedition rooms.
// Shapes are written in world units around an anchor point and rasterised at the current art-pixel
// scale, so everything keeps its proportions on every screen while outlines stay one pixel wide.

const C = {
  ink: "#2e222f", wood: "#7a5a3a", woodD: "#4a3a2a", woodL: "#9a7a52", stone: "#7f708a", stoneD: "#625565", stoneL: "#9babb2", stoneH: "#c7dcd0",
  leafD: "#1f3a2a", leaf: "#2c4a2c", leafM: "#3f6a34", leafL: "#5f8a3c", leafH: "#7aa84a", straw: "#c9a06a", strawD: "#9a7a52", strawL: "#e8d8a8",
  red: "#b33831", cream: "#e8d8a8", gold: "#f9c22b", water: "#0b8a8f",
};

function propSprite(ctx, key, ext, build, base) {
  const k = ctx.getTransform().a;
  const ck = `P|${key}|${k.toFixed(3)}|${base || ""}`;
  let e = SPR_CACHE.get(ck);
  if (!e) {
    if (SPR_CACHE.size > 600) SPR_CACHE.clear();
    const [L, T, R, B] = ext;
    const axp = Math.round(L * k), ayp = Math.round(T * k);
    const w = axp + Math.ceil(R * k) + 1, h = ayp + Math.ceil(B * k) + 1;
    e = { cv: sprCanvas(w, h, build(), base || "#888888", {}, false, false, k, axp, ayp), ax: axp, ay: ayp };
    SPR_CACHE.set(ck, e);
  }
  return e;
}
function drawProp(ctx, key, x, y, ext, build, base) {
  const e = propSprite(ctx, key, ext, build, base);
  blitSprite(ctx, e.cv, x, y, e.ax, e.ay);
}
// A square of n art pixels centred on a world point, snapped to the pixel grid.
function pixDot(ctx, x, y, n, color) {
  const M = ctx.getTransform();
  const px = Math.round(M.a * x + M.c * y + M.e - n / 2), py = Math.round(M.b * x + M.d * y + M.f - n / 2);
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = color; ctx.fillRect(px, py, n, n); ctx.restore();
}
function plate(ctx, x, y, text, w0) {
  ctx.font = "13px Georgia"; ctx.textAlign = "center";
  const w = ctx.measureText(text).width + 14;
  ctx.fillStyle = "rgba(20,26,18,.7)"; ctx.fillRect(x - w / 2, y, w, 19);
  ctx.fillStyle = "#fff6dc"; ctx.fillText(text, x, y + 14);
}
const hash2 = (a, b) => { const v = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return v - Math.floor(v); };

// ---------- trees ----------
function drawTree(ctx, x, y, r) {
  spriteShadow(ctx, x + 6, y + r * 0.72, r * 0.95);
  drawProp(ctx, "tree" + Math.round(r), x, y + r * 0.7, [r * 1.15, r * 1.95, r * 1.15, r * 0.12], () => {
    const sh = [SR(-r * 0.1, -r * 0.75, r * 0.2, r * 0.75, C.woodD), SR(-r * 0.1, -r * 0.75, r * 0.07, r * 0.75, C.wood)];
    const cy = -r * 0.7;
    sh.push(SE(0, cy, r, r * 0.92, C.leafD));
    for (let i = 0; i < 12; i++) { const a = i * 0.5236 + 0.2; sh.push(SE(Math.cos(a) * r * 0.88, cy + Math.sin(a) * r * 0.8, r * 0.2, r * 0.2, C.leafD)); }
    sh.push(SE(-r * 0.15, cy - r * 0.1, r * 0.8, r * 0.72, C.leaf), SE(r * 0.12, cy - r * 0.28, r * 0.54, r * 0.5, C.leafM), SE(-r * 0.12, cy - r * 0.36, r * 0.28, r * 0.22, C.leafL));
    for (let i = 0; i < r * 1.2; i++) {
      const a = hash2(i, r) * 6.28, d = Math.sqrt(hash2(r, i + 3)) * r * 0.8;
      const px = Math.cos(a) * d, py = cy + Math.sin(a) * d * 0.85 - r * 0.1;
      sh.push(SX(Math.round(px), Math.round(py), py < cy - r * 0.2 ? C.leafH : (hash2(i, 9) < 0.5 ? C.leafL : C.leafD)));
    }
    return sh;
  });
}

// ---------- huts ----------
function drawHut(ctx, x, y, color, name) {
  const t = WORLD.time;
  spriteShadow(ctx, x + 6, y + 56, 60);
  drawProp(ctx, "hut", x, y, [62, 34, 62, 60], () => {
    const sh = [SR(22, -22, 10, 28, "#5a4630"), SR(21, -24, 12, 3, C.woodL)];
    sh.push(SE(0, 24, 46, 32, "a"));
    for (let i = -2; i <= 2; i++) sh.push(SL(i * 16, 12, i * 17.5, 50, 1.5, "c"));
    sh.push(SR(-8, 26, 16, 19, "#2a1b10"), SE(0, 26, 8, 8, "#2a1b10"));
    const roof = [];
    for (let a = Math.PI; a <= Math.PI * 2 + 0.01; a += 0.15) roof.push([Math.cos(a) * 54, 8 + Math.sin(a) * 40]);
    roof.push([54, 12], [-54, 12]);
    sh.push(SP(roof, C.straw), SE(-16, -12, 24, 12, C.strawL));
    for (let i = 1; i <= 4; i++) {
      const f = i / 5;
      for (let a = Math.PI; a < Math.PI * 2 - 0.1; a += 0.2) sh.push(SL(Math.cos(a) * 54 * f, 8 + Math.sin(a) * 40 * f, Math.cos(a + 0.2) * 54 * f, 8 + Math.sin(a + 0.2) * 40 * f, 1.4, C.strawD));
    }
    sh.push(SL(-54, 11, 54, 11, 2, C.strawD), SE(0, 14, 5, 5, "#f9c22b"));
    return sh;
  }, color);
  for (let i = 0; i < 3; i++) {
    const k = (t * 0.25 + i / 3) % 1;
    pixDot(ctx, x + 28 + k * 10, y - 28 - k * 46, 2 + Math.floor(k * 3), `rgba(230,225,215,${0.55 * (1 - k)})`);
  }
  plate(ctx, x, y - 52, name);
}

// ---------- village furniture ----------
function drawLampPost(ctx, x, y, t) {
  spriteShadow(ctx, x + 3, y + 2, 7);
  drawProp(ctx, "lamp", x, y, [12, 62, 12, 5], () => [
    SE(0, 0, 6, 3, C.stoneD), SR(-2, -42, 4, 42, "#3e3546"), SR(-6, -52, 12, 11, C.ink), SR(-4, -50, 8, 8, C.gold),
    SP([[-8, -52], [8, -52], [0, -60]], "#3e3546"), SX(0, -47, "#fbff86"),
  ]);
}

function drawWishingWell(ctx, x, y, t) {
  spriteShadow(ctx, x + 4, y + 14, 28);
  drawProp(ctx, "well", x, y, [34, 58, 34, 20], () => [
    SR(-19, -38, 3, 42, C.woodD), SR(16, -38, 3, 42, C.woodD),
    SR(-22, 2, 44, 12, C.stone), SE(0, 14, 22, 6, C.stone), SE(0, 2, 22, 9, C.stoneL), SE(0, 2, 16, 6.5, C.water), SX(-4, 1, "#8ff8e2"), SX(3, 3, "#8ff8e2"),
    SL(-14, 8, -14, 14, 1, C.stoneD), SL(0, 9, 0, 17, 1, C.stoneD), SL(14, 8, 14, 14, 1, C.stoneD),
    SR(-3, -24, 6, 8, C.wood), SL(0, -36, 0, -24, 1.2, C.strawL),
    SP([[-30, -33], [0, -56], [30, -33]], C.leafM), SP([[-30, -33], [0, -56], [0, -33]], C.leaf), SL(-30, -33, 30, -33, 2, C.leaf),
  ]);
}

function drawNoticeBoard(ctx, x, y, t) {
  spriteShadow(ctx, x + 4, y + 3, 28);
  drawProp(ctx, "board", x, y, [34, 66, 36, 6], () => [
    SR(-20, -50, 4, 52, C.woodD), SR(16, -50, 4, 52, C.woodD), SR(-28, -62, 56, 36, C.wood), SR(-28, -62, 56, 3, C.woodL), SR(-28, -29, 56, 3, C.woodD),
    SR(-22, -56, 14, 17, C.cream), SR(-5, -54, 13, 14, C.stoneH), SR(11, -56, 12, 18, "#fdcbb0"),
    SR(-20, -53, 10, 1, C.stoneD), SR(-20, -50, 9, 1, C.stoneD), SR(-20, -47, 10, 1, C.stoneD), SR(-3, -51, 9, 1, C.stoneD), SR(-3, -48, 8, 1, C.stoneD), SR(13, -53, 8, 1, C.stoneD), SR(13, -50, 7, 1, C.stoneD),
    SX(-15, -56, C.red), SX(1, -54, "#4d9be6"), SX(17, -56, C.red),
  ]);
}

function drawScarecrow(ctx, x, y, t) {
  spriteShadow(ctx, x + 3, y + 4, 14);
  drawProp(ctx, "scarecrow", x, y, [26, 66, 26, 6], () => [
    SR(-2, -48, 4, 52, C.wood), SR(-22, -35, 44, 4, C.wood),
    SL(-22, -34, -27, -30, 2, C.straw), SL(22, -34, 27, -30, 2, C.straw), SL(-2, 2, -5, 7, 2, C.straw), SL(2, 2, 5, 7, 2, C.straw),
    SE(0, -27, 9, 12, "#cd683d"), SR(-9, -27, 18, 2, "#7a3045"), SR(-9, -21, 18, 2, "#7a3045"),
    SE(0, -45, 7, 7, C.cream), SX(-2, -46, C.ink), SX(2, -46, C.ink), SX(0, -43, "#cd683d"),
    SR(-12, -52, 24, 3, C.woodD), SR(-7, -61, 14, 10, C.woodD), SR(-7, -54, 14, 2, C.red),
  ]);
}

function drawFlowerBed(ctx, x, y, t) {
  spriteShadow(ctx, x + 2, y + 12, 38);
  drawProp(ctx, "bed", x, y, [42, 26, 42, 16], () => {
    const sh = [SR(-37, -6, 74, 20, C.wood), SR(-37, -6, 74, 3, C.woodL), SR(-34, -3, 68, 14, C.woodD)];
    const cols = ["#f68181", "#f9c22b", "#eaaded", "#8fd3ff", "#ffffff"];
    for (let i = 0; i < 12; i++) {
      const fx = -31 + i * 5.6, fy = -8 - (i * 7 % 6);
      sh.push(SL(fx, fy, fx, 4, 1, C.leafM), SE(fx, fy, 2.4, 2.4, cols[i % 5]), SX(Math.round(fx), Math.round(fy), "#fbff86"));
    }
    return sh;
  });
}

function drawShrine(ctx, x, y) {
  const awake = willowOwned("spiritbond");
  spriteShadow(ctx, x + 4, y + 22, 26);
  drawProp(ctx, "shrine" + (awake ? 1 : 0), x, y, [24, 44, 24, 26], () => {
    const sh = [SR(-20, 14, 40, 8, C.stoneD), SR(-17, 8, 34, 7, C.stone), SP([[-14, 14], [-10, -24], [10, -24], [14, 14]], "a"), SP([[-10, -24], [-6, -30], [6, -30], [10, -24]], "a")];
    if (awake) sh.push(SR(-1.5, -16, 3, 16, "#eaaded"), SE(0, -28, 4, 4, "#a884f3"), SX(-5, -4, "#a884f3"), SX(5, -8, "#a884f3"));
    return sh;
  }, awake ? "#8a8fa6" : "#4a4a52");
  plate(ctx, x, y - 60, "Spirit Shrine");
}

// A stone arch with a glowing veil in the gate's colour, and its label above.
function gateArch(color) {
  return [
    SR(-35, -36, 8, 36, C.stone), SR(27, -36, 8, 36, C.stone), SE(0, -36, 38, 28, C.stone), SE(0, -36, 29, 20, null), SR(-29, -36, 58, 36, null),
    SR(-35, -36, 3, 36, C.stoneH), SR(-6, -66, 12, 7, C.stoneL),
    SE(0, -36, 27, 18, "a"), SR(-27, -36, 54, 36, "a"),
  ];
}
function drawGate(ctx, x, y, name, color, sub) {
  drawProp(ctx, "gate", x, y, [40, 68, 40, 6], () => gateArch(color), color);
  ctx.font = "13px Georgia";
  ctx.textAlign = "center";
  const lines = sub ? [name, sub] : [name];
  const w = Math.max(...lines.map(l => ctx.measureText(l).width)) + 16;
  const h = 18 * lines.length + 8;
  const top = y - 74 - h;
  ctx.fillStyle = "rgba(20,26,18,.7)";
  ctx.fillRect(x - w / 2, top, w, h);
  ctx.fillStyle = "#fff6dc";
  lines.forEach((l, i) => ctx.fillText(l, x, top + 18 + i * 18));
}

// ---------- the Midway tent ----------
function drawCarnivalTent(ctx, x, y, t) {
  spriteShadow(ctx, x + 8, y + 8, 80);
  drawProp(ctx, "tent", x, y, [80, 136, 80, 8], () => {
    const sh = [], wallTop = -44;
    for (let i = -4; i < 4; i++) sh.push(SR(i * 16, wallTop, 16, 44, (i & 1) ? C.cream : "#c8453d"));
    for (let k = 0; k < 8; k++) { const x0 = -76 + k * 19; sh.push(SP([[x0, wallTop], [x0 + 19, wallTop], [0, -112]], k % 2 ? C.cream : "#c8453d")); }
    sh.push(SP([[0, wallTop], [76, wallTop], [0, -112]], "#9e4539"));
    for (let k = 0; k < 8; k++) sh.push(SE(-66 + k * 19 + 9.5, wallTop, 9.5, 8, k % 2 ? "#c8453d" : C.cream));
    sh.push(SR(-15, -26, 30, 26, "#45293f"), SE(0, -26, 15, 12, "#45293f"), SP([[-15, -26], [-5, 0], [-15, 0]], C.gold), SP([[15, -26], [5, 0], [15, 0]], C.gold));
    sh.push(SR(-34, -36, 68, 17, "#3a2414"), SR(-34, -36, 68, 1.5, C.gold), SR(-34, -20.5, 68, 1.5, C.gold));
    sh.push(SL(0, -112, 0, -134, 2, "#5a3a1c"), SP([[0, -134], [18, -129], [0, -121]], C.gold));
    return sh;
  });
  ctx.fillStyle = "#ffe9a0"; ctx.font = "bold 11px Georgia"; ctx.textAlign = "center";
  ctx.fillText("MIDWAY", x, y - 44 + 20); ctx.textAlign = "left";
  const cols = ["#ffd24a", "#ff7a6a", "#7ad0ff", "#9be08a"];
  for (let k = 0; k < 9; k++) {
    if (Math.sin(t * 3 + k * 1.3) < -0.3) continue;
    pixDot(ctx, x - 72 + k * 18, y - 44 + 12 + (1 - Math.pow((k - 4) / 4, 2)) * 5, 2, cols[k % 4]);
  }
}

// ---------- the lighthouse ----------
function drawLighthouse(ctx, x, y, t) {
  spriteShadow(ctx, x + 16, y + 3, 36);
  drawProp(ctx, "lighthouse", x, y, [32, 214, 32, 6], () => [
    SP([[-24, 0], [-14, -170], [14, -170], [24, 0]], C.stoneH), SP([[2, 0], [24, 0], [14, -170], [2, -170]], C.stoneL),
    SP([[-17, -146], [17, -146], [16.5, -138], [-16.5, -138]], C.red), SP([[-21, -70], [21, -70], [20.5, -62], [-20.5, -62]], C.red),
    SR(-5, -20, 10, 20, C.woodD), SR(-3, -108, 6, 11, C.ink), SR(-3, -128, 6, 9, C.ink), SR(-3, -40, 6, 9, C.ink),
    SR(-20, -176, 40, 5, "#3e3546"), SR(-12, -196, 24, 20, "#fbff86"), SL(-4, -196, -4, -176, 1.5, "#3e3546"), SL(4, -196, 4, -176, 1.5, "#3e3546"),
    SP([[-15, -196], [15, -196], [0, -210]], C.red),
  ]);
}

// ---------- the peddler's cart ----------
function drawPeddlerCart(ctx, x, y, t) {
  const sway = Math.sin(t * 1.4) * 0.6;
  spriteShadow(ctx, x, y + 30, 70);
  drawProp(ctx, "cart", x, y, [74, 36, 74, 40], () => {
    const sh = [];
    for (const wx of [-42, 44]) {
      sh.push(SE(wx, 20, 15, 15, "#3a2414"), SE(wx, 20, 9.5, 9.5, null));
      for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; sh.push(SL(wx, 20, wx + Math.cos(a) * 11, 20 + Math.sin(a) * 11, 1.5, "#6b4526")); }
      sh.push(SE(wx, 20, 2.5, 2.5, "#3a2414"));
    }
    sh.push(SR(-62, -2, 124, 28, C.wood), SR(-62, -2, 124, 3, C.woodL));
    for (let i = 1; i < 5; i++) sh.push(SL(-62 + i * 25, 1, -62 + i * 25, 25, 1, C.woodD));
    sh.push(SR(-54, -14, 26, 13, "#c9a25a"), SR(-54, -14, 26, 2, "#e6c074"));
    for (let i = 0; i < 5; i++) sh.push(SE(-50 + i * 5, -16, 3, 3, "#b02e5a"));
    for (const [jx, col] of [[-14, "#7fe0d0"], [2, "#ffd98a"], [18, "#f2a6c8"]]) sh.push(SR(jx - 5, -18, 10, 17, C.stoneH), SR(jx - 4, -12, 8, 10, col), SR(jx - 5, -20, 10, 3, "#6b4526"));
    sh.push(SE(44, -8, 13, 8, C.leafM), SE(44, -10, 9, 4, C.leafL));
    return sh;
  });
  blitSprite(ctx, animalSprite("hedgehog", "#9a7a5a", 0, false), x - 6, y - 4 + Math.sin(t * 2.4) * 0.8, ANIMAL_AX, ANIMAL_AY);
  drawProp(ctx, "cartawning", x, y, [72, 66, 72, 4], () => {
    const sh = [SR(-60, -60, 3, 58, "#5e3b20"), SR(57, -60, 3, 58, "#5e3b20")];
    for (let i = 0; i < 8; i++) {
      const x0 = -66 + i * 16.5;
      sh.push(SP([[x0, -62], [x0 + 16.5, -62], [x0 + 18.5, -44], [x0 - 2, -44]], i % 2 ? C.cream : "#4f8f9a"), SE(x0 + 8.2, -44, 8.5, 6, i % 2 ? C.cream : "#4f8f9a"));
    }
    for (const [hx, col] of [[-40, "#b5833c"], [-30, C.leafL], [36, "#c23a6b"]]) sh.push(SL(hx, -40, hx, -34, 1, "#3a2414"), SE(hx, -30, 5, 5, col));
    sh.push(SR(11, -40, 6, 9, "#ffd98a"));
    return sh;
  });
  plate(ctx, x, y + 34, "Marigold's Cart");
}

// ---------- gathering bushes (village and expeditions) ----------
function drawNodeSprite(ctx, x, y, color) {
  spriteShadow(ctx, x, y + 8, 14);
  drawProp(ctx, "node", x, y + 6, [20, 16, 20, 6], () => [
    SE(0, -2, 15, 8, C.leaf), SE(-6, -6, 8, 6, C.leafM), SE(6, -5, 8, 6, C.leafM), SE(-2, -10, 6, 4, C.leafL),
    SE(-6, -5, 2.6, 2.6, "a"), SE(5, -7, 2.6, 2.6, "a"), SE(0, -2, 2.6, 2.6, "a"), SE(9, -2, 2.2, 2.2, "a"), SE(-10, -1, 2.2, 2.2, "a"),
  ], color);
}

// ---------- companions ----------
function drawPetSprite(ctx, x, y, id, t) {
  const pet = DATA.pets[id];
  if (!pet) return;
  const bob = Math.sin(t * 4) * 1.5 - (id === "mothling" ? 8 : 0);
  spriteShadow(ctx, x, y + 9, 8);
  drawProp(ctx, "pet" + id, x, y + 9 + bob, [16, 24, 16, 4], () => {
    const sh = [];
    if (id === "mothling") sh.push(SE(-9, -11, 6, 8, "#eaf4ff"), SE(9, -11, 6, 8, "#eaf4ff"));
    if (id === "hedgepup") for (let i = -3; i <= 3; i++) sh.push(SP([[i * 2.4 - 2, -12], [i * 2.4, -19], [i * 2.4 + 2, -12]], "c"));
    if (id === "sproutkin") sh.push(SL(0, -17, 0, -22, 1.5, C.leafM), SE(4, -23, 5, 3, C.leafL), SE(-4, -22, 4, 2.5, C.leafM));
    if (id === "cinderkit") sh.push(SP([[-9, -14], [-8, -22], [-3, -16]], "a"), SP([[3, -16], [8, -22], [9, -14]], "a"));
    sh.push(SE(0, -9, 9, 8, "a"));
    if (id === "emberfinch") sh.push(SP([[8, -10], [13, -9], [8, -7]], C.gold));
    sh.push(SX(-3, -11, C.ink), SX(3, -11, C.ink));
    return sh;
  }, pet.color);
}

// ---------- things found in expedition rooms ----------
function drawExpPointSprite(ctx, p, t) {
  const x = p.x, y = p.y + 14, k = p.kind;
  if (k === "traveler") { blitSprite(ctx, animalSprite("hedgehog", "#b49a7a", 0, false), x, y, ANIMAL_AX, ANIMAL_AY); return; }
  spriteShadow(ctx, x, y + 2, 20);
  if (k === "shrine") drawProp(ctx, "xshrine", x, y, [20, 38, 20, 4], () => [SP([[-12, 0], [-8, -28], [8, -28], [12, 0]], "a"), SE(0, -2, 14, 4, C.leafM), SR(-1.5, -22, 3, 14, "#30e1b9"), SX(-5, -12, "#8ff8e2"), SX(5, -18, "#8ff8e2")], C.stone);
  else if (k === "treasure") drawProp(ctx, "chest", x, y, [20, 20, 20, 4], () => [SR(-15, -12, 30, 14, C.wood), SR(-15, -12, 30, 3, C.woodL), SE(0, -12, 15, 7, C.woodL), SR(-2.5, -18, 5, 20, C.gold), SR(-2, -9, 4, 4, C.ink)]);
  else if (k === "altar") drawProp(ctx, "altar", x, y, [22, 38, 22, 4], () => [SR(-18, -4, 36, 6, C.stone), SR(-14, -16, 28, 13, C.stoneL), SR(-17, -20, 34, 5, C.stoneH), SE(0, -28, 5, 7, C.gold), SX(-1, -30, "#ffffff")]);
  else if (k === "crossroads") drawProp(ctx, "signpost", x, y, [26, 42, 26, 4], () => [SR(-2, -38, 4, 40, C.wood), SP([[2, -36], [20, -36], [24, -31], [20, -26], [2, -26]], C.woodL), SP([[-2, -26], [-20, -26], [-24, -21], [-20, -16], [-2, -16]], C.wood), SP([[2, -16], [14, -16], [17, -12], [14, -8], [2, -8]], C.woodL)]);
  else if (k === "silverbell") drawProp(ctx, "sbell", x, y, [14, 24, 14, 4], () => [SL(0, 0, 0, -16, 1.6, C.leafM), SE(0, -18, 4.5, 5.5, C.stoneH), SE(6, -12, 3.5, 4.5, C.stoneH), SE(-6, -11, 3, 4, C.stoneH), SX(0, -20, "#ffffff")]);
  else if (k === "exit" || k === "descend") {
    const col = k === "descend" ? "#3e3546" : (p.locked ? "#6e2727" : "#30e1b9");
    drawProp(ctx, "xgate", x, y + 8, [40, 68, 40, 6], () => gateArch(col), col);
  }
}

// ---------- the village ground, painted at the exact art resolution ----------
function paintGrassTerrain(g, w, h, a, rnd) {
  const T = [packHex("#3f6a34"), packHex("#5f8a3c"), packHex("#2c4a2c")];
  const buf = new Uint32Array(w * h);
  const L = v => Math.max(1, Math.round(v * a));
  const n1 = noiseField(w, h, L(90), rnd), n2 = noiseField(w, h, L(34), rnd);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const bay = (BAYER_F[(y & 3) * 4 + (x & 3)] / 16 - 0.47) * 0.07;
    const v = n1(x, y) * 0.6 + n2(x, y) * 0.4 + bay;
    buf[y * w + x] = v < 0.42 ? T[2] : v < 0.64 ? T[0] : T[1];
  }
  g.putImageData(new ImageData(new Uint8ClampedArray(buf.buffer), w, h), 0, 0);
}
