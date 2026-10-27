// Fishing, from the dock on the north pond (built at the Builder's Board). Six casts a village day.
// Cast, wait for the bite, hook it, then hold Z to raise the line and keep the marker inside the
// gold zone until the catch bar fills. What bites depends on the season, the hour and the weather.
// Fish go into the kitchen: each dish is a blessing for the next expedition.

Object.assign(DATA.items, {
  minnow:     { name: "Silver Minnow",    icon: "≈", color: "#c9d6e0", desc: "Tiny and quick. Good on a skewer." },
  pondTrout:  { name: "Pond Trout",       icon: "≈", color: "#d9a07a", desc: "Plump and cheerful. Good in a chowder." },
  silverCarp: { name: "Silverscale Carp", icon: "≈", color: "#b8c8d8", desc: "Scales like beaten tin. Good in a pie." },
  glowEel:    { name: "Glow Eel",         icon: "≈", color: "#7fe0d0", desc: "Lights up from the inside, but only at night." },
  goldenKoi:  { name: "Golden Koi",       icon: "≈", color: "#ffc247", desc: "Said to carry a wish for anyone kind enough to cook it." },
  honey:      { name: "Wild Honey",       icon: "◈", color: "#ffc247", desc: "Thick and gold. Restores health.", consumable: true, heal: 30 },
  minnowSkewer: { name: "Minnow Skewer",  icon: "♨", color: "#e8c08a", desc: "Eat before an expedition: strikes deal 15% more damage.", consumable: true, blessing: "stoneHeart", blessingName: "Stone Heart" },
  troutChowder: { name: "Trout Chowder",  icon: "♨", color: "#e8d6a8", desc: "Eat before an expedition: you take 15% less damage.", consumable: true, blessing: "glowWard", blessingName: "Glowcap Ward" },
  carpPie:      { name: "Carp Pie",       icon: "♨", color: "#d8b88a", desc: "Eat before an expedition: dodges recover twice as fast.", consumable: true, blessing: "moonStep", blessingName: "Moonlit Step" },
  honeyCakes:   { name: "Honey Cakes",    icon: "♨", color: "#f2c870", desc: "Eat before an expedition: stamina recovers half again as fast.", consumable: true, blessing: "winterBreath", blessingName: "Winter's Breath" },
  eelStew:      { name: "Eel Stew",       icon: "♨", color: "#9fe8d8", desc: "Eat before an expedition: you can see foes through the gloom.", consumable: true, blessing: "keenEye", blessingName: "Keen Eye" },
  koiFeast:     { name: "Koi Feast",      icon: "♨", color: "#ffd878", desc: "Eat before an expedition: once, a killing blow leaves you at 1 health.", consumable: true, blessing: "lastBreath", blessingName: "Last Breath" },
});

DATA.recipes.push(
  { id: "minnowSkewer", out: "minnowSkewer", n: 1, needs: { minnow: 3, berry: 1 },       station: "kitchen", unlockedBy: null },
  { id: "troutChowder", out: "troutChowder", n: 1, needs: { pondTrout: 1, mushroom: 1, berry: 1 }, station: "kitchen", unlockedBy: null },
  { id: "carpPie",      out: "carpPie",      n: 1, needs: { silverCarp: 1, acorn: 2 },    station: "kitchen", unlockedBy: null },
  { id: "honeyCakes",   out: "honeyCakes",   n: 1, needs: { honey: 1, acorn: 2 },         station: "kitchen", unlockedBy: null },
  { id: "eelStew",      out: "eelStew",      n: 1, needs: { glowEel: 1, mushroom: 1 },    station: "kitchen", unlockedBy: null },
  { id: "koiFeast",     out: "koiFeast",     n: 1, needs: { goldenKoi: 1, honey: 1 },     station: "kitchen", unlockedBy: null },
);
PEDDLER_SELL.push({ item: "pondTrout", n: 2, wl: 6 }, { item: "minnow", n: 4, wl: 5 }, { item: "honey", n: 2, wl: 6 });

// weight is the base chance; diff is how hard the reel is (0 easy to 1 hard); zone is the gold band's height.
const FISH = [
  { id: "minnow",     w: 10,  diff: 0.15, zone: 0.34 },
  { id: "pondTrout",  w: 6,   diff: 0.4,  zone: 0.28 },
  { id: "silverCarp", w: 3.5, diff: 0.55, zone: 0.24 },
  { id: "glowEel",    w: 3,   diff: 0.7,  zone: 0.2 },
  { id: "goldenKoi",  w: 0.5, diff: 0.95, zone: 0.16 },
  { id: "lostPage",   w: 0.5, diff: 0.2,  zone: 0.3 },
];
const FISH_CASTS = 6;

const FS = { active: false, phase: "idle", t: 0, wait: 0, fish: null, prog: 0, cur: 0.5, vel: 0, seed: 0, msg: "", caught: [] };

