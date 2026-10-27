// Pixel art for the mini-games and the Carnival Midway: flat banded skies, stepped skylines,
// and sprites for the ducks, fruit, cups, targets, jar, pegs, stump and the rest. Sprites are
// built at the current art-pixel scale from shapes written in screen units, like the village props.

function lerpHex(a, b, k) {
  const x = parseInt(a.slice(1), 16), y = parseInt(b.slice(1), 16);
  const c = (s) => Math.round(((x >> s) & 255) + (((y >> s) & 255) - ((x >> s) & 255)) * k);
  return "#" + [16, 8, 0].map(s => c(s).toString(16).padStart(2, "0")).join("");
}

// A sky in flat bands, top colour to bottom colour.
function drawBandedSky(ctx, w, h, top, bottom, bands) {
  for (let i = 0; i < bands; i++) {
    ctx.fillStyle = lerpHex(top, bottom, bands === 1 ? 0 : i / (bands - 1));
    ctx.fillRect(0, Math.floor(i * h / bands), w, Math.ceil(h / bands) + 1);
  }
}

// A stepped skyline, one art pixel per column, with the odd tall tree.
function drawSkyline(ctx, w, baseY, amp, seed, color) {
  const col = PX.S;
  ctx.fillStyle = color;
  for (let x = 0, i = 0; x < w; x += col, i++) {
    let hgt = amp * (0.55 + 0.25 * Math.sin(i * 0.11 + seed) + 0.2 * Math.sin(i * 0.37 + seed * 2));
    if (hash2(Math.floor(i / 4), seed) < 0.12) hgt += amp * 0.45;
    ctx.fillRect(x, baseY - hgt, col, hgt + 400);
  }
}

// The backdrop behind every village mini-game.
function drawGameBackdrop(ctx, w, h, t, theme) {
  drawBandedSky(ctx, w, h, shadeToHex(theme.top, 2.1), shadeToHex(theme.bottom, 2.1), 7);
  for (let i = 0; i < 26; i++) {
    const x = (i * 97 + t * (8 + (i % 5) * 3)) % w, y = h * 0.12 + ((i * 53) % (h * 0.6)) + Math.sin(t + i) * 4;
    if (Math.sin(t * 2 + i) > -0.3) pixDot(ctx, x, y, 2, `rgb(${theme.mote})`);
  }
  drawSkyline(ctx, w, h * 0.26, h * 0.12, 3, shadeToHex(theme.tree, 2.3));
  drawSkyline(ctx, w, h * 0.3, h * 0.09, 9, shadeToHex(theme.tree, 1.5));
}

