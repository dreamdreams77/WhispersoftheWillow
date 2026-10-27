// Ring Toss: a village minigame on the green beside the Frostfallen path.
// Five rings per village day. The aim swings along the board; nudge it with Left and Right if you
// like, then toss with Z, Space or Act. A ring that lands over a peg scores that peg's value,
// and the centre peg is worth five.
const RT = { active: false, throws: 0, total: 0, aim: 0.5, dir: 1, flight: null, rings: [], msg: "", doneT: null };
const RT_THROWS = 5;
const RT_PEGS = [{ x: 0.14, v: 1 }, { x: 0.3, v: 3 }, { x: 0.5, v: 5 }, { x: 0.7, v: 3 }, { x: 0.86, v: 1 }];
const RT_PEG_ROW = 0.42;   // height of the peg row, as a fraction of the screen
const RT_TOSS_ROW = 0.84;  // where the player stands

function startRingToss() {
  if (RT.active || MG.active || SK.active || AM.active || WM.active || CV.active) return;
  if (G.flags.ringDay === G.day) {
    toast("The pegs are all in their places for today. Come back tomorrow.");
    return;
  }
  G.flags.ringDay = G.day;
  RT.active = true; RT.throws = 0; RT.total = 0; RT.aim = 0.5; RT.dir = 1;
  RT.flight = null; RT.rings = []; RT.doneT = null;
  RT.msg = "Line up the aim, then toss with Z, Space or Act.";
  document.getElementById("hud").style.visibility = "hidden";
  document.getElementById("prompt").classList.add("hidden");
}

function endRingToss() {
  if (!RT.active) return;
  RT.active = false; RT.flight = null; RT.doneT = null;
  document.getElementById("hud").style.visibility = "";
  const reward = Math.min(8, Math.floor(RT.total / 4));
  if (reward > 0) addWillowlight(reward);
  const best = G.flags.ringBest || 0;
  if (RT.total > best) G.flags.ringBest = RT.total;
  toast(`Ring Toss: ${RT.total} points from ${RT.throws} rings. ${reward ? "+" + reward + " Willowlight." : "The pegs stand firm."}${RT.total > best ? " New best!" : ""}`, 5000);
  saveGame();
}

// The aim's wobble grows with the swing speed, so a fast aim is harder to keep steady.
function tossRing() {
  const speed = 0.5 + RT.throws * 0.06;
  const wobble = (Math.random() - 0.5) * (0.05 + speed * 0.06);
  const landX = clamp(RT.aim + wobble, 0.02, 0.98);
  RT.flight = { fromX: RT.aim, toX: landX, t: 0, dur: 0.85 };
  RT.throws++;
  RT.msg = "";
}

function landRing(x) {
  let best = -1, bestD = 1;
  RT_PEGS.forEach((p, i) => {
    const d = Math.abs(p.x - x);
    if (d < bestD) { bestD = d; best = i; }
  });
  const hit = bestD < 0.055 ? best : -1;
  if (hit >= 0) {
    const v = RT_PEGS[hit].v;
    RT.total += v;
    RT.msg = v >= 5 ? "Ringer! The centre peg, five points." : `Over the peg, ${v} points.`;
  } else {
    RT.msg = "The ring rolls off the grass.";
  }
  RT.rings.push({ x: hit >= 0 ? RT_PEGS[hit].x : x, peg: hit });
  RT.flight = null;
}

function speedAim(dt) {
  return 0.5 + RT.throws * 0.06;
}

function stepRingToss(dt) {
  if (RT.doneT != null) {
    RT.doneT -= dt;
    if (RT.doneT <= 0) endRingToss();
    return;
  }
  if (RT.flight) {
    RT.flight.t += dt;
    if (RT.flight.t >= RT.flight.dur) {
      landRing(RT.flight.toX);
      if (RT.throws >= RT_THROWS) RT.doneT = 1.4;
    }
    return;
  }
  // the aim swings back and forth; the arrow keys nudge it
  RT.aim += RT.dir * speedAim(dt) * dt;
  if (RT.aim >= 0.96) { RT.aim = 0.96; RT.dir = -1; }
  else if (RT.aim <= 0.04) { RT.aim = 0.04; RT.dir = 1; }
  if (wasPressed("left")) RT.aim = clamp(RT.aim - 0.03, 0.04, 0.96);
  if (wasPressed("right")) RT.aim = clamp(RT.aim + 0.03, 0.04, 0.96);
  if (wasPressed("act")) tossRing();
}

