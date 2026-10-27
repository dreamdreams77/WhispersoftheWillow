// Whack-a-Mole: a village minigame at the mole hills.
// Moles pop up from a 3 by 3 grid of holes. Move the cursor with the arrow keys, WASD or the d-pad,
// and press Z, Space or Act to whack the hole under it. Dormice score a point. Thornlings cost two.
// Whacking an empty hole costs one. Forty seconds, and the moles get quicker as the round goes on.
// One round per village day.
const WM = { active: false, t: 0, score: 0, hits: 0, cur: 4, holes: [], spawnT: 0, flash: null, msg: "" };
const WM_TIME = 40;
const WM_MAX_UP = 3;

function startWhackAMole() {
  if (WM.active || MG.active || SK.active || AM.active || RT.active || CV.active) return;
  if (G.flags.whackDay === G.day) {
    toast("The moles have tidied their hills for today. Come back tomorrow.");
    return;
  }
  G.flags.whackDay = G.day;
  WM.active = true;
  WM.t = WM_TIME; WM.score = 0; WM.hits = 0; WM.cur = 4; WM.flash = null;
  WM.spawnT = 0.6;
  WM.msg = "Whack the dormice. Leave the thornlings alone.";
  WM.holes = Array.from({ length: 9 }, () => ({ phase: "hidden", pop: 0, hold: 0, kind: "dormouse", stars: 0 }));
  document.getElementById("hud").style.visibility = "hidden";
  document.getElementById("prompt").classList.add("hidden");
}

function endWhackAMole() {
  if (!WM.active) return;
  WM.active = false;
  document.getElementById("hud").style.visibility = "";
  const reward = Math.min(10, Math.floor(WM.score / 3));
  if (reward > 0) addWillowlight(reward);
  const best = G.flags.whackBest || 0;
  if (WM.score > best) G.flags.whackBest = WM.score;
  toast(`Whack-a-Mole: ${WM.score} points, ${WM.hits} dormice. ${reward ? "+" + reward + " Willowlight." : "The moles yawn."}${WM.score > best ? " New best!" : ""}`, 5000);
  saveGame();
}

function spawnMole(elapsed) {
  const up = WM.holes.filter(h => h.phase !== "hidden").length;
  const free = WM.holes.map((h, i) => i).filter(i => WM.holes[i].phase === "hidden");
  if (!free.length || up >= WM_MAX_UP) return;
  const h = WM.holes[free[Math.floor(Math.random() * free.length)]];
  h.kind = Math.random() < 0.25 ? "thorn" : "dormouse";
  h.phase = "rise"; h.pop = 0;
  h.hold = Math.max(0.6, 1.5 - elapsed * 0.02);   // they stay up for less time as the round goes on
}

function whackHole(i) {
  const h = WM.holes[i];
  if (h.phase === "hidden" || h.pop < 0.4 || h.phase === "fall") {
    WM.score = Math.max(0, WM.score - 1);
    WM.flash = { ok: false, t: 0.2 };
    WM.msg = "Nothing there.";
    return;
  }
  if (h.kind === "thorn") {
    WM.score = Math.max(0, WM.score - 2);
    WM.flash = { ok: false, t: 0.35 };
    WM.msg = "Ouch! Thornlings bite back.";
  } else {
    WM.score += 1; WM.hits++;
    WM.flash = { ok: true, t: 0.2 };
    WM.msg = ["Got one!", "Squeak!", "Bonk!", "Right on the nose!"][WM.hits % 4];
    h.stars = 0.4;
  }
  h.phase = "fall";
}

function stepWhackAMole(dt) {
  WM.t -= dt;
  if (WM.t <= 0) { WM.t = 0; endWhackAMole(); return; }
  if (WM.flash) { WM.flash.t -= dt; if (WM.flash.t <= 0) WM.flash = null; }

  const elapsed = WM_TIME - WM.t;
  const col = WM.cur % 3, row = Math.floor(WM.cur / 3);
  if (wasPressed("left") && col > 0) WM.cur--;
  if (wasPressed("right") && col < 2) WM.cur++;
  if (wasPressed("up") && row > 0) WM.cur -= 3;
  if (wasPressed("down") && row < 2) WM.cur += 3;
  if (wasPressed("act")) whackHole(WM.cur);

  // the pace quickens: more moles, more often, as the round runs down
  WM.spawnT -= dt;
  if (WM.spawnT <= 0) {
    const pace = 1 + elapsed / WM_TIME;
    WM.spawnT = (0.9 + Math.random() * 0.4) / pace;
    spawnMole(elapsed);
  }

  for (const h of WM.holes) {
    if (h.stars > 0) h.stars -= dt;
    if (h.phase === "rise") {
      h.pop += dt * 5;
      if (h.pop >= 1) { h.pop = 1; h.phase = "hold"; }
    } else if (h.phase === "hold") {
      h.hold -= dt;
      if (h.hold <= 0) h.phase = "fall";
    } else if (h.phase === "fall") {
      h.pop -= dt * 6;
      if (h.pop <= 0) { h.pop = 0; h.phase = "hidden"; }
    }
  }
}

