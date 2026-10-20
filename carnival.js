// Carnival Midway: a striped tent in the village with four classic fairground games.
//   Acorn Gallery  : aim a crosshair and shoot passing targets, but spare the hedgehogs.
//   High Striker   : stop the rising marker near the top and ring the bell.
//   Hunt the Acorn : a shell game. Follow the cup that hides the acorn.
//   Duck Pond      : drop the hook over a duck. Each colour is worth a different number of points.
// Each game can be played once per village day and pays Willowlight. Play all five to become Midway Champion.
const CV = { active: false, id: null, g: null, doneT: null, msg: "", flash: null };
const CV_IDS = ["gallery", "striker", "shell", "duck", "basket"];

GAME_THEMES.carnival = { top: "#2a1038", bottom: "#5c2a52", glow: "rgba(255,200,120,.3)", tree: "#190a24", mote: "255,220,160" };
GAME_THEMES.carnivalBlue = { top: "#102a48", bottom: "#245a78", glow: "rgba(160,220,255,.28)", tree: "#0a1c30", mote: "220,240,255" };
GAME_THEMES.carnivalWarm = { top: "#3a1c14", bottom: "#6a3a28", glow: "rgba(255,190,110,.3)", tree: "#24120c", mote: "255,210,150" };

const cvEase = u => 1 - Math.pow(1 - u, 3);

// The play area, measured from the screen and the header above it.
function cvLayout() {
  const w = typeof CAM !== "undefined" ? CAM.vw : 800, h = typeof CAM !== "undefined" ? CAM.vh : 500;
  const top = Math.max(GAME_HEADER_BOTTOM + 16, h * 0.2);
  const bottom = h - 40;
  const s = Math.max(0.6, Math.min(1.15, w / 800, (bottom - top) / 340));
  return { w, h, top, bottom, s };
}

function cvRoundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h);
}

function cvStar(ctx, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r;
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
}

// A string of pennants along the top of the screen.
function drawBunting(ctx, w, t) {
  const cols = ["#e0524a", "#f2c14e", "#5aa9e6", "#7bc67e", "#c77dd1"];
  ctx.strokeStyle = "rgba(240,230,200,.6)"; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(0, 2); ctx.quadraticCurveTo(w / 2, 10, w, 2); ctx.stroke();
  for (let x = 12, i = 0; x < w; x += 26, i++) {
    const sag = 2 + 8 * (1 - Math.pow((x / w) * 2 - 1, 2));
    const sway = Math.sin(t * 1.6 + i) * 1.2;
    ctx.fillStyle = cols[i % cols.length];
    ctx.beginPath(); ctx.moveTo(x - 8, sag - 1); ctx.lineTo(x + 8, sag - 1); ctx.lineTo(x + sway, sag + 14); ctx.closePath(); ctx.fill();
  }
}

// ---------------- start, end, loop ----------------
function startCarnivalGame(id) {
  const spec = CV_GAMES[id];
  if (!spec || miniGameBusy()) return;
  if (G.flags[`cv_${id}Day`] === G.day) { toast(spec.again); return; }
  G.flags[`cv_${id}Day`] = G.day;
  CV.active = true; CV.id = id; CV.doneT = null; CV.flash = null;
  CV.g = spec.init();
  CV.msg = spec.intro;
  document.getElementById("hud").style.visibility = "hidden";
  document.getElementById("prompt").classList.add("hidden");
}

function endCarnivalGame() {
  if (!CV.active) return;
  const spec = CV_GAMES[CV.id], id = CV.id, score = spec.score(CV.g);
  CV.active = false; CV.doneT = null; CV.g = null;
  document.getElementById("hud").style.visibility = "";
  const reward = spec.reward(score);
  if (reward > 0) addWillowlight(reward);
  const best = G.flags[`cv_${id}Best`] || 0;
  if (score > best) G.flags[`cv_${id}Best`] = score;
  toast(`${spec.title}: ${score} ${spec.unit}. ${reward ? "+" + reward + " Willowlight." : spec.consolation}${score > best ? " New best!" : ""}`, 5000);
  // play all five and the barker names you Midway Champion
  if (!flag("midwayChamp") && CV_IDS.every(k => (G.flags[`cv_${k}Best`] || 0) > 0)) {
    setFlag("midwayChamp");
    addWillowlight(15);
    toast("Midway Champion! All five games won. +15 Willowlight.", 6000);
  }
  saveGame();
}

function stepCarnival(dt) {
  if (CV.doneT != null) {
    CV.doneT -= dt;
    if (CV.doneT <= 0) endCarnivalGame();
    return;
  }
  if (CV.flash) { CV.flash.t -= dt; if (CV.flash.t <= 0) CV.flash = null; }
  const spec = CV_GAMES[CV.id];
  spec.step(CV.g, dt, cvLayout());
  if (CV.g && CV.g.done) CV.doneT = spec.endDelay || 1.5;
}


// ---------------- the midway at night: sky, wheel, tents, lights, curtains ----------------
function drawMidwayBackdrop(ctx, w, h, t, theme) {
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#0e0b2a"); sky.addColorStop(0.55, theme.top); sky.addColorStop(1, theme.bottom);
  ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
  // stars
  for (let i = 0; i < 40; i++) {
    const x = (i * 131) % w, y = (i * 71) % (h * 0.45);
    ctx.fillStyle = `rgba(255,248,220,${0.25 + 0.35 * Math.abs(Math.sin(t * 0.9 + i))})`;
    ctx.fillRect(x, y, 1.6, 1.6);
  }
  // a moon
  ctx.save();
  ctx.beginPath(); ctx.rect(0, 0, w, h); ctx.arc(w * 0.85 + 7, h * 0.16 - 3, 14, 0, Math.PI * 2);
  ctx.clip("evenodd");
  ctx.fillStyle = "rgba(255,244,205,.9)"; ctx.beginPath(); ctx.arc(w * 0.85, h * 0.16, 16, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // warm glow behind the booth
  const gl = ctx.createRadialGradient(w / 2, h * 0.5, 10, w / 2, h * 0.5, Math.max(w, h) * 0.65);
  gl.addColorStop(0, theme.glow); gl.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gl; ctx.fillRect(0, 0, w, h);
  // distant big-top tents
  const base = h * 0.34;
  const tents = [[0.12, 46, "#2a1f3d"], [0.34, 34, "#241a36"], [0.7, 40, "#2a1f3d"]];
  for (const [fx, tw, col] of tents) {
    const x = w * fx;
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.moveTo(x - tw, base); ctx.lineTo(x, base - tw * 0.9); ctx.lineTo(x + tw, base); ctx.closePath(); ctx.fill();
    ctx.fillRect(x - tw, base, tw * 2, h * 0.04);
    ctx.fillStyle = "#f2c14e"; ctx.beginPath(); ctx.arc(x, base - tw * 0.9, 2, 0, Math.PI * 2); ctx.fill();
  }
  // the wheel, turning slowly, with a lamp on each car
  const cx = w * 0.52, cy = h * 0.2, R = Math.min(w, h) * 0.17, rot = t * 0.12;
  ctx.strokeStyle = "rgba(60,48,90,.95)"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, R * 0.55, 0, Math.PI * 2); ctx.stroke();
  for (let i = 0; i < 12; i++) {
    const a = rot + (i / 12) * Math.PI * 2, x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x, y); ctx.stroke();
    ctx.fillStyle = ["#e0524a", "#f2c14e", "#5aa9e6", "#7bc67e"][i % 4];
    ctx.beginPath(); ctx.arc(x, y + 4, 3.4, 0, Math.PI * 2); ctx.fill();
    const lg = ctx.createRadialGradient(x, y + 4, 0, x, y + 4, 11);
    lg.addColorStop(0, "rgba(255,230,160,.45)"); lg.addColorStop(1, "rgba(255,230,160,0)");
    ctx.fillStyle = lg; ctx.fillRect(x - 11, y - 7, 22, 22);
  }
  ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx - R * 0.5, cy + R * 1.5); ctx.moveTo(cx, cy); ctx.lineTo(cx + R * 0.5, cy + R * 1.5); ctx.stroke();
  // hills in front of the wheel
  ctx.fillStyle = theme.tree;
  ctx.beginPath(); ctx.moveTo(0, h);
  for (let x = 0; x <= w; x += 18) ctx.lineTo(x, h * 0.36 + Math.sin(x * 0.019) * h * 0.03 + Math.sin(x * 0.055 + 1.1) * h * 0.015);
  ctx.lineTo(w, h); ctx.closePath(); ctx.fill();
  // paper lanterns and confetti drifting upward and down
  for (let i = 0; i < 7; i++) {
    const x = (i * 173 + Math.sin(t * 0.4 + i) * 14) % w, y = h - ((t * (9 + i * 2) + i * 90) % (h * 0.9));
    const lg = ctx.createRadialGradient(x, y, 0, x, y, 16);
    lg.addColorStop(0, "rgba(255,190,110,.55)"); lg.addColorStop(1, "rgba(255,190,110,0)");
    ctx.fillStyle = lg; ctx.fillRect(x - 16, y - 16, 32, 32);
    ctx.fillStyle = "rgba(255,170,90,.9)"; ctx.fillRect(x - 3, y - 4, 6, 8);
  }
  for (let i = 0; i < 18; i++) {
    const x = (i * 89 + t * 6) % w, y = (i * 61 + t * (14 + i % 4 * 4)) % h;
    ctx.fillStyle = ["#e0524a", "#f2c14e", "#5aa9e6", "#7bc67e", "#c77dd1"][i % 5];
    ctx.globalAlpha = 0.5; ctx.save(); ctx.translate(x, y); ctx.rotate(t * 2 + i); ctx.fillRect(-2, -1, 4, 2); ctx.restore(); ctx.globalAlpha = 1;
  }
  // a string of lamps under the bunting
  for (let x = 6, i = 0; x < w; x += 28, i++) {
    const y = 20 + 10 * (1 - Math.pow((x / w) * 2 - 1, 2));
    const on = 0.55 + 0.45 * Math.sin(t * 3 + i * 1.7);
    const lg = ctx.createRadialGradient(x, y, 0, x, y, 12);
    lg.addColorStop(0, `rgba(255,225,140,${0.5 * on})`); lg.addColorStop(1, "rgba(255,225,140,0)");
    ctx.fillStyle = lg; ctx.fillRect(x - 12, y - 12, 24, 24);
    ctx.fillStyle = `rgba(255,240,180,${0.6 + 0.4 * on})`; ctx.beginPath(); ctx.arc(x, y, 2.2, 0, Math.PI * 2); ctx.fill();
  }
  // red stage curtains with gold tassels at the sides
  const cw = Math.max(14, w * 0.035);
  for (const side of [0, 1]) {
    const x0 = side ? w - cw : 0;
    const cg = ctx.createLinearGradient(x0, 0, x0 + cw, 0);
    cg.addColorStop(0, side ? "#7d1f2a" : "#a32a36"); cg.addColorStop(1, side ? "#a32a36" : "#7d1f2a");
    ctx.fillStyle = cg; ctx.fillRect(x0, 0, cw, h);
    ctx.strokeStyle = "rgba(0,0,0,.25)"; ctx.lineWidth = 1;
    for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.moveTo(x0 + k * cw / 4, 0); ctx.lineTo(x0 + k * cw / 4, h); ctx.stroke(); }
    ctx.fillStyle = "#e8c15a"; ctx.fillRect(side ? x0 - 2 : x0 + cw, h * 0.55, 2, h * 0.05);
    ctx.beginPath(); ctx.arc(side ? x0 - 1 : x0 + cw + 1, h * 0.6, 3, 0, Math.PI * 2); ctx.fill();
  }
  // darker corners
  const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.38, w / 2, h / 2, Math.max(w, h) * 0.78);
  v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,.5)");
  ctx.fillStyle = v; ctx.fillRect(0, 0, w, h);
}