function drawRingToss(ctx, t, w, h) {
  drawGameBackdrop(ctx, w, h, t, GAME_THEMES.ring);

  // the lawn, lit from above, where the pegs stand
  const rowY = h * RT_PEG_ROW;
  const lawn = ctx.createRadialGradient(w / 2, rowY + 40, 20, w / 2, rowY + 40, w * 0.5);
  lawn.addColorStop(0, "rgba(120,170,90,.55)"); lawn.addColorStop(1, "rgba(60,100,50,.2)");
  ctx.fillStyle = lawn;
  ctx.beginPath(); ctx.ellipse(w / 2, h * 0.6, w * 0.46, h * 0.36, 0, 0, Math.PI * 2); ctx.fill();

  // the pegs: wooden stakes with a value painted under each
  for (const p of RT_PEGS) {
    const px = p.x * w;
    ctx.fillStyle = "rgba(0,0,0,.3)";
    ctx.beginPath(); ctx.ellipse(px + 4, rowY + 6, 14, 5, 0, 0, Math.PI * 2); ctx.fill();
    const wood = ctx.createLinearGradient(px - 4, 0, px + 4, 0);
    wood.addColorStop(0, "#5e4228"); wood.addColorStop(0.5, "#a77d4f"); wood.addColorStop(1, "#5e4228");
    ctx.fillStyle = wood; ctx.fillRect(px - 4, rowY - 30, 8, 36);
    ctx.fillStyle = "#d9b77c";
    ctx.beginPath(); ctx.ellipse(px, rowY - 30, 5, 2.4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = p.v >= 5 ? "#ffd27a" : "#fff6dc";
    ctx.font = "bold 13px Georgia"; ctx.textAlign = "center";
    ctx.fillText(String(p.v), px, rowY + 24);
  }

  // rings already tossed, lying around the pegs they landed on
  for (const r of RT.rings) {
    const rx = r.x * w;
    ctx.strokeStyle = r.peg >= 0 ? "#ffd27a" : "rgba(200,110,90,.85)";
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.ellipse(rx, rowY - 4, 13, 5, 0, 0, Math.PI * 2); ctx.stroke();
  }

  // the toss line, and the aim marker on the board
  const aimY = h * RT_TOSS_ROW;
  ctx.fillStyle = "rgba(255,246,220,.5)";
  ctx.fillRect(w * 0.1, aimY, w * 0.8, 2);
  const aimX = RT.aim * w;
  if (!RT.flight && RT.doneT == null) {
    ctx.setLineDash([4, 5]);
    ctx.strokeStyle = "rgba(255,240,190,.35)"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(aimX, h * 0.7 + 10); ctx.lineTo(aimX, aimY - 4); ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = "rgba(255,240,190,.95)"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(aimX, h * 0.7, 16, 6, 0, 0, Math.PI * 2); ctx.stroke();
  }

  // a ring in the air: it arcs up from the toss line and drops onto the board
  if (RT.flight) {
    const f = RT.flight, u = Math.min(1, f.t / f.dur);
    const x = (f.fromX + (f.toX - f.fromX) * u) * w;
    const y = aimY + (rowY - aimY) * u - Math.sin(u * Math.PI) * h * 0.22;
    // the shadow stays on the ground while the ring rises
    ctx.fillStyle = "rgba(0,0,0,.25)";
    ctx.beginPath(); ctx.ellipse(x, aimY + (rowY - aimY) * u - 4, 12, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#ffd27a"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.ellipse(x, y, 13, 9 * (1 - 0.3 * Math.sin(u * Math.PI)), 0, 0, Math.PI * 2); ctx.stroke();
  }

  gameHeader(ctx,
    `Ring Toss · ring ${Math.min(RT.throws + (RT.flight ? 0 : 1), RT_THROWS)} of ${RT_THROWS} · ${RT.total} points`,
    "Left and Right to nudge the aim · Z, Space or Act to toss · Esc to finish early");
  gameMessage(ctx, RT.msg, w / 2, h * 0.93, w);
  ctx.textAlign = "left";
}

