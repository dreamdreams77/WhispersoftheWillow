// Visual effects: particles, damage numbers, hit-stop, screen shake, slash swooshes, the lighting
// layer (day and night in the village, torchlight in the expeditions) and seasonal air in the village.
const FX = {
  parts: [], nums: [], slashes: [], rings: [], ghosts: [], bolts: [],
  shakeAmt: 0, freezeT: 0, stepT: 0, ghostT: 0,
};

function fxReset() {
  FX.parts.length = 0; FX.nums.length = 0; FX.slashes.length = 0;
  FX.rings.length = 0; FX.ghosts.length = 0; FX.bolts.length = 0;
  FX.shakeAmt = 0; FX.freezeT = 0;
}

function fxShake(a) { FX.shakeAmt = Math.max(FX.shakeAmt, a); }
function fxFreeze(s) { FX.freezeT = Math.max(FX.freezeT, s); }

// Throws a handful of bits outward. dir (radians) and spread aim them; omit dir for a full ring.
function fxBurst(x, y, color, n, speed, opts) {
  const o = opts || {};
  for (let i = 0; i < n && FX.parts.length < 420; i++) {
    const a = o.dir == null ? rand(0, Math.PI * 2) : o.dir + rand(-(o.spread || 0.9), o.spread || 0.9);
    const v = speed * rand(0.4, 1);
    FX.parts.push({
      x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - (o.lift || 0),
      life: rand(0.25, 0.55) * (o.long || 1), max: 0.55 * (o.long || 1),
      size: rand(1.6, 3.6) * (o.size || 1), color, grav: o.grav || 0, spark: !!o.spark,
    });
  }
}

function fxNumber(x, y, text, color, big) {
  FX.nums.push({ x: x + rand(-8, 8), y, text: String(text), color: color || "#fff6dc", t: 0, life: big ? 1.0 : 0.8, big: !!big });
}

function fxRing(x, y, r, color, life) {
  FX.rings.push({ x, y, r, color, t: 0, life: life || 0.35 });
}

function fxSlash(range, color) {
  FX.slashes.push({ a: Math.atan2(EX.fy, EX.fx), t: 0, life: 0.2, reach: range, color: color || "255,246,220" });
}

function fxBolt(x1, y1, x2, y2) {
  FX.bolts.push({ x1, y1, x2, y2, t: 0, life: 0.18, seed: Math.random() * 100 });
}

function fxStep(dt) {
  FX.shakeAmt = Math.max(0, FX.shakeAmt - dt * 40);
  for (const p of FX.parts) {
    p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.grav * dt;
    const drag = Math.pow(0.02, dt); p.vx *= drag; p.vy *= drag;
  }
  FX.parts = FX.parts.filter(p => p.life > 0);
  for (const n of FX.nums) { n.t += dt; n.y -= 34 * dt; }
  FX.nums = FX.nums.filter(n => n.t < n.life);
  for (const s of FX.slashes) s.t += dt;
  FX.slashes = FX.slashes.filter(s => s.t < s.life);
  for (const r of FX.rings) r.t += dt;
  FX.rings = FX.rings.filter(r => r.t < r.life);
  for (const g of FX.ghosts) g.t += dt;
  FX.ghosts = FX.ghosts.filter(g => g.t < 0.28);
  for (const b of FX.bolts) b.t += dt;
  FX.bolts = FX.bolts.filter(b => b.t < b.life);
}

// Camera offset for a shaking screen.
function fxShakeOffset() {
  if (FX.shakeAmt <= 0) return { x: 0, y: 0 };
  const a = Math.min(FX.shakeAmt, 16);
  return { x: rand(-a, a) * 0.5, y: rand(-a, a) * 0.5 };
}

// Things that sit on the floor, under the creatures: dodge afterimages.
function fxDrawGround(ctx, t) {
  for (const g of FX.ghosts) {
    ctx.globalAlpha = 0.35 * (1 - g.t / 0.28);
    drawCritter(ctx, g.x, g.y, G.species, g.f, 0, 1.2);
  }
  ctx.globalAlpha = 1;
}

