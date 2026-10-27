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

DATA.lore.push(
  { title: "The Squirrel's Memory", text: "A squirrel keeps its stash by remembering the order it was hidden in. The Willow, it seems, keeps its memories the same way.", unlock: () => (G.flags.acornBest || 0) >= 2 }
);