function fishWeight(f) {
  const night = timeOfDay()[3] > 0.4, wx = G.weather;
  let w = f.w;
  if (f.id === "glowEel") w = night || wx === "moon" ? w * 2.5 : 0;
  if (f.id === "silverCarp" && (G.season === 0 || G.season === 1)) w *= 1.8;
  if (f.id === "pondTrout" && G.season === 2) w *= 1.5;
  if (f.id === "minnow" && G.season === 3) w *= 0.6;
  if (f.id === "goldenKoi" && (wx === "rain" || wx === "fog" || wx === "moon")) w *= 4;
  return w;
}

function castsLeft() { return FISH_CASTS - (G.flags.fishDay === G.day ? (G.flags.fishCasts || 0) : 0); }

function startFishing() {
  if (FS.active) return;
  if (castsLeft() <= 0) { toast("The fish have gone quiet for today. Come back tomorrow."); return; }
  FS.active = true; FS.phase = "idle"; FS.t = 0; FS.fish = null; FS.caught = [];
  FS.msg = "Press Z to cast.";
  document.getElementById("hud").style.visibility = "hidden";
  document.getElementById("prompt").classList.add("hidden");
}

function endFishing() {
  if (!FS.active) return;
  FS.active = false;
  document.getElementById("hud").style.visibility = "";
  if (FS.caught.length) toast(`Fishing: ${FS.caught.map(id => DATA.items[id].name).join(", ")}.`, 5000);
  saveGame();
}

function rollFish() {
  const pool = FISH.map(f => ({ f, w: fishWeight(f) }));
  let r = Math.random() * pool.reduce((a, b) => a + b.w, 0);
  for (const p of pool) { r -= p.w; if (r <= 0) return p.f; }
  return FISH[0];
}

function stepFishing(dt) {
  FS.t += dt;
  if (FS.phase === "idle") {
    if (wasPressed("act")) {
      if (castsLeft() <= 0) { endFishing(); return; }
      if (G.flags.fishDay !== G.day) { G.flags.fishDay = G.day; G.flags.fishCasts = 0; }
      G.flags.fishCasts++;
      FS.phase = "wait"; FS.t = 0;
      FS.wait = rand(1.2, 3.5) * (G.weather === "rain" ? 0.7 : 1);
      FS.msg = "Waiting...";
      SFX.play("dodge");
    }
  } else if (FS.phase === "wait") {
    if (wasPressed("act")) { FS.phase = "result"; FS.t = 0; FS.msg = "Too early. The line comes up empty."; return; }
    if (FS.t >= FS.wait) { FS.fish = rollFish(); FS.phase = "bite"; FS.t = 0; FS.msg = "A bite! Press Z!"; SFX.play("gather"); }
  } else if (FS.phase === "bite") {
    if (wasPressed("act")) {
      FS.phase = "reel"; FS.t = 0; FS.prog = 0.3; FS.cur = 0.5; FS.vel = 0; FS.seed = Math.random() * 10;
      FS.msg = "Hold Z to lift the line. Keep the marker in the gold.";
    } else if (FS.t > 0.8) { FS.phase = "result"; FS.t = 0; FS.msg = "It got away."; }
  } else if (FS.phase === "reel") {
    const f = FS.fish, held = isDown("act");
    FS.vel += (held ? -2.4 : 2.0) * dt;
    FS.vel = clamp(FS.vel, -1.1, 1.1) * Math.pow(0.35, dt);
    FS.cur = clamp(FS.cur + FS.vel * dt, 0, 1);
    if (FS.cur <= 0 || FS.cur >= 1) FS.vel = 0;
    const zc = fishZone();
    const inside = Math.abs(FS.cur - zc) < f.zone / 2;
    FS.prog += (inside ? 0.3 : -(0.12 + 0.12 * f.diff)) * dt;
    if (FS.prog >= 1) {
      FS.phase = "result"; FS.t = 0;
      const id = f.id;
      addItem(id, 1); FS.caught.push(id);
      G.flags.stat_fish = (G.flags.stat_fish || 0) + 1;
      G.flags["fish_" + id] = (G.flags["fish_" + id] || 0) + 1;
      FS.msg = id === "lostPage" ? "You reel in a torn, waterlogged page." : `Caught a ${DATA.items[id].name}!`;
      if (id === "goldenKoi") { addWillowlight(5); FS.msg += " It shimmers, and you feel a wish settle."; }
      SFX.play("portal");
    } else if (FS.prog <= 0) {
      FS.phase = "result"; FS.t = 0; FS.msg = "The line goes slack. It slipped the hook.";
      SFX.play("hurt");
    }
  } else if (FS.phase === "result") {
    if (FS.t > 1.6) {
      if (castsLeft() <= 0) { endFishing(); return; }
      FS.phase = "idle"; FS.t = 0; FS.msg = `Press Z to cast. ${castsLeft()} casts left today.`;
    }
  }
}

// Where the fish pulls the gold zone (0 top, 1 bottom): two overlapping waves, faster for tougher fish.
function fishZone() {
  const f = FS.fish, s = 0.8 + f.diff * 1.8, t = FS.t + FS.seed;
  return clamp(0.5 + 0.28 * Math.sin(t * s) + 0.14 * Math.sin(t * s * 2.3 + 1.7), f.zone / 2, 1 - f.zone / 2);
}

