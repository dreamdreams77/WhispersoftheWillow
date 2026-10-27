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

