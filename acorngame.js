// Acorn Memory: a village minigame at the squirrel's stump.
// The stash lights up in order: up, right, down, left. Repeat it with the arrow keys, WASD or the d-pad.
// Each cleared level adds one more acorn. You get a few seconds per acorn, and one mistake ends the round.
// One round per village day.
const AM = { active: false, level: 1, cleared: 0, seq: [], idx: 0, phase: "show", t: 0, inT: 0, flash: null, msg: "" };
const AM_LEVELS = 5;
const AM_DIRS = ["up", "right", "down", "left"];   // matches the four stash holes, clockwise from the top
const AM_LEAD = 1.0;     // pause before the stash starts to light
const AM_STEP = 0.9;     // time per acorn while the stash is shown
const AM_LIT = 0.6;      // how long each acorn stays lit within its step
const AM_GRACE = 0.35;   // presses in the first moments of your turn are ignored, so the playback can't leak in
const AM_LIMIT = 4.0;    // seconds allowed between acorns on your turn
const AM_PAUSE = 1.4;    // pause after a cleared level, before the next stash
const AM_END = 1.8;      // pause after a round ends, before the summary toast

function startAcornMemory() {
  if (AM.active || MG.active || SK.active || WM.active || RT.active || CV.active) return;
  if (G.flags.acornDay === G.day) {
    toast("The squirrel has hidden its stash for today. Come back tomorrow.");
    return;
  }
  G.flags.acornDay = G.day;
  AM.active = true;
  AM.level = 1; AM.cleared = 0; AM.flash = null;
  beginAcornLevel();
  document.getElementById("hud").style.visibility = "hidden";
  document.getElementById("prompt").classList.add("hidden");
}

function beginAcornLevel() {
  const len = 2 + AM.level;
  AM.seq = [];
  for (let i = 0; i < len; i++) AM.seq.push(Math.floor(Math.random() * 4));
  AM.phase = "show"; AM.idx = 0; AM.t = 0; AM.inT = 0;
  AM.msg = `Level ${AM.level} of ${AM_LEVELS}: watch the stash.`;
}

function endAcornMemory() {
  if (!AM.active) return;
  AM.active = false;
  document.getElementById("hud").style.visibility = "";
  const reward = Math.min(10, AM.cleared * 2);
  if (reward > 0) addWillowlight(reward);
  const best = G.flags.acornBest || 0;
  if (AM.cleared > best) G.flags.acornBest = AM.cleared;
  toast(`Acorn Memory: ${AM.cleared} ${AM.cleared === 1 ? "level" : "levels"} remembered. ${reward ? "+" + reward + " Willowlight." : "The squirrel shrugs."}${AM.cleared > best ? " New best!" : ""}`, 5000);
  saveGame();
}

// Which acorn of the stash is lit right now, or -1.
function acornLit() {
  if (AM.phase !== "show") return -1;
  const local = AM.t - AM_LEAD;
  if (local < 0) return -1;
  const k = Math.floor(local / AM_STEP);
  if (k >= AM.seq.length) return -1;
  return (local - k * AM_STEP) < AM_LIT ? AM.seq[k] : -1;
}

function acornFail(msg) {
  AM.flash = { ok: false, t: 0.35 };
  AM.phase = "done"; AM.t = 0;
  AM.msg = msg;
}

function acornInput(i) {
  if (AM.phase !== "input") return;
  if (AM.t < AM_GRACE) return;               // too early: still the squirrel's turn
  if (i === AM.seq[AM.idx]) {
    AM.flash = { ok: true, t: 0.25 };
    AM.idx++; AM.inT = 0;
    if (AM.idx >= AM.seq.length) {
      AM.cleared++;
      if (AM.level >= AM_LEVELS) {
        AM.phase = "done"; AM.t = 0;
        AM.msg = "The squirrel nods. Every acorn is back in its place.";
      } else {
        AM.phase = "pause"; AM.t = 0;
        AM.msg = `Correct. Level ${AM.level + 1} adds one more acorn.`;
      }
    }
  } else {
    acornFail("Oops, the acorns scattered.");
  }
}

function stepAcornMemory(dt) {
  if (AM.flash) { AM.flash.t -= dt; if (AM.flash.t <= 0) AM.flash = null; }

  if (AM.phase === "show") {
    AM.t += dt;
    if (AM.t - AM_LEAD >= AM.seq.length * AM_STEP) {
      AM.phase = "input"; AM.idx = 0; AM.t = 0; AM.inT = 0;
      AM.msg = "Your turn. Repeat the stash, and be quick about it.";
    }
  } else if (AM.phase === "input") {
    AM.t += dt; AM.inT += dt;
    for (let i = 0; i < AM_DIRS.length; i++) {
      if (wasPressed(AM_DIRS[i])) acornInput(i);
      if (AM.phase !== "input") break;
    }
    if (AM.phase === "input" && AM.inT > AM_LIMIT) acornFail("Too slow. The acorns scattered.");
  } else if (AM.phase === "pause") {
    AM.t += dt;
    if (AM.t >= AM_PAUSE) { AM.level++; beginAcornLevel(); }
  } else if (AM.phase === "done") {
    AM.t += dt;
    if (AM.t > AM_END) endAcornMemory();
  }
}