// ---------- the Midway at night ----------
function drawMidwayBackdrop(ctx, w, h, t, theme) {
  drawBandedSky(ctx, w, h, "#0e0b2a", theme.bottom, 9);
  for (let i = 0; i < 44; i++) {
    const x = (i * 131) % w, y = (i * 71) % (h * 0.45);
    if (Math.sin(t * 0.9 + i) > -0.4) pixDot(ctx, x, y, i % 7 ? 2 : 3, "#fff8dc");
  }
  drawProp(ctx, "moon", w * 0.85, h * 0.16, [20, 20, 20, 20], () => [SE(0, 0, 16, 16, "#fff4cd"), SE(7, -3, 14, 14, null), SE(-5, 4, 2, 2, "#e8d8a8")]);
  const base = h * 0.34;
  for (const [fx, tw, col] of [[0.12, 46, "#2a1f3d"], [0.34, 34, "#241a36"], [0.7, 40, "#2a1f3d"]]) {
    const x = w * fx;
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.moveTo(x - tw, base); ctx.lineTo(x, base - tw * 0.9); ctx.lineTo(x + tw, base); ctx.closePath(); ctx.fill();
    ctx.fillRect(x - tw, base, tw * 2, h * 0.04);
    pixDot(ctx, x, base - tw * 0.9, 4, "#f2c14e");
  }
  // the wheel, turning slowly, with a lamp on each car
  const cx = w * 0.52, cy = h * 0.2, R = Math.min(w, h) * 0.17, rot = t * 0.12;
  ctx.strokeStyle = "#484a77"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, R * 0.55, 0, Math.PI * 2); ctx.stroke();
  for (let i = 0; i < 12; i++) {
    const a = rot + (i / 12) * Math.PI * 2, x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x, y); ctx.stroke();
    pixDot(ctx, x, y + 6, 6, ["#e0524a", "#f2c14e", "#5aa9e6", "#7bc67e"][i % 4]);
  }
  ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx - R * 0.5, cy + R * 1.5); ctx.moveTo(cx, cy); ctx.lineTo(cx + R * 0.5, cy + R * 1.5); ctx.stroke();
  drawSkyline(ctx, w, h * 0.38, h * 0.07, 5, theme.tree);
  // paper lanterns drifting up, and confetti falling
  for (let i = 0; i < 7; i++) {
    const x = (i * 173 + Math.sin(t * 0.4 + i) * 14) % w, y = h - ((t * (9 + i * 2) + i * 90) % (h * 0.9));
    pixDot(ctx, x, y, 5, "#e6904e"); pixDot(ctx, x, y - 1, 2, "#fbb954");
  }
  for (let i = 0; i < 18; i++) {
    const x = (i * 89 + t * 6) % w, y = (i * 61 + t * (14 + i % 4 * 4)) % h;
    pixDot(ctx, x, y, 2, ["#e0524a", "#f2c14e", "#5aa9e6", "#7bc67e", "#c77dd1"][i % 5]);
  }
  // a string of lamps under the bunting
  for (let x = 6, i = 0; x < w; x += 28, i++) {
    const y = 20 + 10 * (1 - Math.pow((x / w) * 2 - 1, 2));
    if (Math.sin(t * 3 + i * 1.7) > -0.5) pixDot(ctx, x, y, 4, "#fff2b0");
  }
  // red stage curtains with folds and gold tassels
  const cw = Math.max(14, w * 0.035);
  for (const side of [0, 1]) {
    const x0 = side ? w - cw : 0;
    ctx.fillStyle = "#a32a36"; ctx.fillRect(x0, 0, cw, h);
    ctx.fillStyle = "#7d1f2a";
    for (let k = 0; k < 4; k++) ctx.fillRect(x0 + k * cw / 4 + cw / 8, 0, cw / 8, h);
    ctx.fillStyle = "#e8c15a"; ctx.fillRect(side ? x0 - 3 : x0 + cw, h * 0.55, 3, h * 0.05);
    pixDot(ctx, side ? x0 - 2 : x0 + cw + 2, h * 0.6, 6, "#e8c15a");
  }
}

// ---------- shared sprite pieces ----------
function mirror(d, u) {
  const X = x => x * d * u, Y = y => y * u;
  return {
    e: (cx, cy, rx, ry, c) => SE(X(cx), Y(cy), rx * u, ry * u, c),
    r: (x, y, w, h, c) => SR(d > 0 ? x * u : -(x + w) * u, Y(y), w * u, h * u, c),
    p: (pts, c) => SP(pts.map(([x, y]) => [X(x), Y(y)]), c),
    x: (x, y, c) => SX(Math.round(X(x)), Math.round(Y(y)), c),
  };
}

function drawDuck(ctx, x, y, size, dir, k, t, phase) {
  const bob = Math.sin(t * 2.4 + phase) * 1.5, u = size / 20, d = dir >= 0 ? 1 : -1;
  spriteShadow(ctx, x, y + 10 * u + bob, 16 * u);
  drawProp(ctx, `duck${k.color}${d}${Math.round(u * 10)}${k.gold ? "g" : ""}`, x, y + bob, [28 * u, 20 * u, 28 * u, 14 * u], () => {
    const m = mirror(d, u), sh = [];
    if (k.gold) sh.push(m.e(0, 0, 21, 21, "#fff8c8"), m.e(0, 0, 19, 19, null));
    sh.push(m.e(-10, 0, 6, 5, "a"), m.e(0, 3, 15, 10, "a"), m.e(-2, 4, 10, 4, "c"), m.e(10, -8, 7.5, 7.5, "a"), m.e(-2, -1, 8, 3.5, "b"),
      m.p([[16, -9], [24, -6.5], [16, -4.5]], "#f08a24"), m.x(11, -9.5, "#1a1218"));
    return sh;
  }, k.color);
}

