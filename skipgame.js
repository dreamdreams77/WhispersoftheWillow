// Stone Skip: a village minigame at the creek.
// A marker slides back and forth along a bar. Press Z or Space to throw while it is near the
// gold middle: the closer to centre, the more times the stone skips. Five throws per village day.
const SK = { active: false, throws: 0, total: 0, pos: 0, dir: 1, speed: 1, anim: null, msg: "" };
const SK_THROWS = 5;
const SK_MAX_SKIPS = 5;

function startStoneSkip() {
  if (SK.active || MG.active || AM.active || WM.active || RT.active || CV.active) return;
  if (G.flags.skipDay === G.day) {
    toast("The creek is still, and every stone has been skipped for today. Come back tomorrow.");
    return;
  }
  G.flags.skipDay = G.day; // one round per village day
  SK.active = true;
  SK.throws = 0; SK.total = 0; SK.pos = 0; SK.dir = 1;
  SK.speed = 0.8 + Math.random() * 0.7;
  SK.anim = null; SK.msg = "Press Z or Space in the gold zone to throw.";
  document.getElementById("hud").style.visibility = "hidden";
  document.getElementById("prompt").classList.add("hidden");
}

function endStoneSkip() {
  if (!SK.active) return;
  SK.active = false;
  SK.anim = null;
  document.getElementById("hud").style.visibility = "";
  const reward = Math.min(8, Math.floor(SK.total / 4));
  if (reward > 0) addWillowlight(reward);
  const best = G.flags.skipBest || 0;
  if (SK.total > best) G.flags.skipBest = SK.total;
  toast(`Stone Skip: ${SK.total} skips in ${SK.throws} throws. ${reward ? "+" + reward + " Willowlight." : "The creek keeps its stones."}${SK.total > best ? " New best!" : ""}`, 5000);
  saveGame();
}

function throwStone() {
  const skips = Math.max(0, SK_MAX_SKIPS - Math.round(Math.abs(SK.pos - 0.5) * 14));
  SK.throws++;
  SK.total += skips;
  SK.anim = { skips, t: 0, dur: 0.5 + skips * 0.25 };
  SK.msg = skips === 0 ? "Splash." : skips >= 4 ? `Beautiful, ${skips} skips!` : `${skips} ${skips === 1 ? "skip" : "skips"}.`;
  SK.speed = 0.8 + Math.random() * 0.7;
}

function stepStoneSkip(dt) {
  if (SK.anim) {
    SK.anim.t += dt;
    if (SK.anim.t >= SK.anim.dur) {
      SK.anim = null;
      if (SK.throws >= SK_THROWS) endStoneSkip();
    }
    return;
  }
  SK.pos += SK.dir * SK.speed * dt;
  if (SK.pos >= 1) { SK.pos = 1; SK.dir = -1; }
  else if (SK.pos <= 0) { SK.pos = 0; SK.dir = 1; }
  if (wasPressed("act")) throwStone();
}