// Each hole's centre on screen for a canvas of size w by h.
function whackHoleXY(i, w, h) {
  const cell = Math.min(w, h) * 0.2;
  const cx = w / 2, cy = h * 0.5;
  const col = i % 3, row = Math.floor(i / 3);
  return { x: cx + (col - 1) * cell * 1.35, y: cy + (row - 1) * cell * 1.05, cell };
}

function drawWhackAMole(ctx, t, w, h) {
  drawGameBackdrop(ctx, w, h, t, GAME_THEMES.grass);

  WM.holes.forEach((hole, i) => {
    const { x, y, cell } = whackHoleXY(i, w, h);
    // the mound and the dark hole
    ctx.fillStyle = "#5a4330";
    ctx.beginPath(); ctx.ellipse(x, y + 4, cell * 0.5, cell * 0.26, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#1a1008";
    ctx.beginPath(); ctx.ellipse(x, y, cell * 0.4, cell * 0.2, 0, 0, Math.PI * 2); ctx.fill();

    if (hole.pop > 0) {
      // only the part above the ground is visible, so the creature seems to rise out of the hole
      ctx.save();
      ctx.beginPath(); ctx.rect(x - cell * 0.6, y - cell * 1.2, cell * 1.2, cell * 1.2 + 2); ctx.clip();
      if (hole.kind === "thorn") {
        const ty = y - hole.pop * cell * 0.3;
        ctx.strokeStyle = "#2e5a2a"; ctx.lineWidth = 3;
        for (let k = 0; k < 8; k++) {
          const a = (k / 8) * Math.PI * 2 + t;
          ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * cell * 0.25, ty + Math.sin(a) * cell * 0.25);
          ctx.lineTo(x + Math.cos(a) * cell * 0.42, ty + Math.sin(a) * cell * 0.42); ctx.stroke();
        }
        ctx.fillStyle = "#3b6a34";
        ctx.beginPath(); ctx.arc(x, ty, cell * 0.26, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#ff6a5a";
        ctx.beginPath(); ctx.arc(x - 5, ty - 2, 2.4, 0, Math.PI * 2); ctx.arc(x + 5, ty - 2, 2.4, 0, Math.PI * 2); ctx.fill();
      } else {
        const s = cell / 70;
        ctx.translate(x, y + 8 - (1 - hole.pop) * cell * 0.55);
        ctx.scale(s * 1.1, s * 1.1);
        drawAnimalLocal(ctx, "mouse", "#c9b8a6", 1, 0, 0, {});
      }
      ctx.restore();
    }

    if (hole.stars > 0) {
      const r = (0.4 - hole.stars) * cell * 1.2 + 6;
      ctx.strokeStyle = `rgba(255,240,170,${Math.max(0, hole.stars / 0.4)})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y - cell * 0.3, r, 0, Math.PI * 2); ctx.stroke();
    }
  });

  // the cursor
  const c = whackHoleXY(WM.cur, w, h);
  ctx.strokeStyle = "rgba(255,216,120,.95)"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.ellipse(c.x, c.y + 2, c.cell * 0.56, c.cell * 0.3, 0, 0, Math.PI * 2); ctx.stroke();

  if (WM.flash) {
    ctx.fillStyle = WM.flash.ok
      ? `rgba(120,220,140,${0.22 * WM.flash.t / 0.2})`
      : `rgba(230,90,80,${0.28 * WM.flash.t / 0.35})`;
    ctx.fillRect(0, 0, w, h);
  }

  gameHeader(ctx, `Whack-a-Mole · ${Math.ceil(WM.t)}s · ${WM.score} points`, "Arrow keys, WASD or the d-pad to move · Z, Space or Act to whack · Esc to finish early");
  gameMessage(ctx, WM.msg, w / 2, h * 0.9, w);
  ctx.textAlign = "left";
}