function drawCarnival(ctx, t, w, h) {
  const spec = CV_GAMES[CV.id], g = CV.g;
  drawMidwayBackdrop(ctx, w, h, t, GAME_THEMES[spec.theme]);
  drawBunting(ctx, w, t);
  spec.draw(g, ctx, t, cvLayout());
  if (CV.flash) {
    ctx.fillStyle = CV.flash.ok ? `rgba(255,230,140,${0.2 * CV.flash.t / CV.flash.max})` : `rgba(230,90,80,${0.28 * CV.flash.t / CV.flash.max})`;
    ctx.fillRect(0, 0, w, h);
  }
  gameHeader(ctx, spec.status(g), spec.hint);
  gameMessage(ctx, CV.msg, w / 2, h - 14, w);
}

function cvFlash(ok, secs) { CV.flash = { ok, t: secs, max: secs }; }

// ---------------- the menu at the tent ----------------
function openCarnivalMenu() {
  const rows = [["gallery", "Acorn Gallery"], ["striker", "High Striker"], ["shell", "Hunt the Acorn"], ["duck", "Duck Pond"], ["basket", "Berry Basket"]];
  const choices = rows.map(([id, name]) => {
    const played = G.flags[`cv_${id}Day`] === G.day;
    const best = G.flags[`cv_${id}Best`] || 0;
    return { label: `${name}${played ? " (played today)" : best ? ` (best ${best})` : ""}`, fn: () => startCarnivalGame(id) };
  });
  choices.push({ label: "Maybe later", fn: () => {} });
  const text = flag("midwayChamp")
    ? "Step right up, Midway Champion! One try at each game per day, and the lights stay on for you."
    : "Step right up, step right up! One try at each game per day, with a prize in Willowlight for a good score. Win at all five and the barker has a surprise.";
  openDialogue("Carnival Midway", text, choices);
}

// ---------------- Acorn Gallery ----------------
const GALLERY_KINDS = {
  mouse:    { v: 1,  size: 44, speed: 0.10, color: "#c9b8a6", weight: 35 },
  rabbit:   { v: 2,  size: 38, speed: 0.15, color: "#d8ccb8", weight: 25 },
  owl:      { v: 3,  size: 30, speed: 0.22, color: "#c98a4a", weight: 18 },
  hedgehog: { v: -2, size: 38, speed: 0.13, color: "#8a7a60", weight: 14 },
  star:     { v: 5,  size: 26, speed: 0.32, color: "#ffd24a", weight: 8 },
};
const GALLERY_TIME = 30;
const GALLERY_LANES = [0.18, 0.5, 0.82];

function galleryPick() {
  const total = Object.values(GALLERY_KINDS).reduce((a, k) => a + k.weight, 0);
  let r = Math.random() * total;
  for (const [name, k] of Object.entries(GALLERY_KINDS)) { r -= k.weight; if (r <= 0) return name; }
  return "mouse";
}

function gallerySpawn(g, pace) {
  // use the lane with the fewest targets, so the rows stay evenly filled
  const counts = [0, 0, 0];
  for (const tg of g.targets) if (!tg.hit) counts[tg.lane]++;
  const least = Math.min(...counts);
  const lanes = [0, 1, 2].filter(i => counts[i] === least);
  const lane = lanes[Math.floor(Math.random() * lanes.length)];
  const dir = lane % 2 === 0 ? 1 : -1;
  const x = dir > 0 ? -0.06 : 1.06;
  if (g.targets.some(tg => tg.lane === lane && Math.abs(tg.x - x) < 0.14)) return;
  const kind = galleryPick();
  g.targets.push({ kind, lane, dir, x, hit: false, hitT: 0 });
}

function galleryFire(g, L) {
  g.shots++; g.cd = 0.28;
  const cxp = g.x * L.w, cyp = L.top + g.y * (L.bottom - L.top);
  // nearest target under the crosshair, front-most first
  let best = null, bestD = 1e9;
  for (const tg of g.targets) {
    if (tg.hit) continue;
    const k = GALLERY_KINDS[tg.kind];
    const ty = L.top + (L.bottom - L.top) * GALLERY_LANES[tg.lane];
    const d = Math.hypot(tg.x * L.w - cxp, ty - cyp);
    const rad = k.size * L.s * 0.6 + 6;
    if (d <= rad && d < bestD) { best = tg; bestD = d; }
  }
  g.bursts.push({ x: cxp, y: cyp, t: 0, ok: !!best });
  if (!best) { CV.msg = "A miss. Take your time."; return; }
  const k = GALLERY_KINDS[best.kind];
  best.hit = true; best.hitT = 0;
  g.hits++;
  if (k.v < 0) {
    g.score = Math.max(0, g.score + k.v);
    CV.msg = "Not the hedgehog! Minus two.";
    cvFlash(false, 0.3);
  } else {
    g.score += k.v;
    CV.msg = k.v >= 5 ? "A golden star! Five points." : ["Bullseye!", "Right on target!", "Nice shot!", "Ping!"][g.hits % 4];
    cvFlash(true, 0.15);
  }
  g.pops.push({ x: best.x * L.w, y: L.top + (L.bottom - L.top) * GALLERY_LANES[best.lane] - 24 * L.s, text: (k.v > 0 ? "+" : "") + k.v, bad: k.v < 0, t: 0 });
}