function drawBasketItem(ctx, k, x, y, s, t, ph) {
  const r = BASKET_KINDS[k].r * s * 1.6;
  drawProp(ctx, `bitem${k}${Math.round(r)}`, x, y, [r * 2, r * 2, r * 2, r * 2], () => {
    if (k === "berry") return [SE(0, 0, r, r, "#e83b3b"), SE(-r * 0.2, -r * 0.2, r * 0.55, r * 0.5, "#f68181"), SE(r * 0.1, -r * 0.95, r * 0.55, r * 0.22, "#5f8a3c"), SX(Math.round(-r * 0.4), Math.round(-r * 0.4), "#ffffff")];
    if (k === "acorn") return [SE(0, r * 0.2, r * 0.8, r, "#cd9a5a"), SE(-r * 0.3, r * 0.1, r * 0.2, r * 0.5, "#e6c074"), SE(0, -r * 0.55, r * 0.95, r * 0.5, "#7a4e26"), SR(-1, -r * 1.2, 2, r * 0.4, "#4a3a2a")];
    if (k === "honey") return [SP([[0, -r * 1.3], [r * 0.8, -r * 0.2], [r, r * 0.3], [r * 0.6, r * 0.9], [0, r], [-r * 0.6, r * 0.9], [-r, r * 0.3], [-r * 0.8, -r * 0.2]], "#f9c22b"), SE(-r * 0.3, 0, r * 0.18, r * 0.35, "#fbff86")];
    const sp = []; for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6, rr = i % 2 ? r * 0.75 : r * 1.3; sp.push([Math.cos(a) * rr, Math.sin(a) * rr]); }
    return [SP(sp, "#6b4a2a"), SX(Math.round(-r * 0.32), Math.round(-r * 0.1), "#f9c22b"), SX(Math.round(r * 0.32), Math.round(-r * 0.1), "#f9c22b"), SR(-r * 0.3, r * 0.3, r * 0.6, 1.5, "#1a1218")];
  });
}

function drawWickerBasket(ctx, x, y, s, tilt) {
  const w = 30 * s, h = 24 * s;
  drawProp(ctx, `wicker${Math.round(s * 10)}`, x + tilt * 18, y, [w * 1.1, h * 1.5, w * 1.1, h * 1.1], () => {
    const sh = [SL(-w * 0.8, -h * 0.35, 0, -h * 1.3, 3 * s, "#7a5230"), SL(w * 0.8, -h * 0.35, 0, -h * 1.3, 3 * s, "#7a5230"),
      SP([[-w, -h * 0.4], [w, -h * 0.4], [w * 0.78, h], [-w * 0.78, h]], "#cd9a5a")];
    for (let i = 0; i < 4; i++) sh.push(SR(-w + i * 1.2, -h * 0.4 + (i + 1) * h * 0.28, (w - i * 1.2) * 2, 1, "#8a6a2a"));
    for (let i = -3; i <= 3; i++) sh.push(SL(i * w / 3.4, -h * 0.4, i * w / 4.4, h, 1, "#8a6a2a"));
    sh.push(SE(0, -h * 0.4, w, h * 0.2, "#b07a3c"));
    return sh;
  });
}

function drawCup(ctx, x, y, cw, ch, col, light) {
  drawProp(ctx, `cup${col}${Math.round(cw)}`, x, y, [cw * 0.6, ch + 10, cw * 0.6, 8], () => [
    SP([[-cw / 2, 0], [-cw * 0.32, -ch], [cw * 0.32, -ch], [cw / 2, 0]], "a"), SP([[cw * 0.1, 0], [cw / 2, 0], [cw * 0.32, -ch], [cw * 0.12, -ch]], "c"),
    SR(-cw * 0.42, -ch * 0.46, cw * 0.84, 5, light), SR(-cw * 0.22, -ch * 0.92, cw * 0.08, ch * 0.8, light), SE(0, -ch, cw * 0.32, 5, "b"),
  ], col);
}
function drawAcornBig(ctx, x, y, s) {
  const r = 10 * s;
  drawProp(ctx, `acornbig${Math.round(r)}`, x, y, [r * 1.5, r * 2, r * 1.5, r * 1.2], () => [SE(0, 0, r * 0.9, r * 1.1, "#a2754a"), SE(-r * 0.3, 0, r * 0.2, r * 0.5, "#cd9a5a"), SE(0, -r * 0.8, r, r * 0.5, "#5a3a1c")]);
}