// Bright things over the lighting: bits, bolts, rings, slashes and damage numbers.
function fxDrawTop(ctx, t) {
  for (const p of FX.parts) {
    const k = clamp(p.life / p.max, 0, 1);
    ctx.globalAlpha = k;
    if (p.spark) {
      ctx.strokeStyle = p.color; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.04, p.y - p.vy * 0.04); ctx.stroke();
    } else {
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (0.4 + 0.6 * k), 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;

  for (const r of FX.rings) {
    const k = r.t / r.life;
    ctx.strokeStyle = r.color; ctx.globalAlpha = 1 - k; ctx.lineWidth = 4 * (1 - k) + 1;
    ctx.beginPath(); ctx.arc(r.x, r.y, r.r * (0.3 + 0.7 * k), 0, Math.PI * 2); ctx.stroke();
  }
  ctx.globalAlpha = 1;

  for (const b of FX.bolts) {
    ctx.strokeStyle = `rgba(210,230,255,${1 - b.t / b.life})`; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(b.x1, b.y1);
    const n = 5, dx = (b.x2 - b.x1) / n, dy = (b.y2 - b.y1) / n;
    for (let i = 1; i < n; i++) ctx.lineTo(b.x1 + dx * i + Math.sin(b.seed + i * 7) * 9, b.y1 + dy * i + Math.cos(b.seed + i * 5) * 9);
    ctx.lineTo(b.x2, b.y2); ctx.stroke();
  }

  // slash: a crescent that sweeps across the strike arc and fades behind itself
  for (const s of FX.slashes) {
    const p = s.t / s.life, ease = 1 - Math.pow(1 - p, 3);
    const lead = s.a - 1.1 + 2.2 * ease, tail = Math.max(s.a - 1.1, lead - 1.3);
    const R = s.reach * 0.95;
    ctx.save(); ctx.translate(EX.px, EX.py);
    const g = ctx.createRadialGradient(0, 0, R * 0.55, 0, 0, R);
    g.addColorStop(0, `rgba(${s.color},0)`); g.addColorStop(1, `rgba(${s.color},${0.95 * (1 - p)})`);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, R, tail, lead); ctx.arc(0, 0, R * 0.7, lead, tail, true); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  ctx.textAlign = "center";
  for (const n of FX.nums) {
    const k = n.t / n.life;
    ctx.globalAlpha = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
    ctx.font = `bold ${n.big ? 22 : 15}px Georgia`;
    ctx.lineWidth = 3; ctx.strokeStyle = "rgba(10,10,14,.85)";
    const sc = k < 0.15 ? 1 + (0.15 - k) * 4 : 1;
    ctx.save(); ctx.translate(n.x, n.y); ctx.scale(sc, sc);
    ctx.strokeText(n.text, 0, 0); ctx.fillStyle = n.color; ctx.fillText(n.text, 0, 0);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = "left";
}

// ---------- Lighting ----------
const LIGHT = { cv: null, c: null };

// Darkens the whole view with a tint, then punches soft holes in it where lights are. Lights are
// {x, y, r, a, color}: position and radius in drawing space, strength 0..1 and an optional "r,g,b"
// that also paints a faint colored glow. The darkness is made at reduced size, since it is soft anyway.
function drawLighting(ctx, W, H, k, amb, lights) {
  if (amb[3] <= 0.01) return;
  const w = Math.ceil(W * k), h = Math.ceil(H * k);
  if (!LIGHT.cv) { LIGHT.cv = document.createElement("canvas"); LIGHT.c = LIGHT.cv.getContext("2d"); }
  if (LIGHT.cv.width !== w || LIGHT.cv.height !== h) { LIGHT.cv.width = w; LIGHT.cv.height = h; }
  const c = LIGHT.c;
  c.globalCompositeOperation = "source-over";
  c.clearRect(0, 0, w, h);
  c.fillStyle = `rgba(${amb[0]},${amb[1]},${amb[2]},${amb[3]})`;
  c.fillRect(0, 0, w, h);
  c.globalCompositeOperation = "destination-out";
  for (const L of lights) {
    const r = L.r * k, a = L.a == null ? 0.9 : L.a;
    const g = c.createRadialGradient(L.x * k, L.y * k, 0, L.x * k, L.y * k, r);
    g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(0.5, `rgba(0,0,0,${a * 0.5})`); g.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = g; c.fillRect(L.x * k - r, L.y * k - r, r * 2, r * 2);
  }
  c.globalCompositeOperation = "source-over";
  ctx.drawImage(LIGHT.cv, 0, 0, W, H);
  // colored glow, only as strong as the darkness it is cutting through
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const strength = Math.min(1, amb[3] / 0.5);
  for (const L of lights) {
    if (!L.color) continue;
    const g = ctx.createRadialGradient(L.x, L.y, 0, L.x, L.y, L.r);
    g.addColorStop(0, `rgba(${L.color},${0.26 * strength})`); g.addColorStop(1, `rgba(${L.color},0)`);
    ctx.fillStyle = g; ctx.fillRect(L.x - L.r, L.y - L.r, L.r * 2, L.r * 2);
  }
  ctx.restore();
}

// Time of day from the village clock (one full day is four minutes): dawn, bright day, dusk, night.
const DAY_KEYS = [
  [0.00, 70, 50, 80, 0.22], [0.08, 0, 0, 0, 0], [0.55, 0, 0, 0, 0],
  [0.68, 90, 40, 50, 0.30], [0.78, 8, 14, 40, 0.66], [0.92, 8, 14, 40, 0.66], [1.00, 70, 50, 80, 0.22],
];
function timeOfDay() {
  const c = ((G.dayClock % 1) + 1) % 1;
  for (let i = 1; i < DAY_KEYS.length; i++) {
    const a = DAY_KEYS[i - 1], b = DAY_KEYS[i];
    if (c <= b[0]) {
      const k = (c - a[0]) / (b[0] - a[0]);
      return [1, 2, 3, 4].map(j => a[j] + (b[j] - a[j]) * k);
    }
  }
  return [0, 0, 0, 0];
}

const VIL_LIGHTS = [
  [790, 584, 120, "255,214,140"], [1010, 646, 120, "255,214,140"],
  [260, 330, 105, "255,206,120"], [1080, 330, 105, "255,206,120"], [300, 590, 105, "255,206,120"],
  [1040, 590, 105, "255,206,120"], [1000, 280, 105, "255,170,90"],
  [700, 480, 260, "170,255,200"], [700, 690, 100, "190,170,255"], [610, 590, 80, "150,200,255"],
  [480, 640, 120, "140,230,255"], [480, 320, 110, "255,150,170"], [1230, 160, 200, "255,240,190"],
  [700, 820, 80, "170,230,210"], [130, 830, 70, "230,200,110"], [1260, 720, 70, "127,224,208"],
  [1330, 560, 70, "201,160,255"], [430, 840, 70, "143,208,160"], [980, 840, 70, "191,230,255"],
  [1340, 400, 70, "224,144,90"], [830, 120, 80, "159,184,255"], [100, 330, 70, "199,111,214"],
];

function drawVillageLighting(ctx, cam, t) {
  const amb = timeOfDay();
  if (G.weather === "moon") amb[3] = Math.max(amb[3], 0.35);
  if (G.weather === "storm") amb[3] = Math.max(amb[3], 0.28);
  if (amb[3] <= 0.01) return;
  const lights = VIL_LIGHTS.map(([x, y, r, color], i) => ({ x: x - cam.x, y: y - cam.y, r: r * (1 + 0.04 * Math.sin(t * 5 + i * 1.7)), a: 0.85, color }));
  lights.push({ x: P.x - cam.x, y: P.y - 10 - cam.y, r: 150, a: 0.8, color: "255,226,170" });
  drawLighting(ctx, cam.vw, cam.vh, 0.5, amb, lights);
}

// ---------- Village air: swaying grass and seasonal drift ----------
const GRASS_COL = ["#5f9a4a", "#6aa84a", "#b8863a", "#9fb8a8"];
function drawGrassTufts(ctx, cam, t) {
  const CELL = 64, col = GRASS_COL[G.season] || GRASS_COL[0];
  const x0 = Math.floor(cam.x / CELL) - 1, x1 = Math.ceil((cam.x + cam.vw) / CELL) + 1;
  const y0 = Math.floor(cam.y / CELL) - 1, y1 = Math.ceil((cam.y + cam.vh) / CELL) + 1;
  ctx.strokeStyle = col; ctx.lineWidth = 1.6; ctx.lineCap = "round";
  ctx.globalAlpha = 0.8;
  ctx.beginPath();
  for (let cy = y0; cy <= y1; cy++) {
    for (let cx = x0; cx <= x1; cx++) {
      const h = Math.sin(cx * 127.1 + cy * 311.7) * 43758.5453, f = h - Math.floor(h);
      if (f > 0.3) continue;
      const x = cx * CELL + ((f * 977) % 1) * CELL, y = cy * CELL + ((f * 1531) % 1) * CELL;
      if (x < 0 || y < 0 || x > VIL.w || y > VIL.h) continue;
      let sway = Math.sin(t * 1.7 + x * 0.02 + y * 0.01) * 3;
      const dx = x - P.x, dy = y - P.y, d = Math.hypot(dx, dy);
      if (d < 46) sway += (dx / (d || 1)) * (46 - d) * 0.25;
      for (let b = -1; b <= 1; b++) {
        ctx.moveTo(x + b * 3, y);
        ctx.quadraticCurveTo(x + b * 4 + sway * 0.5, y - 6, x + b * 5 + sway, y - 11 + Math.abs(b) * 2);
      }
    }
  }
  ctx.stroke();
  ctx.globalAlpha = 1; ctx.lineCap = "butt";
}

// Spring petals, summer pollen, autumn leaves and winter snow, drifting over the screen.
function drawSeasonAir(ctx, t, w, h) {
  const s = G.season, n = s === 3 ? 46 : 26;
  for (let i = 0; i < n; i++) {
    const sp = 18 + (i % 5) * 7;
    let x, y;
    if (s === 1) { // pollen rises slowly
      x = (i * 211 + Math.sin(t * 0.5 + i) * 30) % w; y = h - ((i * 97 + t * sp * 0.5) % h);
    } else {
      x = ((i * 211 + t * (s === 3 ? 10 : 24) + Math.sin(t * 0.8 + i) * 28) % (w + 40)) - 20;
      y = (i * 97 + t * sp * (s === 3 ? 1.6 : 1.2)) % (h + 20) - 10;
    }
    if (s === 0) { ctx.fillStyle = i % 2 ? "rgba(255,190,215,.8)" : "rgba(255,230,240,.8)"; ctx.beginPath(); ctx.ellipse(x, y, 3.4, 1.9, t + i, 0, Math.PI * 2); ctx.fill(); }
    else if (s === 1) { ctx.fillStyle = `rgba(255,236,150,${0.25 + 0.25 * Math.sin(t * 2 + i)})`; ctx.beginPath(); ctx.arc(x, y, 1.8, 0, Math.PI * 2); ctx.fill(); }
    else if (s === 2) { ctx.fillStyle = ["#d9742e", "#e0a23a", "#b8502a"][i % 3]; ctx.beginPath(); ctx.ellipse(x, y, 5, 2.6, t * 1.4 + i, 0, Math.PI * 2); ctx.fill(); }
    else { ctx.fillStyle = "rgba(255,255,255,.85)"; ctx.beginPath(); ctx.arc(x, y, 1.4 + (i % 3) * 0.6, 0, Math.PI * 2); ctx.fill(); }
  }
}