const CV_GAME_GALLERY = {
  title: "Acorn Gallery", theme: "carnival", unit: "points",
  intro: "Aim with the d-pad and fire at the targets. Leave the hedgehogs alone.",
  again: "The gallery's acorns are all spent for today. Come back tomorrow.",
  consolation: "The barker shrugs.",
  hint: "Arrow keys, WASD or the d-pad to aim · Z, Space or Act to fire · Esc to finish early",
  reward: s => Math.min(10, Math.floor(s / 4)),
  score: g => g.score,
  status: g => `Acorn Gallery · ${Math.ceil(g.t)}s · ${g.score} points`,
  init: () => ({ t: GALLERY_TIME, x: 0.5, y: 0.5, cd: 0, score: 0, shots: 0, hits: 0, targets: [], spawnT: 0.4, pops: [], bursts: [], done: false }),
  step(g, dt, L) {
    g.t -= dt;
    if (g.t <= 0) { g.t = 0; g.done = true; CV.msg = "Time! The barker rings the bell."; return; }
    const mx = (isDown("right") ? 1 : 0) - (isDown("left") ? 1 : 0), my = (isDown("down") ? 1 : 0) - (isDown("up") ? 1 : 0);
    g.x = clamp(g.x + mx * dt * 0.7, 0.03, 0.97);
    g.y = clamp(g.y + my * dt * 0.8, 0, 1);
    g.cd -= dt;
    const elapsed = GALLERY_TIME - g.t, pace = 1 + elapsed / GALLERY_TIME;
    g.spawnT -= dt;
    if (g.spawnT <= 0) { g.spawnT = (0.5 + Math.random() * 0.45) / pace; gallerySpawn(g, pace); }
    for (const tg of g.targets) {
      if (tg.hit) { tg.hitT += dt; continue; }
      tg.x += tg.dir * GALLERY_KINDS[tg.kind].speed * pace * dt;
    }
    g.targets = g.targets.filter(tg => !(tg.hit && tg.hitT > 0.5) && tg.x > -0.12 && tg.x < 1.12);
    for (const p of g.pops) p.t += dt;
    g.pops = g.pops.filter(p => p.t < 0.8);
    for (const b of g.bursts) b.t += dt;
    g.bursts = g.bursts.filter(b => b.t < 0.3);
    if (wasPressed("act") && g.cd <= 0) galleryFire(g, L);
  },
  draw(g, ctx, t, L) {
    const laneY = i => L.top + (L.bottom - L.top) * GALLERY_LANES[i];
    // the booth: a dark panel with a gold edge and a rail under each row
    ctx.fillStyle = "rgba(48,24,34,.6)";
    cvRoundRect(ctx, 10, L.top - 14, L.w - 20, L.bottom - L.top + 40, 10); ctx.fill();
    ctx.strokeStyle = "rgba(230,190,100,.45)"; ctx.lineWidth = 1.2; ctx.stroke();
    for (let i = 0; i < 3; i++) {
      const y = laneY(i) + 22 * L.s + 6;
      ctx.strokeStyle = "#8a6a44"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(16, y); ctx.lineTo(L.w - 16, y); ctx.stroke();
      for (let x = 24; x < L.w - 16; x += 36) {
        ctx.fillStyle = `rgba(255,220,140,${0.35 + 0.35 * Math.sin(t * 3 + x * 0.1 + i)})`;
        ctx.beginPath(); ctx.arc(x, y + 7, 2.2, 0, Math.PI * 2); ctx.fill();
      }
    }
    // targets, drawn as painted cutouts on posts
    for (const tg of g.targets) {
      const k = GALLERY_KINDS[tg.kind], px = tg.x * L.w, py = laneY(tg.lane), sc = (k.size * L.s) / 26;
      ctx.save();
      ctx.translate(px, py);
      ctx.strokeStyle = "#6a4a2a"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(0, 10 * sc); ctx.lineTo(0, 22 * L.s + 6); ctx.stroke();
      if (tg.hit) {
        const a = Math.min(1, tg.hitT / 0.22);
        ctx.translate(0, 12 * sc); ctx.rotate(a * (Math.PI / 2) * tg.dir); ctx.translate(0, -12 * sc);
        ctx.globalAlpha = Math.max(0, 1 - tg.hitT / 0.5);
      }
      if (tg.kind === "star") {
        const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, k.size * L.s);
        glow.addColorStop(0, "rgba(255,230,120,.7)"); glow.addColorStop(1, "rgba(255,230,120,0)");
        ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(0, 0, k.size * L.s, 0, Math.PI * 2); ctx.fill();
        cvStar(ctx, k.size * L.s * 0.6); ctx.fillStyle = "#ffd24a"; ctx.fill();
        ctx.strokeStyle = "#a8741a"; ctx.lineWidth = 1.5; ctx.stroke();
      } else {
        ctx.scale(sc, sc);
        drawAnimalLocal(ctx, tg.kind, k.color, tg.dir, 0, 0, {});
      }
      ctx.restore();
      if (!tg.hit) {
        ctx.font = `bold ${Math.round(11 * Math.max(0.9, L.s))}px Georgia`; ctx.textAlign = "center";
        ctx.fillStyle = k.v < 0 ? "#ff9a8a" : "#fff2c0";
        ctx.fillText((k.v > 0 ? "+" : "") + k.v, px, py + 22 * L.s + 20);
        ctx.textAlign = "left";
      }
    }
    // little puffs where acorns landed, and score pops
    for (const b of g.bursts) {
      ctx.strokeStyle = b.ok ? `rgba(255,230,140,${1 - b.t / 0.3})` : `rgba(220,220,220,${0.8 - b.t / 0.4})`;
      ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(b.x, b.y, 6 + b.t * 70, 0, Math.PI * 2); ctx.stroke();
    }
    for (const p of g.pops) {
      ctx.font = "bold 16px Georgia"; ctx.textAlign = "center";
      ctx.fillStyle = p.bad ? `rgba(255,140,120,${1 - p.t / 0.8})` : `rgba(255,240,170,${1 - p.t / 0.8})`;
      ctx.fillText(p.text, p.x, p.y - p.t * 30); ctx.textAlign = "left";
    }
    // the crosshair, with a ring that fills while it reloads
    const cx = g.x * L.w, cy = L.top + g.y * (L.bottom - L.top), r = 16 * L.s + 4;
    ctx.strokeStyle = "rgba(255,226,130,.95)"; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - r - 6, cy); ctx.lineTo(cx - 4, cy); ctx.moveTo(cx + 4, cy); ctx.lineTo(cx + r + 6, cy);
    ctx.moveTo(cx, cy - r - 6); ctx.lineTo(cx, cy - 4); ctx.moveTo(cx, cy + 4); ctx.lineTo(cx, cy + r + 6); ctx.stroke();
    if (g.cd > 0) {
      ctx.strokeStyle = "rgba(255,255,255,.5)"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(cx, cy, r + 4, -Math.PI / 2, -Math.PI / 2 + (1 - g.cd / 0.28) * Math.PI * 2); ctx.stroke();
    }
  },
};