function drawGalleryStar(ctx, size) {
  drawProp(ctx, `gstar${Math.round(size)}`, 0, 0, [size, size, size, size], () => {
    const p = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? size * 0.27 : size * 0.6; p.push([Math.cos(a) * rr, Math.sin(a) * rr]); }
    return [SP(p, "#f9c22b"), SE(0, 0, size * 0.12, size * 0.12, "#fbff86")];
  });
}

function drawThornling(ctx, x, y, r, t) {
  drawProp(ctx, `thornling${Math.round(r)}`, x, y, [r * 1.7, r * 1.7, r * 1.7, r * 1.7], () => {
    const sh = [];
    for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2 + 0.2; sh.push(SL(Math.cos(a) * r * 0.7, Math.sin(a) * r * 0.7, Math.cos(a) * r * 1.6, Math.sin(a) * r * 1.6, Math.max(2, r * 0.2), "#2c4a2c")); }
    sh.push(SE(0, 0, r, r, "#3f6a34"), SE(-r * 0.25, -r * 0.3, r * 0.5, r * 0.35, "#5f8a3c"), SE(-r * 0.35, -r * 0.05, r * 0.14, r * 0.14, "#ff6a5a"), SE(r * 0.35, -r * 0.05, r * 0.14, r * 0.14, "#ff6a5a"));
    return sh;
  });
}

function drawFishSprite(ctx, x, y, color, t) {
  drawProp(ctx, `fish${color}`, x, y, [22, 12, 30, 12], () => [
    SP([[12, 0], [26, -9], [26, 9]], "c"), SE(0, 0, 17, 8, "a"), SE(-2, 3, 12, 3, "b"), SE(-8, -1, 4, 5, "c"), SX(-11, -2, "#1a1218"), SR(-17, 0, 3, 1, "c"),
  ], color);
}

// ---------- Whack-a-Mole ----------
function drawWhackAMole(ctx, t, w, h) {
  drawGameBackdrop(ctx, w, h, t, GAME_THEMES.grass);
  WM.holes.forEach((hole, i) => {
    const { x, y, cell } = whackHoleXY(i, w, h);
    drawProp(ctx, `whole${Math.round(cell)}`, x, y, [cell * 0.6, cell * 0.4, cell * 0.6, cell * 0.4], () => [
      SE(0, 4, cell * 0.52, cell * 0.27, "#7a5a3a"), SE(0, 5, cell * 0.5, cell * 0.25, "#5a4630"), SE(-cell * 0.15, -cell * 0.04, cell * 0.2, cell * 0.06, "#9a7a52"), SE(0, 0, cell * 0.4, cell * 0.2, "#1a1218"),
    ]);
    if (hole.pop > 0) {
      ctx.save();
      ctx.beginPath(); ctx.rect(x - cell * 0.6, y - cell * 1.2, cell * 1.2, cell * 1.2 + 2); ctx.clip();
      if (hole.kind === "thorn") drawThornling(ctx, x, y - hole.pop * cell * 0.3, cell * 0.26, t);
      else {
        const z = Math.max(1, Math.round(cell / 58));
        blitSprite(ctx, animalSprite("mouse", "#c9b8a6", 0, false), x, y + 8 - (1 - hole.pop) * cell * 0.55, ANIMAL_AX, ANIMAL_AY, z);
      }
      ctx.restore();
    }
    if (hole.stars > 0) {
      const a = (0.4 - hole.stars) * 7;
      for (let k = 0; k < 6; k++) pixDot(ctx, x + Math.cos(k * 1.05 + a) * (8 + a * 12), y - cell * 0.3 + Math.sin(k * 1.05 + a) * (8 + a * 12) * 0.7, 3, "#fbff86");
    }
  });
  const c = whackHoleXY(WM.cur, w, h);
  ctx.strokeStyle = "#f9c22b"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.ellipse(c.x, c.y + 2, c.cell * 0.56, c.cell * 0.3, 0, 0, Math.PI * 2); ctx.stroke();
  if (WM.flash) {
    ctx.fillStyle = WM.flash.ok ? `rgba(120,220,140,${0.22 * WM.flash.t / 0.2})` : `rgba(230,90,80,${0.28 * WM.flash.t / 0.35})`;
    ctx.fillRect(0, 0, w, h);
  }
  gameHeader(ctx, `Whack-a-Mole · ${Math.ceil(WM.t)}s · ${WM.score} points`, "Arrow keys, WASD or the d-pad to move · Z, Space or Act to whack · Esc to finish early");
  gameMessage(ctx, WM.msg, w / 2, h * 0.9, w);
  ctx.textAlign = "left";
}