function drawAcornMemory(ctx, t, w, h) {
  drawGameBackdrop(ctx, w, h, t, GAME_THEMES.forest);
  // fit the stump to the screen: shrink it on narrow or short screens, and lay the rest out beneath the header
  const hb = GAME_HEADER_BOTTOM;
  const k = Math.max(0.55, Math.min(1, (w - 24) / 400, (h - hb - 150) / 300));
  const cx = w / 2, cy = Math.max(hb + 56 + 125 * k, h * 0.48);

  ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k); ctx.translate(-cx, -cy);
  // the stump, with its rings
  const wood = ctx.createRadialGradient(cx - 40, cy - 30, 20, cx, cy, 200);
  wood.addColorStop(0, "#9a7450"); wood.addColorStop(1, "#4a3220");
  ctx.fillStyle = wood;
  ctx.beginPath(); ctx.ellipse(cx, cy, 190, 120, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "rgba(40,24,10,.45)"; ctx.lineWidth = 2;
  for (const r of [150, 110, 70]) {
    ctx.beginPath(); ctx.ellipse(cx, cy, r, r * 0.6, 0, 0, Math.PI * 2); ctx.stroke();
  }

  // four stash holes: up, right, down, left
  const spots = [[cx, cy - 90], [cx + 120, cy], [cx, cy + 90], [cx - 120, cy]];
  const lit = acornLit();
  spots.forEach(([x, y], i) => {
    ctx.fillStyle = "#23170c";
    ctx.beginPath(); ctx.ellipse(x, y, 38, 24, 0, 0, Math.PI * 2); ctx.fill();
    if (i === lit) {
      const glow = ctx.createRadialGradient(x, y - 10, 4, x, y - 10, 70);
      glow.addColorStop(0, "rgba(255,210,110,.95)");
      glow.addColorStop(1, "rgba(255,210,110,0)");
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(x, y - 10, 70, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = i === lit ? "#ffd27a" : "#8b5a2b";
    ctx.beginPath(); ctx.ellipse(x, y - 8, 15, 18, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = i === lit ? "#c99a4a" : "#5a3a1c";
    ctx.beginPath(); ctx.ellipse(x, y - 24, 17, 8, 0, 0, Math.PI * 2); ctx.fill();
  });

  ctx.restore();

  // a wrong press tints the screen red, a right one green
  if (AM.flash) {
    ctx.fillStyle = AM.flash.ok
      ? `rgba(120,220,140,${0.25 * AM.flash.t / 0.25})`
      : `rgba(230,90,80,${0.3 * AM.flash.t / 0.35})`;
    ctx.fillRect(0, 0, w, h);
  }

  // your-turn timer: a bar that drains while the squirrel waits for the next acorn
  if (AM.phase === "input") {
    const left = Math.max(0, 1 - AM.inT / AM_LIMIT);
    const bw = Math.min(w * 0.6, 320), bx = cx - bw / 2, by = cy + 135 * k + 14;
    ctx.fillStyle = "rgba(255,255,255,.15)"; ctx.fillRect(bx, by, bw, 10);
    ctx.fillStyle = left > 0.3 ? "#ffd27a" : "#e0604f";
    ctx.fillRect(bx, by, bw * left, 10);
  }

  // progress pips: one per acorn in this stash, filled as you repeat them
  const pipGap = 22, pipY = cy + 135 * k + 42, pipX0 = cx - (AM.seq.length - 1) * pipGap / 2;
  for (let i = 0; i < AM.seq.length; i++) {
    ctx.fillStyle = i < AM.idx ? "#ffd27a" : "rgba(255,255,255,.18)";
    ctx.beginPath(); ctx.arc(pipX0 + i * pipGap, pipY, 7, 0, Math.PI * 2); ctx.fill();
  }

  gameHeader(ctx, `Acorn Memory · level ${AM.level} of ${AM_LEVELS} · ${AM.cleared} cleared`, "Arrow keys, WASD or the d-pad to repeat · Esc to finish early");
  gameMessage(ctx, AM.msg, cx, hb + 30, w);
  ctx.textAlign = "left";
}

// The squirrel's stump in the village.
function drawAcornStump(ctx, x, y, t) {
  ctx.fillStyle = "rgba(0,0,0,.28)";
  ctx.beginPath(); ctx.ellipse(x + 4, y + 16, 24, 8, 0, 0, Math.PI * 2); ctx.fill();
  const wood = ctx.createLinearGradient(x - 22, y - 10, x + 22, y + 14);
  wood.addColorStop(0, "#9a7450"); wood.addColorStop(1, "#5a4028");
  ctx.fillStyle = wood;
  ctx.beginPath(); ctx.ellipse(x, y, 22, 14, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillRect(x - 22, y, 44, 14);
  ctx.beginPath(); ctx.ellipse(x, y + 14, 22, 14, 0, 0, Math.PI); ctx.fill();
  ctx.strokeStyle = "rgba(40,24,10,.5)"; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.ellipse(x, y, 12, 7, 0, 0, Math.PI * 2); ctx.stroke();
  const bob = Math.sin(t * 2 + x) * 1;
  ctx.fillStyle = "#8b5a2b";
  ctx.beginPath(); ctx.ellipse(x - 10, y - 12 + bob, 4, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x + 9, y - 13 - bob, 4, 5, 0, 0, Math.PI * 2); ctx.fill();
}

DATA.lore.push(
  { title: "The Squirrel's Memory", text: "A squirrel keeps its stash by remembering the order it was hidden in. The Willow, it seems, keeps its memories the same way.", unlock: () => (G.flags.acornBest || 0) >= 2 }
);