// ---------------- High Striker ----------------
const STRIKER_SWINGS = 3;
const CV_GAME_STRIKER = {
  title: "High Striker", theme: "carnivalWarm", unit: "points",
  intro: "Stop the marker as high as you can. The bell is at the very top.",
  again: "The mallet is resting for today. Come back tomorrow.",
  consolation: "The mallet barely bounces.",
  hint: "Z, Space or Act to swing when the marker is high · Esc to finish early",
  reward: s => Math.min(10, Math.floor(s / 4)),
  score: g => g.total,
  status: g => `High Striker · swing ${Math.min(g.swings + (g.phase === "aim" ? 1 : 0), STRIKER_SWINGS)} of ${STRIKER_SWINGS} · ${g.total} points`,
  init: () => ({ swings: 0, total: 0, p: 0, dir: 1, phase: "aim", t: 0, power: 0, puck: 0, last: 0, bell: false, done: false }),
  step(g, dt) {
    if (g.phase === "aim") {
      const speed = 1.15 + g.swings * 0.4;
      g.p += g.dir * speed * dt;
      if (g.p >= 1) { g.p = 1; g.dir = -1; } else if (g.p <= 0) { g.p = 0; g.dir = 1; }
      if (wasPressed("act")) { g.power = g.p; g.phase = "fly"; g.t = 0; g.swings++; CV.msg = ""; }
    } else if (g.phase === "fly") {
      g.t += dt;
      const dur = 0.35 + 0.7 * g.power;
      g.puck = cvEase(Math.min(1, g.t / dur)) * g.power;
      if (g.t >= dur) {
        g.bell = g.power >= 0.9;
        g.last = Math.round(g.power * 10) + (g.bell ? 5 : 0);
        g.total += g.last;
        CV.msg = g.bell ? `DING! The bell rings. ${g.last} points with the bonus!`
          : g.power >= 0.75 ? `So close to the bell! ${g.last} points.`
          : g.power >= 0.5 ? `A good strong swing. ${g.last} points.`
          : g.power >= 0.25 ? `Not bad. ${g.last} points.` : `A gentle tap. ${g.last} points.`;
        if (g.bell) cvFlash(true, 0.3);
        g.phase = "result"; g.t = 0;
      }
    } else if (g.phase === "result") {
      g.t += dt;
      if (g.t > 1.5) {
        if (g.swings >= STRIKER_SWINGS) g.done = true;
        else { g.phase = "aim"; g.p = 0; g.dir = 1; g.puck = 0; g.bell = false; CV.msg = "Swing again."; }
      }
    }
  },
  draw(g, ctx, t, L) {
    const cx = L.w * 0.5, tw = 40 * L.s + 14, yTop = L.top + 46, yBot = L.bottom - 34, H = yBot - yTop;
    const Y = p => yBot - p * H;
    // a wooden base and the tall track, banded from blue through green to red and gold at the top
    ctx.fillStyle = "rgba(0,0,0,.3)";
    ctx.beginPath(); ctx.ellipse(cx + 6, yBot + 12, tw + 30, 10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#6a4a2a"; cvRoundRect(ctx, cx - tw - 18, yBot + 2, tw * 2 + 36, 14, 4); ctx.fill();
    const track = ctx.createLinearGradient(0, yTop, 0, yBot);
    track.addColorStop(0, "#f0c24a"); track.addColorStop(0.1, "#d9534f"); track.addColorStop(0.5, "#6bbf59"); track.addColorStop(1, "#3a6ea5");
    ctx.fillStyle = track; cvRoundRect(ctx, cx - tw / 2, yTop, tw, H, 6); ctx.fill();
    ctx.strokeStyle = "#3a2414"; ctx.lineWidth = 3; ctx.stroke();
    // inner slot, so the puck reads as running inside the tower
    ctx.fillStyle = "rgba(10,10,20,.55)"; cvRoundRect(ctx, cx - 7, yTop + 4, 14, H - 8, 5); ctx.fill();
    // ticks and names
    ctx.font = "11px Georgia";
    for (let i = 0; i <= 10; i++) {
      const y = Y(i / 10);
      ctx.strokeStyle = "rgba(255,246,220,.55)"; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(cx - tw / 2 - (i % 5 === 0 ? 10 : 5), y); ctx.lineTo(cx - tw / 2, y); ctx.stroke();
    }
    ctx.fillStyle = "#fff2c0"; ctx.textAlign = "left";
    for (const [p, name] of [[0.25, "Mouse"], [0.5, "Rabbit"], [0.75, "Bear"], [0.92, "Champion"]]) ctx.fillText(name, cx + tw / 2 + 8, Y(p) + 4);
    ctx.textAlign = "left";
    // the bell at the top
    const ring = g.bell ? Math.max(0, 1 - g.t / 1.2) : 0;
    ctx.save(); ctx.translate(cx, yTop - 14); ctx.rotate(Math.sin(t * 28) * 0.35 * ring);
    ctx.fillStyle = "#e8b83a";
    ctx.beginPath(); ctx.moveTo(-14, 10); ctx.quadraticCurveTo(-14, -16, 0, -16); ctx.quadraticCurveTo(14, -16, 14, 10); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#8a6212"; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = "#8a6212"; ctx.beginPath(); ctx.arc(0, 12, 3, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    if (g.bell && g.phase === "result") {
      ctx.fillStyle = `rgba(255,236,150,${ring})`; ctx.font = "bold 20px Georgia"; ctx.textAlign = "center";
      ctx.fillText("DING!", cx, yTop - 40 - (1 - ring) * 12); ctx.textAlign = "left";
    }
    // the marker, swinging up and down while you aim
    if (g.phase === "aim") {
      const my = Y(g.p);
      ctx.fillStyle = "#fff6dc";
      ctx.beginPath(); ctx.moveTo(cx - tw / 2 - 4, my); ctx.lineTo(cx - tw / 2 - 18, my - 8); ctx.lineTo(cx - tw / 2 - 18, my + 8); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "rgba(255,246,220,.7)"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(cx - tw / 2, my); ctx.lineTo(cx + tw / 2, my); ctx.stroke();
    }
    // the puck rising inside the tower
    if (g.phase !== "aim") {
      const py = Y(g.puck);
      const grad = ctx.createRadialGradient(cx - 2, py - 2, 1, cx, py, 8);
      grad.addColorStop(0, "#ffd0c8"); grad.addColorStop(1, "#c0392b");
      ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(cx, py, 8, 0, Math.PI * 2); ctx.fill();
    }
    // the mallet, raised while you aim and brought down on the swing
    const swingA = g.phase === "aim" ? -1.25 : -1.25 + cvEase(Math.min(1, g.t / 0.14)) * 1.25 * (g.phase === "fly" ? 1 : 1);
    const ang = g.phase === "aim" ? -1.25 : (g.phase === "fly" ? swingA : 0);
    const pivX = cx - tw / 2 - 52 * L.s, pivY = yBot + 10, len = 50 * L.s;
    ctx.save(); ctx.translate(pivX, pivY); ctx.rotate(ang);
    ctx.strokeStyle = "#8a6238"; ctx.lineWidth = 5; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(len, 0); ctx.stroke();
    ctx.fillStyle = "#5a3a1e"; cvRoundRect(ctx, len - 6, -9, 18, 18, 3); ctx.fill();
    ctx.lineCap = "butt"; ctx.restore();
  },
};

// ---------------- Hunt the Acorn (shell game) ----------------
const SHELL_SLOTS = [0.26, 0.5, 0.74];
const SHELL_ROUNDS = 5;
const SHELL_COLORS = [["#d9534f", "#f7d9d6"], ["#3f7fc4", "#d6e6f7"], ["#5aa65a", "#d9f0d9"]];

function shellPlan(g) {
  const n = 3 + g.round;
  g.dur = Math.max(0.2, 0.62 - 0.08 * g.round);
  g.swaps = []; g.si = 0; g.st = 0;
  let lastKey = "";
  while (g.swaps.length < n) {
    const a = Math.floor(Math.random() * 3);
    let b = Math.floor(Math.random() * 3);
    if (a === b) continue;
    const key = [a, b].sort().join();
    if (key === lastKey) continue;
    lastKey = key;
    g.swaps.push([a, b]);
  }
}