// ---------- Acorn Memory ----------
function drawAcornMemory(ctx, t, w, h) {
  drawGameBackdrop(ctx, w, h, t, GAME_THEMES.forest);
  const hb = GAME_HEADER_BOTTOM;
  const k = Math.max(0.55, Math.min(1, (w - 24) / 400, (h - hb - 150) / 300));
  const cx = w / 2, cy = Math.max(hb + 56 + 125 * k, h * 0.48);
  const lit = acornLit();
  drawProp(ctx, `stumpbig${Math.round(k * 100)}`, cx, cy, [200 * k, 130 * k, 200 * k, 130 * k], () => {
    const sh = [SE(0, 8 * k, 192 * k, 120 * k, "#4a3a2a"), SE(0, 0, 190 * k, 120 * k, "a"), SE(-30 * k, -24 * k, 120 * k, 60 * k, "#9a7a52")];
    for (const r of [150, 110, 70]) for (let a = 0; a < 6.28; a += 0.12) sh.push(SL(Math.cos(a) * r * k, Math.sin(a) * r * 0.6 * k, Math.cos(a + 0.12) * r * k, Math.sin(a + 0.12) * r * 0.6 * k, 1.5, "#5a4630"));
    for (const [sx, sy] of [[0, -90], [120, 0], [0, 90], [-120, 0]]) sh.push(SE(sx * k, sy * k, 38 * k, 24 * k, "#23170c"));
    return sh;
  }, "#7a5a3a");
  [[0, -90], [120, 0], [0, 90], [-120, 0]].forEach(([dx, dy], i) => {
    const x = cx + dx * k, y = cy + dy * k;
    if (i === lit) for (let q = 0; q < 10; q++) pixDot(ctx, x + Math.cos(q * 0.63 + t * 2) * 44 * k, y - 10 + Math.sin(q * 0.63 + t * 2) * 28 * k, 4, "#fbff86");
    drawProp(ctx, `holeacorn${i === lit ? 1 : 0}${Math.round(k * 100)}`, x, y, [20 * k, 40 * k, 20 * k, 6], () => i === lit
      ? [SE(0, -8 * k, 15 * k, 18 * k, "#fbb954"), SE(-4 * k, -10 * k, 4 * k, 9 * k, "#fbff86"), SE(0, -24 * k, 17 * k, 8 * k, "#cd683d")]
      : [SE(0, -8 * k, 15 * k, 18 * k, "#8b5a2b"), SE(-4 * k, -10 * k, 4 * k, 9 * k, "#a2754a"), SE(0, -24 * k, 17 * k, 8 * k, "#5a3a1c")]);
  });
  if (AM.flash) {
    ctx.fillStyle = AM.flash.ok ? `rgba(120,220,140,${0.25 * AM.flash.t / 0.25})` : `rgba(230,90,80,${0.3 * AM.flash.t / 0.35})`;
    ctx.fillRect(0, 0, w, h);
  }
  if (AM.phase === "input") {
    const left = Math.max(0, 1 - AM.inT / AM_LIMIT);
    const bw = Math.min(w * 0.6, 320), bx = cx - bw / 2, by = cy + 135 * k + 14;
    ctx.fillStyle = "#2e222f"; ctx.fillRect(bx - 2, by - 2, bw + 4, 14);
    ctx.fillStyle = left > 0.3 ? "#f9c22b" : "#e83b3b";
    ctx.fillRect(bx, by, bw * left, 10);
  }
  const pipGap = 22, pipY = cy + 135 * k + 42, pipX0 = cx - (AM.seq.length - 1) * pipGap / 2;
  for (let i = 0; i < AM.seq.length; i++) pixDot(ctx, pipX0 + i * pipGap, pipY, 12, i < AM.idx ? "#f9c22b" : "#625565");
  gameHeader(ctx, `Acorn Memory · level ${AM.level} of ${AM_LEVELS} · ${AM.cleared} cleared`, "Arrow keys, WASD or the d-pad to repeat · Esc to finish early");
  gameMessage(ctx, AM.msg, cx, hb + 30, w);
  ctx.textAlign = "left";
}

