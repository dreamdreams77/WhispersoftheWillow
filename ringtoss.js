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