const CV_GAME_SHELL = {
  title: "Hunt the Acorn", theme: "carnivalBlue", unit: "found",
  intro: "Watch where the acorn hides.",
  again: "The cups are packed away for today. Come back tomorrow.",
  consolation: "The cups giggle.",
  hint: "Left and Right to choose a cup · Z, Space or Act to pick it · Esc to finish early",
  reward: s => Math.min(10, s * 2),
  score: g => g.correct,
  status: g => `Hunt the Acorn · round ${Math.min(g.round, SHELL_ROUNDS)} of ${SHELL_ROUNDS} · ${g.correct} found`,
  init() {
    const g = { round: 1, correct: 0, phase: "show", t: 0, hidden: Math.floor(Math.random() * 3), sel: 1, picked: -1, ok: null, done: false,
      cups: [0, 1, 2].map(i => ({ id: i, slot: i, x: SHELL_SLOTS[i], dy: 0, lift: 0 })) };
    shellPlan(g);
    CV.msg = "Watch where the acorn hides.";
    return g;
  },
  step(g, dt) {
    // cups lift towards their targets, whatever the phase
    for (const c of g.cups) {
      let target = 0;
      if (g.phase === "show" && c.id === g.hidden) target = 1;
      if (g.phase === "reveal" && (c.id === g.hidden || c.id === g.picked)) target = 1;
      c.lift += clamp(target - c.lift, -dt * 4, dt * 4);
    }
    if (g.phase === "show") {
      g.t += dt;
      if (g.t > 1.5) { g.phase = "cover"; g.t = 0; CV.msg = "Keep your eyes on the cup!"; }
    } else if (g.phase === "cover") {
      g.t += dt;
      if (g.t > 0.5) { g.phase = "shuffle"; g.t = 0; }
    } else if (g.phase === "shuffle") {
      const [a, b] = g.swaps[g.si];
      g.st += dt;
      const u = Math.min(1, g.st / g.dur);
      const ca = g.cups.find(c => c.slot === a), cb = g.cups.find(c => c.slot === b);
      ca.x = SHELL_SLOTS[a] + (SHELL_SLOTS[b] - SHELL_SLOTS[a]) * cvEase(u);
      cb.x = SHELL_SLOTS[b] + (SHELL_SLOTS[a] - SHELL_SLOTS[b]) * cvEase(u);
      ca.dy = Math.sin(u * Math.PI);            // one cup swings in front, the other behind
      cb.dy = -Math.sin(u * Math.PI);
      if (u >= 1) {
        ca.slot = b; cb.slot = a; ca.x = SHELL_SLOTS[b]; cb.x = SHELL_SLOTS[a]; ca.dy = 0; cb.dy = 0;
        g.si++; g.st = 0;
        if (g.si >= g.swaps.length) { g.phase = "pick"; g.t = 0; CV.msg = "Which cup hides the acorn?"; }
      }
    } else if (g.phase === "pick") {
      if (wasPressed("left")) g.sel = clamp(g.sel - 1, 0, 2);
      if (wasPressed("right")) g.sel = clamp(g.sel + 1, 0, 2);
      if (wasPressed("act")) {
        const c = g.cups.find(cc => cc.slot === g.sel);
        g.picked = c.id;
        g.ok = c.id === g.hidden;
        if (g.ok) { g.correct++; CV.msg = "Found it! The acorn was right there."; cvFlash(true, 0.25); }
        else { CV.msg = "Not that one. The acorn was under the other cup."; cvFlash(false, 0.3); }
        g.phase = "reveal"; g.t = 0;
      }
    } else if (g.phase === "reveal") {
      g.t += dt;
      if (g.t > 1.7) {
        if (g.round >= SHELL_ROUNDS) { g.done = true; return; }
        g.round++; g.hidden = Math.floor(Math.random() * 3); g.picked = -1; g.ok = null;
        g.phase = "show"; g.t = 0; shellPlan(g);
        CV.msg = `Round ${g.round}: faster this time. Watch the acorn.`;
      }
    }
  },
  draw(g, ctx, t, L) {
    const s = L.s, midY = (L.top + L.bottom) / 2 + 24 * s, cw = 74 * s, ch = 70 * s;
    const X = f => f * L.w;
    // the table, with a checked cloth
    const tableTop = midY - 6 * s, tableH = 52 * s;
    ctx.fillStyle = "rgba(0,0,0,.28)";
    ctx.beginPath(); ctx.ellipse(L.w / 2 + 6, tableTop + tableH + 10, L.w * 0.42, 12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#8a4a32"; cvRoundRect(ctx, L.w * 0.08, tableTop + tableH * 0.5, L.w * 0.84, tableH * 0.9, 6); ctx.fill();
    ctx.fillStyle = "#e9dcc0"; cvRoundRect(ctx, L.w * 0.08, tableTop, L.w * 0.84, tableH, 8); ctx.fill();
    ctx.save(); cvRoundRect(ctx, L.w * 0.08, tableTop, L.w * 0.84, tableH, 8); ctx.clip();
    ctx.fillStyle = "rgba(190,70,60,.35)";
    for (let x = L.w * 0.08, i = 0; x < L.w * 0.92; x += 22 * s, i++) for (let y = tableTop, j = 0; y < tableTop + tableH; y += 22 * s, j++) if ((i + j) % 2 === 0) ctx.fillRect(x, y, 22 * s, 22 * s);
    ctx.restore();
    // the acorn lies on the table under its cup, and shows when that cup is lifted
    const hiddenCup = g.cups.find(c => c.id === g.hidden);
    const baseY = tableTop + tableH * 0.5;
    if (hiddenCup && hiddenCup.lift > 0.05) {
      const ax = X(hiddenCup.x), ay = baseY + 4 * s;
      ctx.fillStyle = "#8b5a2b"; ctx.beginPath(); ctx.ellipse(ax, ay, 9 * s, 11 * s, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#5a3a1c"; ctx.beginPath(); ctx.ellipse(ax, ay - 8 * s, 10 * s, 5 * s, 0, 0, Math.PI * 2); ctx.fill();
    }
    // cups, back to front, so the cup swinging behind is hidden by the one in front
    const order = [...g.cups].sort((a, b) => a.dy - b.dy);
    for (const c of order) {
      const x = X(c.x), y = baseY + c.dy * 22 * s - c.lift * 46 * s;
      const [col, light] = SHELL_COLORS[c.id];
      ctx.fillStyle = "rgba(0,0,0,.25)";
      ctx.beginPath(); ctx.ellipse(x + 4, baseY + c.dy * 22 * s + 6, cw * 0.5, 7 * s, 0, 0, Math.PI * 2); ctx.fill();
      // a cup upside down: wide at the rim, narrow at the top
      const body = ctx.createLinearGradient(x - cw / 2, 0, x + cw / 2, 0);
      body.addColorStop(0, col); body.addColorStop(0.35, light); body.addColorStop(1, col);
      ctx.fillStyle = body;
      ctx.beginPath(); ctx.moveTo(x - cw / 2, y); ctx.lineTo(x - cw * 0.32, y - ch); ctx.lineTo(x + cw * 0.32, y - ch); ctx.lineTo(x + cw / 2, y); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "rgba(30,20,20,.6)"; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,.55)"; ctx.fillRect(x - cw * 0.42, y - ch * 0.42, cw * 0.84, 6 * s);
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.ellipse(x, y - ch, cw * 0.32, 6 * s, 0, 0, Math.PI * 2); ctx.fill();
    }
    // the selection marker, during your pick
    if (g.phase === "pick") {
      const sx = X(SHELL_SLOTS[g.sel]), sy = baseY + 26 * s + Math.sin(t * 6) * 2;
      ctx.fillStyle = "#ffd27a";
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx - 12, sy + 16); ctx.lineTo(sx + 12, sy + 16); ctx.closePath(); ctx.fill();
    }
    // a tick for each round, filled when you found the acorn
    for (let i = 0; i < SHELL_ROUNDS; i++) {
      ctx.fillStyle = i < g.correct ? "#ffd27a" : (i < g.round - 1 || (i === g.round - 1 && g.phase === "reveal") ? "rgba(230,120,100,.7)" : "rgba(255,255,255,.2)");
      ctx.beginPath(); ctx.arc(L.w / 2 + (i - (SHELL_ROUNDS - 1) / 2) * 22, L.top + 10, 6, 0, Math.PI * 2); ctx.fill();
    }
  },
};

// ---------------- Duck Pond ----------------
const DUCK_TIME = 30;
const DUCK_KINDS = [
  { color: "#ffd84a", v: 1, weight: 60 },
  { color: "#ff9f43", v: 2, weight: 22 },
  { color: "#59b0ff", v: 3, weight: 13 },
  { color: "#fff0a0", v: 5, weight: 5, gold: true },
];

function duckPick() {
  const total = DUCK_KINDS.reduce((a, k) => a + k.weight, 0);
  let r = Math.random() * total;
  for (const k of DUCK_KINDS) { r -= k.weight; if (r <= 0) return k; }
  return DUCK_KINDS[0];
}

function duckLaneY(L, lane) {
  const top = L.top + 46, h = L.bottom - 14 - top;
  return top + h * (lane === 0 ? 0.3 : 0.7);
}