// ---------- Ring Toss ----------
function drawRingToss(ctx, t, w, h) {
  drawGameBackdrop(ctx, w, h, t, GAME_THEMES.ring);
  const rowY = h * RT_PEG_ROW;
  ctx.fillStyle = "#3f6a34"; ctx.beginPath(); ctx.ellipse(w / 2, h * 0.6, w * 0.46, h * 0.36, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#5f8a3c"; ctx.beginPath(); ctx.ellipse(w / 2, h * 0.57, w * 0.38, h * 0.28, 0, 0, Math.PI * 2); ctx.fill();
  for (const p of RT_PEGS) {
    const px = p.x * w;
    spriteShadow(ctx, px + 4, rowY + 6, 14);
    drawProp(ctx, `peg${p.v >= 5 ? 1 : 0}`, px, rowY + 6, [8, 38, 8, 6], () => [SR(-4, -36, 8, 36, "#9a7a52"), SR(-4, -36, 3, 36, "#c9a06a"), SR(2, -36, 2, 36, "#5a4630"), SE(0, -36, 5, 2.4, p.v >= 5 ? "#f9c22b" : "#e8d8a8")]);
    ctx.fillStyle = p.v >= 5 ? "#ffd27a" : "#fff6dc";
    ctx.font = "bold 13px Georgia"; ctx.textAlign = "center";
    ctx.fillText(String(p.v), px, rowY + 24);
  }
  for (const r of RT.rings) {
    const rx = r.x * w;
    ctx.strokeStyle = r.peg >= 0 ? "#f9c22b" : "#cf657f"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.ellipse(rx, rowY - 4, 13, 5, 0, 0, Math.PI * 2); ctx.stroke();
  }
  const aimY = h * RT_TOSS_ROW;
  ctx.fillStyle = "#e8d8a8"; ctx.fillRect(w * 0.1, aimY, w * 0.8, 3);
  const aimX = RT.aim * w;
  if (!RT.flight && RT.doneT == null) {
    for (let y = h * 0.7 + 10; y < aimY - 4; y += 12) pixDot(ctx, aimX, y, 2, "#e8d8a8");
    ctx.strokeStyle = "#fbff86"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(aimX, h * 0.7, 16, 6, 0, 0, Math.PI * 2); ctx.stroke();
  }
  if (RT.flight) {
    const f = RT.flight, u = Math.min(1, f.t / f.dur);
    const x = (f.fromX + (f.toX - f.fromX) * u) * w;
    const y = aimY + (rowY - aimY) * u - Math.sin(u * Math.PI) * h * 0.22;
    spriteShadow(ctx, x, aimY + (rowY - aimY) * u - 4, 12);
    ctx.strokeStyle = "#f9c22b"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.ellipse(x, y, 13, 9 * (1 - 0.3 * Math.sin(u * Math.PI)), 0, 0, Math.PI * 2); ctx.stroke();
  }
  gameHeader(ctx, `Ring Toss · ring ${Math.min(RT.throws + (RT.flight ? 0 : 1), RT_THROWS)} of ${RT_THROWS} · ${RT.total} points`,
    "Left and Right to nudge the aim · Z, Space or Act to toss · Esc to finish early");
  gameMessage(ctx, RT.msg, w / 2, h * 0.93, w);
  ctx.textAlign = "left";
}

// ---------- Firefly Catch ----------
function drawFireflyCatch(ctx, t, w, h) {
  drawGameBackdrop(ctx, w, h, t, GAME_THEMES.pond);
  const jx = MG.x * w, jy = h * 0.9;
  for (const it of MG.items) {
    const x = it.x * w, y = it.y * h, trail = it.trail || [];
    for (let i = 0; i < trail.length; i += 2) pixDot(ctx, trail[i].x * w, trail[i].y * h, i / trail.length > 0.6 ? 3 : 2, it.bad ? "#484a77" : "#a2a947");
    if (it.bad) drawProp(ctx, "drop", x, y, [10, 14, 10, 12], () => [SP([[0, -12], [7, 2], [4, 8], [-4, 8], [-7, 2]], "#4d65b4"), SX(-2, 0, "#8fd3ff")]);
    else {
      for (const [dx, dy] of [[-10, 0], [10, 0], [0, -10], [0, 10]]) pixDot(ctx, x + dx, y + dy, 3, "#a2a947");
      pixDot(ctx, x, y, 7, "#fbff86");
    }
  }
  drawProp(ctx, "jar", jx, jy, [40, 32, 40, 30], () => [
    SR(-36, -28, 72, 38, "#c7dcd0"), SE(0, 10, 36, 16, "#c7dcd0"), SR(-33, -28, 66, 38, null), SE(0, 10, 33, 13, null), SR(-40, -30, 80, 4, "#9babb2"),
  ]);
  if (MG.flash > 0) { ctx.fillStyle = `rgba(120,30,40,${0.35 * MG.flash / 0.3})`; ctx.fillRect(0, 0, w, h); }
  gameHeader(ctx, `Firefly Catch · ${Math.ceil(MG.t)}s · ${MG.score} caught`, "Left/Right to move · Esc or Z to finish early");
  ctx.textAlign = "left";
}

// ---------- Stone Skip ----------
function drawStoneSkip(ctx, t, w, h) {
  drawGameBackdrop(ctx, w, h, t, GAME_THEMES.dusk);
  const wy = h * 0.5, top = wy - h * 0.16, bot = wy + h * 0.16;
  for (let i = 0; i < 4; i++) { ctx.fillStyle = lerpHex("#0b8a8f", "#0b5e65", i / 3); ctx.fillRect(0, top + (bot - top) * i / 4, w, (bot - top) / 4 + 1); }
  ctx.strokeStyle = "#8ff8e2"; ctx.lineWidth = 2;
  for (let i = 0; i < 9; i++) {
    const rx = ((i * 137 + t * 30) % (w + 80)) - 40, ry = wy - h * 0.12 + (i * 53) % (h * 0.24);
    ctx.beginPath(); ctx.moveTo(rx - 14, ry); ctx.lineTo(rx + 14, ry); ctx.stroke();
  }
  if (SK.anim) {
    const a = SK.anim, p = Math.min(1, a.t / a.dur), x0 = w * 0.12, hop = w * 0.07, done = p * a.skips, hi = Math.floor(done);
    const sx = x0 + done * hop, sy = wy - Math.abs(Math.sin(done * Math.PI)) * 18;
    for (let i = 0; i < hi; i++) {
      const age = done - (i + 1);
      if (age < 0 || age > 1.5) continue;
      ctx.strokeStyle = "#c7dcd0"; ctx.lineWidth = 2;
      const rr = 4 + age * 18;
      ctx.beginPath(); ctx.ellipse(x0 + (i + 1) * hop, wy, rr, rr * 0.25, 0, 0, Math.PI * 2); ctx.stroke();
    }
    drawProp(ctx, "skipstone", sx, sy, [9, 6, 9, 6], () => [SE(0, 0, 7, 4.5, "#9babb2"), SE(-2, -1, 3, 1.5, "#c7dcd0")]);
  }
  const bx = w * 0.15, bw = w * 0.7, by = h * 0.82, bh = 18;
  ctx.fillStyle = "#2e222f"; ctx.fillRect(bx - 3, by - 3, bw + 6, bh + 6);
  ctx.fillStyle = "#625565"; ctx.fillRect(bx, by, bw, bh);
  ctx.fillStyle = "#f9c22b"; ctx.fillRect(bx + bw * 0.44, by, bw * 0.12, bh);
  ctx.fillStyle = "#fff8e0"; ctx.fillRect(bx + bw * SK.pos - 3, by - 6, 6, bh + 12);
  gameHeader(ctx, `Stone Skip · throw ${Math.min(SK.throws + (SK.anim ? 0 : 1), SK_THROWS)} of ${SK_THROWS} · ${SK.total} skips`, "Z or Space to throw · Esc to finish early");
  gameMessage(ctx, SK.msg, w / 2, Math.max(h * 0.3, GAME_HEADER_BOTTOM + 30), w);
  ctx.textAlign = "left";
}