function drawStoneSkip(ctx, t, w, h) {
  // dusk water across the middle of the screen
  drawGameBackdrop(ctx, w, h, t, GAME_THEMES.dusk);
  const wy = h * 0.5;
  const water = ctx.createLinearGradient(0, wy - h * 0.16, 0, wy + h * 0.16);
  water.addColorStop(0, "rgba(60,120,150,.25)");
  water.addColorStop(0.5, "rgba(40,100,130,.55)");
  water.addColorStop(1, "rgba(20,60,80,.7)");
  ctx.fillStyle = water;
  ctx.fillRect(0, wy - h * 0.16, w, h * 0.32);
  for (let i = 0; i < 9; i++) {
    const rx = ((i * 137 + t * 30) % (w + 80)) - 40, ry = wy - h * 0.12 + (i * 53) % (h * 0.24);
    ctx.strokeStyle = "rgba(200,240,255,.18)"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(rx, ry, 18, 3, 0, 0, Math.PI * 2); ctx.stroke();
  }

  // the stone's flight, if one is skimming now
  if (SK.anim) {
    const a = SK.anim, p = Math.min(1, a.t / a.dur);
    const x0 = w * 0.12, hop = w * 0.07;
    const done = p * a.skips;
    const hi = Math.floor(done);
    const sx = x0 + done * hop;
    const sy = wy - Math.abs(Math.sin(done * Math.PI)) * 18;
    // a ripple spreads from each landing point and fades after a moment
    for (let i = 0; i < hi; i++) {
      const age = done - (i + 1);
      if (age < 0 || age > 1.5) continue;
      const rr = 4 + age * 18;
      ctx.strokeStyle = `rgba(220,245,255,${0.5 * (1 - age / 1.5)})`; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(x0 + (i + 1) * hop, wy, rr, rr * 0.25, 0, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.fillStyle = "#c9c4b8";
    ctx.beginPath(); ctx.ellipse(sx, sy, 7, 4.5, done * 0.5, 0, Math.PI * 2); ctx.fill();
  }

  // the timing bar
  const bx = w * 0.15, bw = w * 0.7, by = h * 0.82, bh = 18;
  ctx.fillStyle = "rgba(255,255,255,.12)";
  ctx.fillRect(bx, by, bw, bh);
  ctx.fillStyle = "rgba(230,190,80,.85)";
  ctx.fillRect(bx + bw * 0.44, by, bw * 0.12, bh);
  ctx.strokeStyle = "rgba(255,246,220,.7)"; ctx.lineWidth = 1.5;
  ctx.strokeRect(bx, by, bw, bh);
  ctx.fillStyle = "#fff8e0";
  ctx.beginPath(); ctx.fillRect(bx + bw * SK.pos - 2, by - 6, 4, bh + 12);

  // text
  gameHeader(ctx, `Stone Skip · throw ${Math.min(SK.throws + (SK.anim ? 0 : 1), SK_THROWS)} of ${SK_THROWS} · ${SK.total} skips`, "Z or Space to throw · Esc to finish early");
  gameMessage(ctx, SK.msg, w / 2, Math.max(h * 0.3, GAME_HEADER_BOTTOM + 30), w);
  ctx.textAlign = "left";
}

// The creek in the village: a long, slow ribbon of water with glints.
function drawCreek(ctx, x, y, t) {
  const water = ctx.createLinearGradient(x - 110, y, x + 110, y);
  water.addColorStop(0, "rgba(60,120,150,.8)");
  water.addColorStop(0.5, "rgba(90,170,190,.9)");
  water.addColorStop(1, "rgba(40,90,110,.8)");
  ctx.fillStyle = water;
  ctx.beginPath(); ctx.ellipse(x, y, 110, 26, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "rgba(200,240,255,.35)"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(x, y, 110, 26, 0, 0, Math.PI * 2); ctx.stroke();
  for (let i = 0; i < 5; i++) {
    const px = x + Math.cos(t * 0.5 + i * 1.3) * 80, py = y + Math.sin(t * 0.7 + i * 1.3) * 12;
    ctx.fillStyle = `rgba(230,250,255,${0.3 + 0.25 * Math.sin(t * 3 + i)})`;
    ctx.beginPath(); ctx.ellipse(px, py, 6, 1.6, 0, 0, Math.PI * 2); ctx.fill();
  }
  // a glint drifting along the creek
  const gx = x + Math.sin(t * 0.35) * 70, gy = y + Math.cos(t * 0.35) * 8;
  ctx.fillStyle = "rgba(230,250,255,.22)";
  ctx.beginPath(); ctx.ellipse(gx, gy, 16, 2.5, 0, 0, Math.PI * 2); ctx.fill();
  // a few flat stones on the bank
  ctx.fillStyle = "rgba(90,80,70,.9)";
  for (const [sx, sy] of [[x - 112, y + 16], [x - 102, y + 22], [x + 116, y - 12]]) {
    ctx.beginPath(); ctx.ellipse(sx, sy, 6, 4, 0.2, 0, Math.PI * 2); ctx.fill();
  }
}
