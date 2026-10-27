// Firefly Catch: a short village minigame at the pond.
// Move the jar left and right to catch fireflies. Storm drops cost points.
const MG = { active: false, t: 0, score: 0, x: 0.5, items: [], spawnT: 0, flash: 0 };
const MG_TIME = 30;

function startFireflyCatch() {
  if (MG.active || SK.active || AM.active || WM.active || RT.active || CV.active) return;
  if (G.flags.fireflyDay === G.day) {
    toast("The fireflies have settled for the night. Come back tomorrow.");
    return;
  }
  G.flags.fireflyDay = G.day; // one attempt per village day
  MG.active = true;
  document.getElementById("hud").style.visibility = "hidden"; // the game draws its own text
  document.getElementById("prompt").classList.add("hidden");
  MG.t = MG_TIME; MG.score = 0; MG.x = 0.5; MG.items = []; MG.spawnT = 0.6; MG.flash = 0;
}

function endFireflyCatch() {
  if (!MG.active) return;
  MG.active = false;
  document.getElementById("hud").style.visibility = "";
  const reward = Math.min(10, Math.floor(MG.score / 3));
  if (reward > 0) addWillowlight(reward);
  const best = G.flags.fireflyBest || 0;
  if (MG.score > best) G.flags.fireflyBest = MG.score;
  toast(`Firefly Catch: ${MG.score} caught. ${reward ? "+" + reward + " Willowlight." : "Better luck tomorrow."}${MG.score > best ? " New best!" : ""}`, 5000);
  saveGame();
}

function stepFireflyCatch(dt) {
  MG.t -= dt;
  if (MG.t <= 0) { MG.t = 0; endFireflyCatch(); return; }
  const move = (isDown("right") ? 1 : 0) - (isDown("left") ? 1 : 0);
  MG.x = clamp(MG.x + move * dt * 0.9, 0.06, 0.94);
  // drops get a little faster and more frequent as the timer runs down
  const pace = 1 + (MG_TIME - MG.t) / MG_TIME;
  MG.spawnT -= dt;
  if (MG.spawnT <= 0) {
    MG.spawnT = (0.55 + Math.random() * 0.35) / pace;
    MG.items.push({ x: 0.06 + Math.random() * 0.88, y: 0, bad: Math.random() < 0.25, v: (0.16 + Math.random() * 0.1) * pace });
  }
  for (const it of MG.items) {
    it.y += it.v * dt;
    it.trail = it.trail || [];
    it.trail.push({ x: it.x, y: it.y });
    if (it.trail.length > 12) it.trail.shift();
    if (!it.hit && it.y >= 0.9 && Math.abs(it.x - MG.x) < 0.09) {
      it.hit = true;
      if (it.bad) { MG.score = Math.max(0, MG.score - 3); MG.flash = 0.3; }
      else MG.score += 1;
    }
  }
  MG.items = MG.items.filter(it => it.y < 1 && !it.hit);
  if (MG.flash > 0) MG.flash -= dt;
}

function drawFireflyCatch(ctx, t, w, h) {
  drawGameBackdrop(ctx, w, h, t, GAME_THEMES.pond);
  // the jar sits at the bottom of the play area
  const jx = MG.x * w, jy = h * 0.9;
  for (const it of MG.items) {
    const x = it.x * w, y = it.y * h;
    // a fading trail behind the item, so its path reads as a glow streak
    const trail = it.trail || [];
    for (let i = 0; i < trail.length - 1; i++) {
      const a = trail[i], b = trail[i + 1];
      const f = (i + 1) / trail.length;   // 0 at the tail, 1 at the head
      ctx.strokeStyle = it.bad ? `rgba(120,160,220,${0.35 * f})` : `rgba(255,236,140,${0.5 * f})`;
      ctx.lineWidth = (it.bad ? 1.5 : 2.5) * (0.4 + 0.6 * f);
      ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(a.x * w, a.y * h); ctx.lineTo(b.x * w, b.y * h); ctx.stroke();
    }
    ctx.lineCap = "butt";
    if (it.bad) {
      ctx.fillStyle = "rgba(120,150,190,.9)";
      ctx.beginPath(); ctx.moveTo(x, y - 12); ctx.quadraticCurveTo(x + 8, y + 2, x, y + 8); ctx.quadraticCurveTo(x - 8, y + 2, x, y - 12); ctx.fill();
    } else {
      const g = ctx.createRadialGradient(x, y, 1, x, y, 14);
      g.addColorStop(0, "rgba(255,246,150,.9)"); g.addColorStop(1, "rgba(255,246,150,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 14, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fff8c8"; ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.strokeStyle = "rgba(200,240,220,.8)"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(jx - 34, jy - 26); ctx.lineTo(jx - 34, jy + 8); ctx.quadraticCurveTo(jx - 34, jy + 22, jx, jy + 22); ctx.quadraticCurveTo(jx + 34, jy + 22, jx + 34, jy + 8); ctx.lineTo(jx + 34, jy - 26); ctx.stroke();
  if (MG.flash > 0) {
    ctx.fillStyle = `rgba(120,30,40,${0.35 * MG.flash / 0.3})`;
    ctx.fillRect(0, 0, w, h);
  }
  gameHeader(ctx, `Firefly Catch · ${Math.ceil(MG.t)}s · ${MG.score} caught`, "Left/Right to move · Esc or Z to finish early");
  ctx.textAlign = "left";
}