function drawFishing(ctx, t, w, h) {
  const night = timeOfDay()[3];
  drawGameBackdrop(ctx, w, h, t, night > 0.4 ? GAME_THEMES.pond : GAME_THEMES.forest);
  const wy = h * 0.52;
  for (let i = 0; i < 5; i++) { ctx.fillStyle = lerpHex("#0b8a8f", "#0b3a45", i / 4); ctx.fillRect(0, wy + (h - wy) * i / 5, w, (h - wy) / 5 + 1); }
  ctx.strokeStyle = "rgba(210,240,255,.2)"; ctx.lineWidth = 1.5;
  for (let i = 0; i < 12; i++) {
    const rx = ((i * 151 + t * 18) % (w + 60)) - 30, ry = wy + 14 + (i * 47) % (h - wy - 30);
    ctx.beginPath(); ctx.ellipse(rx, ry, 22, 3.5, 0, 0, Math.PI * 2); ctx.stroke();
  }

  // the rod, line and bobber
  const bx = w * 0.42, by = wy + 40;
  let bobY = by;
  if (FS.phase === "wait") bobY += Math.sin(t * 3) * 2;
  if (FS.phase === "bite") bobY += 8 + Math.sin(t * 40) * 3;
  if (FS.phase === "reel") bobY += Math.sin(t * 14) * 4;
  const rodX = w * 0.12, rodY = h * 0.34;
  ctx.strokeStyle = "#6a4a2a"; ctx.lineWidth = 5; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(w * 0.04, h * 0.64); ctx.lineTo(rodX, rodY); ctx.stroke();
  if (FS.phase !== "idle") {
    ctx.strokeStyle = "rgba(240,240,230,.75)"; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(rodX, rodY); ctx.quadraticCurveTo((rodX + bx) / 2, rodY + 20, bx, bobY); ctx.stroke();
    ctx.fillStyle = "#d8453a"; ctx.beginPath(); ctx.arc(bx, bobY, 6, Math.PI, 0); ctx.fill();
    ctx.fillStyle = "#f4f0e6"; ctx.beginPath(); ctx.arc(bx, bobY, 6, 0, Math.PI); ctx.fill();
    ctx.strokeStyle = "rgba(220,245,255,.45)"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(bx, wy + 40 + 8, 12 + (t * 14) % 14, 3, 0, 0, Math.PI * 2); ctx.stroke();
  }
  if (FS.phase === "bite") {
    ctx.fillStyle = "#ffe45a"; ctx.font = "bold 40px Georgia"; ctx.textAlign = "center";
    ctx.fillText("!", bx, bobY - 24);
  }

  // the reel meter
  if (FS.phase === "reel") {
    const f = FS.fish, mx = w * 0.78, my = h * 0.2, mh = h * 0.5, mw = 34;
    ctx.fillStyle = "rgba(10,20,26,.7)"; ctx.fillRect(mx, my, mw, mh);
    const zc = fishZone();
    ctx.fillStyle = "rgba(230,190,80,.85)"; ctx.fillRect(mx, my + (zc - f.zone / 2) * mh, mw, f.zone * mh);
    ctx.fillStyle = "#fff8e0"; ctx.fillRect(mx - 6, my + FS.cur * mh - 3, mw + 12, 6);
    ctx.strokeStyle = "rgba(255,246,220,.7)"; ctx.lineWidth = 1.5; ctx.strokeRect(mx, my, mw, mh);
    // the fish itself, flicking about beside the zone
    const fx = mx - 30, fy = my + zc * mh;
    drawFishSprite(ctx, fx, fy, DATA.items[f.id].color, t);
    // the catch bar
    const cx = mx + mw + 14;
    ctx.fillStyle = "rgba(10,20,26,.7)"; ctx.fillRect(cx, my, 10, mh);
    ctx.fillStyle = FS.prog > 0.66 ? "#7fd17a" : FS.prog > 0.33 ? "#e0c05a" : "#e0603a";
    ctx.fillRect(cx, my + mh * (1 - FS.prog), 10, mh * FS.prog);
  }

  const left = castsLeft();
  gameHeader(ctx, `Fishing · ${left} ${left === 1 ? "cast" : "casts"} left today`, "Z or Space to cast and hook, hold Z to reel · Esc to finish early");
  gameMessage(ctx, FS.msg, w / 2, Math.max(h * 0.3, GAME_HEADER_BOTTOM + 30), w);
  ctx.textAlign = "left";
}

DEEDS.push(
  { id: "angler",       title: "Angler",          text: "Catch ten fish.",                                  reward: 8,  prog: () => [Math.min(10, deedStat("stat_fish")), 10] },
  { id: "masterAngler", title: "Master Angler",   text: "Catch every kind of fish in the pond.",            reward: 20, prog: () => { const ids = ["minnow", "pondTrout", "silverCarp", "glowEel", "goldenKoi"]; return [ids.filter(i => deedStat("fish_" + i) > 0).length, ids.length]; } },
);
