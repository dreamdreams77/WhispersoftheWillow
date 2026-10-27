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