function drawDuck(ctx, x, y, size, dir, k, t, phase) {
  const bob = Math.sin(t * 2.4 + phase) * 1.5;
  ctx.save(); ctx.translate(x, y + bob); ctx.scale(dir * size / 20, size / 20);
  ctx.fillStyle = "rgba(0,0,0,.2)"; ctx.beginPath(); ctx.ellipse(0, 10, 15, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = k.color;
  ctx.beginPath(); ctx.ellipse(0, 3, 15, 10, 0, 0, Math.PI * 2); ctx.fill();            // body
  ctx.beginPath(); ctx.ellipse(-10, 0, 6, 5, 0.6, 0, Math.PI * 2); ctx.fill();          // tail
  ctx.beginPath(); ctx.arc(10, -8, 7.5, 0, Math.PI * 2); ctx.fill();                    // head
  ctx.fillStyle = "rgba(0,0,0,.14)"; ctx.beginPath(); ctx.ellipse(-1, 6, 11, 5, 0, 0, Math.PI); ctx.fill();
  ctx.fillStyle = "#f08a24"; ctx.beginPath(); ctx.moveTo(16, -9); ctx.lineTo(24, -6.5); ctx.lineTo(16, -4.5); ctx.closePath(); ctx.fill();  // beak
  ctx.fillStyle = "#1a1208"; ctx.beginPath(); ctx.arc(11.5, -9.5, 1.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,.35)"; ctx.beginPath(); ctx.ellipse(-2, -1, 8, 4, 0.2, 0, Math.PI * 2); ctx.fill();   // wing sheen
  if (k.gold) { ctx.strokeStyle = "rgba(255,255,200,.9)"; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(0, 0, 19 + Math.sin(t * 5) * 1.5, 0, Math.PI * 2); ctx.stroke(); }
  ctx.restore();
}

const CV_GAME_DUCK = {
  title: "Duck Pond", theme: "carnivalBlue", unit: "points",
  intro: "Move the hook over a duck, then drop it. Up and Down pick the far or near row.",
  again: "The ducks have gone to nap. Come back tomorrow.",
  consolation: "The ducks quack politely.",
  hint: "Arrow keys, WASD or the d-pad to move the hook · Z, Space or Act to drop it · Esc to finish early",
  reward: s => Math.min(10, Math.floor(s / 3)),
  score: g => g.score,
  status: g => `Duck Pond · ${Math.ceil(g.t)}s · ${g.score} points`,
  init: () => ({ t: DUCK_TIME, x: 0.5, lane: 0, hook: { phase: "idle", d: 0, x: 0.5, lane: 0, caught: null }, ducks: [], score: 0, caught: 0, spawnT: [0.2, 0.7], pops: [], done: false }),
  step(g, dt, L) {
    g.t -= dt;
    if (g.t <= 0) { g.t = 0; g.done = true; CV.msg = "Time! The ducks wave goodbye."; return; }
    const hook = g.hook, elapsed = DUCK_TIME - g.t, pace = 1 + elapsed / DUCK_TIME * 0.6;
    // ducks drift along two lanes in opposite directions
    for (let lane = 0; lane < 2; lane++) {
      g.spawnT[lane] -= dt;
      if (g.spawnT[lane] <= 0) {
        g.spawnT[lane] = (0.8 + Math.random() * 0.7) / pace;
        const dir = lane === 0 ? 1 : -1, k = duckPick();
        g.ducks.push({ lane, dir, x: dir > 0 ? -0.06 : 1.06, k, speed: 0.07 + Math.random() * 0.06, ph: Math.random() * 6 });
      }
    }
    for (const d of g.ducks) d.x += d.dir * d.speed * pace * dt;
    g.ducks = g.ducks.filter(d => d.x > -0.12 && d.x < 1.12);
    for (const p of g.pops) p.t += dt;
    g.pops = g.pops.filter(p => p.t < 0.9);
    // the hook only moves while it is up; Up and Down choose the lane to fish
    if (hook.phase === "idle") {
      const mx = (isDown("right") ? 1 : 0) - (isDown("left") ? 1 : 0);
      g.x = clamp(g.x + mx * dt * 0.6, 0.04, 0.96);
      if (wasPressed("up")) g.lane = 0;
      if (wasPressed("down")) g.lane = 1;
      if (wasPressed("act")) { hook.phase = "drop"; hook.d = 0; hook.x = g.x; hook.lane = g.lane; hook.caught = null; }
    } else if (hook.phase === "drop") {
      hook.d = Math.min(1, hook.d + dt / 0.45);
      if (hook.d >= 1) {
        // anything in the lane under the hook is caught: the nearest duck wins
        let best = null, bestD = 1e9;
        for (const d of g.ducks) {
          if (d.lane !== hook.lane) continue;
          const dist = Math.abs(d.x - hook.x) * L.w;
          if (dist < 16 * L.s + 12 && dist < bestD) { best = d; bestD = dist; }
        }
        if (best) {
          g.ducks.splice(g.ducks.indexOf(best), 1);
          hook.caught = best; g.score += best.k.v; g.caught++;
          g.pops.push({ x: hook.x * L.w, y: duckLaneY(L, hook.lane) - 20, text: "+" + best.k.v, t: 0 });
          CV.msg = best.k.gold ? "A golden duck! Five points." : ["Got one!", "Quack!", "Nice catch!", "Caught!"][g.caught % 4];
          cvFlash(true, 0.15);
        } else { CV.msg = "Just water. Try again."; }
        hook.phase = "rise";
      }
    } else if (hook.phase === "rise") {
      hook.d = Math.max(0, hook.d - dt / 0.45);
      if (hook.d <= 0) { hook.phase = "idle"; hook.caught = null; }
    }
  },
  draw(g, ctx, t, L) {
    const s = L.s, pondTop = L.top + 30, pondBot = L.bottom - 4;
    // the pond: a bank of water with soft bands and drifting wave marks
    const water = ctx.createLinearGradient(0, pondTop, 0, pondBot);
    water.addColorStop(0, "rgba(70,150,190,.85)"); water.addColorStop(1, "rgba(24,70,110,.9)");
    ctx.fillStyle = water; cvRoundRect(ctx, 10, pondTop, L.w - 20, pondBot - pondTop, 14); ctx.fill();
    ctx.strokeStyle = "rgba(200,235,255,.35)"; ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = "rgba(220,245,255,.22)"; ctx.lineWidth = 1.5;
    for (let i = 0; i < 14; i++) {
      const wx = ((i * 83 + t * 14) % (L.w - 40)) + 20, wy = pondTop + 12 + (i * 37) % (pondBot - pondTop - 24);
      ctx.beginPath(); ctx.ellipse(wx, wy, 16, 3, 0, 0, Math.PI * 2); ctx.stroke();
    }
    // ducks, far lane first so the near lane overlaps it
    for (let lane = 0; lane < 2; lane++) {
      const y = duckLaneY(L, lane), size = (lane === 0 ? 20 : 26) * Math.max(0.8, s);
      for (const d of g.ducks) if (d.lane === lane) {
        drawDuck(ctx, d.x * L.w, y, size, d.dir, d.k, t, d.ph);
        ctx.strokeStyle = "rgba(220,245,255,.3)"; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.ellipse(d.x * L.w - d.dir * size * 0.9, y + size * 0.55, size * 0.7, 3, 0, 0, Math.PI * 2); ctx.stroke();
      }
    }
    // the lane you are fishing, marked on the water under the hook
    const hook = g.hook, hx = (hook.phase === "idle" ? g.x : hook.x) * L.w, lane = hook.phase === "idle" ? g.lane : hook.lane;
    const ly = duckLaneY(L, lane);
    ctx.strokeStyle = "rgba(255,240,170,.7)"; ctx.lineWidth = 2; ctx.setLineDash([5, 4]);
    ctx.beginPath(); ctx.ellipse(hx, ly + 6, 22 * s + 6, 7 * s + 2, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    // the rod, the line and the hook, with a caught duck dangling from it as it rises
    const hy = L.top + 4 + (ly - (L.top + 4)) * cvEase(hook.d);
    ctx.strokeStyle = "#7a5a34"; ctx.lineWidth = 5; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(hx + 26, L.top - 6); ctx.lineTo(hx + 6, L.top + 6); ctx.stroke(); ctx.lineCap = "butt";
    ctx.strokeStyle = "rgba(255,255,255,.75)"; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(hx + 6, L.top + 6); ctx.lineTo(hx, hy); ctx.stroke();
    ctx.strokeStyle = "#d8d8d8"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(hx, hy + 5, 5, -0.4, Math.PI * 1.2); ctx.stroke();
    if (hook.caught) drawDuck(ctx, hx, hy + 14, 22 * Math.max(0.8, s), 1, hook.caught.k, t, 0);
    for (const p of g.pops) {
      ctx.font = "bold 18px Georgia"; ctx.textAlign = "center";
      ctx.fillStyle = `rgba(255,240,170,${1 - p.t / 0.9})`;
      ctx.fillText(p.text, p.x, p.y - p.t * 34); ctx.textAlign = "left";
    }
    // what each colour is worth
    let lx = 22;
    for (const k of DUCK_KINDS) {
      ctx.fillStyle = k.color; ctx.beginPath(); ctx.arc(lx, pondBot - 14, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fff6dc"; ctx.font = "bold 12px Georgia"; ctx.fillText(String(k.v), lx + 10, pondBot - 10);
      lx += 40;
    }
  },
};

// ---------------- Berry Basket ----------------
const BASKET_TIME = 30;
const BASKET_KINDS = {
  berry: { v: 1, w: 50, r: 7 },
  acorn: { v: 2, w: 28, r: 8 },
  honey: { v: 3, w: 8,  r: 8 },
  burr:  { v: -3, w: 14, r: 8 },
};
function basketPick() {
  let n = Math.random() * 100;
  for (const [k, d] of Object.entries(BASKET_KINDS)) { n -= d.w; if (n <= 0) return k; }
  return "berry";
}
function drawBasketItem(ctx, k, x, y, s, t, ph) {
  const r = BASKET_KINDS[k].r * s;
  ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t * 3 + ph) * 0.3);
  ctx.lineJoin = "round"; ctx.strokeStyle = "rgba(20,12,8,.6)"; ctx.lineWidth = 1.4;
  if (k === "berry") {
    const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 1, 0, 0, r * 1.2); g.addColorStop(0, "#ff7a9a"); g.addColorStop(1, "#a8234f");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#5f9a4a"; ctx.beginPath(); ctx.ellipse(r * 0.1, -r * 0.95, r * 0.55, r * 0.22, -0.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.6)"; ctx.beginPath(); ctx.arc(-r * 0.35, -r * 0.3, r * 0.2, 0, Math.PI * 2); ctx.fill();
  } else if (k === "acorn") {
    ctx.fillStyle = "#c58a46"; ctx.beginPath(); ctx.ellipse(0, r * 0.2, r * 0.8, r * 1.0, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#7a4e26"; ctx.beginPath(); ctx.ellipse(0, -r * 0.55, r * 0.95, r * 0.5, 0, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,.35)"; ctx.beginPath(); ctx.ellipse(-r * 0.3, r * 0.1, r * 0.15, r * 0.4, 0, 0, Math.PI * 2); ctx.fill();
  } else if (k === "honey") {
    const gl = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 2.4); gl.addColorStop(0, "rgba(255,210,90,.5)"); gl.addColorStop(1, "rgba(255,210,90,0)");
    ctx.fillStyle = gl; ctx.fillRect(-r * 2.4, -r * 2.4, r * 4.8, r * 4.8);
    ctx.fillStyle = "#ffc247"; ctx.beginPath(); ctx.moveTo(0, -r * 1.3); ctx.quadraticCurveTo(r * 1.1, r * 0.2, 0, r * 1.0); ctx.quadraticCurveTo(-r * 1.1, r * 0.2, 0, -r * 1.3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,.55)"; ctx.beginPath(); ctx.ellipse(-r * 0.3, 0, r * 0.18, r * 0.35, 0, 0, Math.PI * 2); ctx.fill();
  } else {
    ctx.fillStyle = "#6b4a2a";
    ctx.beginPath();
    for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6, rr = i % 2 ? r * 0.75 : r * 1.3; const px = Math.cos(a) * rr, py = Math.sin(a) * rr; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#e8d44a"; for (const sx of [-1, 1]) { ctx.beginPath(); ctx.arc(sx * r * 0.32, -r * 0.1, r * 0.17, 0, Math.PI * 2); ctx.fill(); }
    ctx.strokeStyle = "#140c08"; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-r * 0.3, r * 0.3); ctx.lineTo(r * 0.3, r * 0.3); ctx.stroke();
  }
  ctx.restore();
}
function basketY(L) { return L.bottom - (L.h < 560 ? 62 : 40) * L.s; }
function drawWickerBasket(ctx, x, y, s, tilt) {
  const w = 30 * s, h = 24 * s;
  ctx.save(); ctx.translate(x, y); ctx.rotate(tilt);
  ctx.strokeStyle = "#7a5230"; ctx.lineWidth = 3 * s; ctx.lineCap = "round";
  ctx.beginPath(); ctx.arc(0, -h * 0.35, w * 0.85, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke(); ctx.lineCap = "butt";
  const g = ctx.createLinearGradient(0, -h * 0.4, 0, h);
  g.addColorStop(0, "#d8a85a"); g.addColorStop(1, "#8c5e30");
  ctx.fillStyle = g; ctx.strokeStyle = "rgba(20,12,8,.65)"; ctx.lineWidth = 1.6; ctx.lineJoin = "round";
  ctx.beginPath(); ctx.moveTo(-w, -h * 0.4); ctx.lineTo(w, -h * 0.4); ctx.lineTo(w * 0.78, h); ctx.lineTo(-w * 0.78, h); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = "rgba(60,36,16,.45)"; ctx.lineWidth = 1;
  for (let i = 0; i < 4; i++) { const yy = -h * 0.4 + (i + 1) * h * 0.28; ctx.beginPath(); ctx.moveTo(-w + i * 1.2, yy); ctx.lineTo(w - i * 1.2, yy); ctx.stroke(); }
  for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(i * w / 3.4, -h * 0.4); ctx.lineTo(i * w / 4.4, h); ctx.stroke(); }
  ctx.fillStyle = "#b07a3c"; ctx.strokeStyle = "rgba(20,12,8,.65)"; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.ellipse(0, -h * 0.4, w, h * 0.2, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.restore();
}

const CV_GAME_BASKET = {
  title: "Berry Basket", theme: "carnival", unit: "points",
  intro: "Catch berries, acorns and honey. Dodge the burrs!",
  again: "The fruit stall has packed up its baskets. Come back tomorrow.",
  consolation: "The stallholder presses a single berry into your paw.",
  hint: "Left and Right to move the basket · Esc to finish early",
  reward: s => Math.min(10, Math.floor(s / 5)),
  score: g => g.score,
  status: g => `Berry Basket · ${Math.ceil(g.t)}s · ${g.score} points${g.streak >= 3 ? " · streak " + g.streak : ""}`,
  init: () => ({ t: BASKET_TIME, x: 0.5, vx: 0, tilt: 0, items: [], spawnT: 0.4, score: 0, streak: 0, best: 0, pops: [], done: false }),
  step(g, dt, L) {
    g.t -= dt;
    if (g.t <= 0) { g.t = 0; g.done = true; CV.msg = "Time! What a harvest."; return; }
    const elapsed = BASKET_TIME - g.t, pace = 1 + elapsed / BASKET_TIME * 0.7;
    const mx = (isDown("right") ? 1 : 0) - (isDown("left") ? 1 : 0);
    g.vx += (mx * 0.95 - g.vx) * Math.min(1, dt * 12);
    g.x = clamp(g.x + g.vx * dt, 0.06, 0.94);
    g.tilt += (g.vx * 0.12 - g.tilt) * Math.min(1, dt * 10);
    g.spawnT -= dt;
    if (g.spawnT <= 0) {
      g.spawnT = (0.42 + Math.random() * 0.4) / pace;
      g.items.push({ k: basketPick(), x: 0.07 + Math.random() * 0.86, y: 0, vy: (0.34 + Math.random() * 0.2) * pace, ph: Math.random() * 6 });
    }
    const play = L.bottom - L.top, by = L.bottom - 34 * L.s, halfW = 28 * L.s;
    for (const it of g.items) {
      it.y += it.vy * dt;
      const px = it.x * L.w, py = L.top + it.y * play * 0.95;
      it.py = py;
      if (!it.got && py >= by - 8 && py <= by + 12 * L.s && Math.abs(px - g.x * L.w) < halfW) {
        it.got = true;
        const d = BASKET_KINDS[it.k];
        if (d.v > 0) {
          g.streak++; g.best = Math.max(g.best, g.streak);
          let gain = d.v + (g.streak > 0 && g.streak % 5 === 0 ? 2 : 0);
          g.score += gain;
          g.pops.push({ x: px, y: by - 18, text: "+" + gain, t: 0, good: true });
          CV.msg = g.streak > 0 && g.streak % 5 === 0 ? `${g.streak} in a row! Bonus berries.` : it.k === "honey" ? "A honey drop! Three points." : ["Got it!", "Nice catch!", "Plop!", "Lovely."][g.score % 4];
          cvFlash(true, 0.1);
        } else {
          g.score = Math.max(0, g.score + d.v); g.streak = 0;
          g.pops.push({ x: px, y: by - 18, text: String(d.v), t: 0, good: false });
          CV.msg = "Ouch! A burr. The streak is gone."; cvFlash(false, 0.2);
        }
      }
    }
    g.items = g.items.filter(it => !it.got && (it.py == null || it.py < L.bottom + 16));
    for (const p of g.pops) p.t += dt;
    g.pops = g.pops.filter(p => p.t < 0.8);
  },
  draw(g, ctx, t, L) {
    const s = L.s;
    // a leafy bough along the top, where the fruit lets go
    ctx.fillStyle = "#3f6a3a"; ctx.strokeStyle = "rgba(20,12,8,.55)"; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(0, L.top - 6); ctx.quadraticCurveTo(L.w / 2, L.top + 10, L.w, L.top - 6); ctx.lineTo(L.w, L.top - 22); ctx.lineTo(0, L.top - 22); ctx.closePath(); ctx.fill(); ctx.stroke();
    for (let i = 0; i < 16; i++) {
      const lx = (i + 0.5) * L.w / 16, ly = L.top - 4 + Math.sin(lx / L.w * Math.PI) * 6 + Math.sin(t * 1.5 + i) * 1.5;
      ctx.fillStyle = i % 2 ? "#5f9a4a" : "#4a8040";
      ctx.beginPath(); ctx.ellipse(lx, ly, 9, 4, 0.6 * (i % 2 ? 1 : -1), 0, Math.PI * 2); ctx.fill();
    }
    for (const it of g.items) if (it.py != null) drawBasketItem(ctx, it.k, it.x * L.w, it.py, Math.max(0.9, s * 1.2), t, it.ph);
    // the basket, with a soft shadow on the grass
    const by = basketY(L);
    ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.beginPath(); ctx.ellipse(g.x * L.w, by + 24 * s, 32 * s, 6 * s, 0, 0, Math.PI * 2); ctx.fill();
    drawWickerBasket(ctx, g.x * L.w, by + 8 * s, Math.max(0.85, s * 1.1), g.tilt);
    for (const p of g.pops) {
      ctx.font = "bold 18px Georgia"; ctx.textAlign = "center";
      ctx.fillStyle = p.good ? `rgba(255,240,170,${1 - p.t / 0.8})` : `rgba(255,140,120,${1 - p.t / 0.8})`;
      ctx.fillText(p.text, p.x, p.y - p.t * 34); ctx.textAlign = "left";
    }
    // a key to the fruit
    let lx = 24; const ky = L.top + 22;
    ctx.fillStyle = "rgba(20,26,18,.55)"; cvRoundRect(ctx, 6, ky - 13, 232, 26, 8); ctx.fill();
    for (const k of ["berry", "acorn", "honey", "burr"]) {
      drawBasketItem(ctx, k, lx, ky, 0.8, 0, 0);
      ctx.font = "12px Georgia"; ctx.fillStyle = "#fff6dc"; ctx.fillText(BASKET_KINDS[k].v > 0 ? "+" + BASKET_KINDS[k].v : String(BASKET_KINDS[k].v), lx + 11, ky + 4);
      lx += 56;
    }
  },
};

const CV_GAMES = { gallery: CV_GAME_GALLERY, striker: CV_GAME_STRIKER, shell: CV_GAME_SHELL, duck: CV_GAME_DUCK, basket: CV_GAME_BASKET };

// ---------------- the tent in the village ----------------
function drawCarnivalTent(ctx, x, y, t) {
  ctx.fillStyle = "rgba(0,0,0,.3)";
  ctx.beginPath(); ctx.ellipse(x + 8, y + 8, 80, 14, 0, 0, Math.PI * 2); ctx.fill();
  const bw = 64, wallTop = y - 44;
  // striped walls, shaded toward the right
  for (let i = -bw; i < bw; i += 16) { ctx.fillStyle = (i / 16) & 1 ? "#f5ecd6" : "#c8453d"; ctx.fillRect(x + i, wallTop, 16, 44); }
  const shade = ctx.createLinearGradient(x - bw, 0, x + bw, 0);
  shade.addColorStop(0, "rgba(255,255,255,.1)"); shade.addColorStop(1, "rgba(0,0,0,.3)");
  ctx.fillStyle = shade; ctx.fillRect(x - bw, wallTop, bw * 2, 44);
  // the cone of the roof, in alternating wedges
  const apexY = y - 112;
  for (let k = 0; k < 8; k++) {
    const x0 = x - 76 + k * 19, x1 = x0 + 19;
    ctx.fillStyle = k % 2 ? "#f5ecd6" : "#c8453d";
    ctx.beginPath(); ctx.moveTo(x0, wallTop); ctx.lineTo(x1, wallTop); ctx.lineTo(x, apexY); ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = "rgba(0,0,0,.18)";
  ctx.beginPath(); ctx.moveTo(x, wallTop); ctx.lineTo(x + 76, wallTop); ctx.lineTo(x, apexY); ctx.closePath(); ctx.fill();
  // scalloped valance along the eaves
  for (let k = 0; k < 8; k++) {
    ctx.fillStyle = k % 2 ? "#c8453d" : "#f5ecd6";
    ctx.beginPath(); ctx.arc(x - 66 + k * 19 + 9.5, wallTop, 9.5, 0, Math.PI); ctx.fill();
  }
  // the entrance, with its curtains parted
  ctx.fillStyle = "#2a1424";
  ctx.beginPath(); ctx.moveTo(x - 15, y); ctx.lineTo(x - 15, y - 26); ctx.quadraticCurveTo(x, y - 40, x + 15, y - 26); ctx.lineTo(x + 15, y); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#e8b83a";
  ctx.beginPath(); ctx.moveTo(x - 15, y - 26); ctx.lineTo(x - 5, y); ctx.lineTo(x - 15, y); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x + 15, y - 26); ctx.lineTo(x + 5, y); ctx.lineTo(x + 15, y); ctx.closePath(); ctx.fill();
  // the sign
  ctx.fillStyle = "#3a2414"; cvRoundRect(ctx, x - 34, wallTop + 8, 68, 17, 4); ctx.fill();
  ctx.strokeStyle = "#e8b83a"; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = "#ffe9a0"; ctx.font = "bold 11px Georgia"; ctx.textAlign = "center";
  ctx.fillText("MIDWAY", x, wallTop + 20); ctx.textAlign = "left";
  // a pennant on the peak, flapping
  ctx.strokeStyle = "#5a3a1c"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x, apexY); ctx.lineTo(x, apexY - 20); ctx.stroke();
  const fl = Math.sin(t * 4) * 3;
  ctx.fillStyle = "#e8b83a";
  ctx.beginPath(); ctx.moveTo(x, apexY - 20); ctx.lineTo(x + 18 + fl, apexY - 15); ctx.lineTo(x, apexY - 8); ctx.closePath(); ctx.fill();
  // string lights, twinkling, and a warm glow spilling onto the ground
  const cols = ["#ffd24a", "#ff7a6a", "#7ad0ff", "#9be08a"];
  for (let k = 0; k < 9; k++) {
    const lx = x - 72 + k * 18, ly = wallTop + 12 + Math.sin(k * 0.7) * 2 + (1 - Math.pow((k - 4) / 4, 2)) * 5;
    ctx.fillStyle = cols[k % 4]; ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 3 + k * 1.3);
    ctx.beginPath(); ctx.arc(lx, ly, 2.4, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  const glow = ctx.createRadialGradient(x, y - 20, 4, x, y - 20, 90);
  glow.addColorStop(0, "rgba(255,200,120,.22)"); glow.addColorStop(1, "rgba(255,200,120,0)");
  ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(x, y - 20, 90, 0, Math.PI * 2); ctx.fill();
}

// ---------------- village point, notices and journal ----------------
VIL_POINTS.push({ id: "carnival", kind: "carnival", label: "Carnival Midway", x: 480, y: 325, r: 56 });

DATA.notices.push(
  { text: "THE MIDWAY IS OPEN! Five games under the striped tent: shoot the targets, ring the bell, find the acorn, hook a duck, and catch the harvest. Please spare the hedgehogs.", when: () => true },
  { text: "Midway news: whoever wins at all five games earns the title of Champion. The barker says there is a surprise in it.", when: () => CV_IDS.some(id => (G.flags[`cv_${id}Best`] || 0) > 0) && !flag("midwayChamp") }
);
DATA.lore.push(
  { title: "The Midway Lights", text: "On warm evenings the tent glows like a small star. The creatures say the lights were hung by someone who wanted the village to remember how to play.", unlock: () => CV_IDS.some(id => (G.flags[`cv_${id}Best`] || 0) > 0) },
  { title: "Midway Champion", text: "Five games, five wins. The barker tips a very small hat and says the village has not had a champion since the old fair, long before the blight.", unlock: () => flag("midwayChamp") }
);
