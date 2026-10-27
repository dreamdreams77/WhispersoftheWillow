// Entry point: loop, input, scene drawing.
const canvas = document.getElementById("view");
const ctx = canvas.getContext("2d", { willReadFrequently: true });
initPixel(ctx, canvas);
const CAM = { x: 0, y: 0, vw: 0, vh: 0, scale: 1 };

// On phones the map gets its own area above a solid control band, so the
// touch controls and dialogues never sit on top of the play field.
const PHONE_MAX_W = 600;
const BAND_PHONE = 210;
function controlBand() { return window.innerWidth < PHONE_MAX_W ? BAND_PHONE : 0; }

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const band = controlBand();
  const h = window.innerHeight - band;
  document.documentElement.style.setProperty("--band", band + "px");
  sizePixelView(window.innerWidth, h, dpr);
  CAM.vw = window.innerWidth;
  CAM.vh = h;
}
window.addEventListener("resize", resize);
resize();

// ---------- Input ----------
const KEYMAP = {
  ArrowUp: "up", KeyW: "up", ArrowDown: "down", KeyS: "down",
  ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right",
  KeyZ: "act", Space: "act", Enter: "act", KeyE: "act",
  KeyX: "atk", KeyJ: "atk",
  KeyC: "dodge", ShiftLeft: "dodge", ShiftRight: "dodge",
  KeyM: "menu", Tab: "menu",
  KeyQ: "bomb",
  Escape: "close",
  KeyN: "mute",
};

function setKey(k, down) {
  if (k === "close") { if (down) closeMenu(); return; }
  if (down && !INPUT[k]) pressed[k] = true;
  INPUT[k] = down;
}

// Hidden: the classic sequence. Only counts once a game is underway.
const KONAMI = ["ArrowUp","ArrowUp","ArrowDown","ArrowDown","ArrowLeft","ArrowRight","ArrowLeft","ArrowRight","KeyB","KeyA"];
const konamiBuf = [];
window.addEventListener("keydown", e => {
  if (MG.active && (e.code === "Escape" || e.code === "KeyZ")) { e.preventDefault(); if (!e.repeat) endFireflyCatch(); return; }
  if (FS.active && e.code === "Escape") { e.preventDefault(); if (!e.repeat) endFishing(); return; }
  if (SK.active && e.code === "Escape") { e.preventDefault(); if (!e.repeat) endStoneSkip(); return; }
  if (AM.active && e.code === "Escape") { e.preventDefault(); if (!e.repeat) endAcornMemory(); return; }
  if (WM.active && e.code === "Escape") { e.preventDefault(); if (!e.repeat) endWhackAMole(); return; }
  if (RT.active && e.code === "Escape") { e.preventDefault(); if (!e.repeat) endRingToss(); return; }
  if (CV.active && e.code === "Escape") { e.preventDefault(); if (!e.repeat) endCarnivalGame(); return; }
  // Dialogues must work from the keyboard too: Continue or pick a numbered / arrow-selected choice.
  if (G.dialogue) {
    const btns = [...document.querySelectorAll("#dlgChoices button")];
    const contVisible = !document.getElementById("dlgClose").classList.contains("hidden");
    const confirm = ["KeyZ","Enter","Space"].includes(e.code);
    if (e.repeat && (confirm || e.code === "Escape")) { e.preventDefault(); return; }
    if (contVisible && (confirm || e.code === "Escape")) { e.preventDefault(); closeDialogue(); return; }
    if (btns.length) {
      if (["ArrowUp","KeyW"].includes(e.code)) { e.preventDefault(); highlightChoice(UI.dlgSel - 1); return; }
      if (["ArrowDown","KeyS"].includes(e.code)) { e.preventDefault(); highlightChoice(UI.dlgSel + 1); return; }
      if (confirm) { e.preventDefault(); btns[UI.dlgSel].click(); return; }
      const d = /^(?:Digit|Numpad)([1-9])$/.exec(e.code);
      if (d && +d[1] <= btns.length) { e.preventDefault(); btns[+d[1] - 1].click(); return; }
    }
    return; // other keys wait for the dialogue to close
  }
  konamiBuf.push(e.code); if (konamiBuf.length > KONAMI.length) konamiBuf.shift();
  if (!flag("egg_konami") && G.scene !== "title" && konamiBuf.join() === KONAMI.join()) {
    setFlag("egg_konami"); addWillowlight(40);
    toast("The old game remembers you. Hidden journal entry: Old Game", 5000);
  }
  const k = KEYMAP[e.code];
  if (!k) return;
  e.preventDefault();
  if (e.repeat) return;
  if (k === "bomb") { pressed.bomb = true; return; }
  if (k === "close") { closeMenu(); return; }
  if (k === "mute") { SFX.setMuted(!SFX.muted); toast(SFX.muted ? "Sound off" : "Sound on"); return; }
  setKey(k, true);
  if (k === "menu" && G.scene === "village" && !G.dialogue) toggleMenu();
});
window.addEventListener("keyup", e => {
  const k = KEYMAP[e.code];
  if (!k || k === "bomb" || k === "close") return;
  setKey(k, false);
});
window.addEventListener("blur", () => { for (const k in INPUT) INPUT[k] = false; });

function toggleMenu() {
  if (MG.active || SK.active || AM.active || WM.active || RT.active || CV.active || FS.active) return; // no menus while a mini-game runs
  if (G.menu) closeMenu(); else openMenu("satchel");
}

// Touch / pointer buttons
document.querySelectorAll("#touch button").forEach(b => {
  const k = b.dataset.k;
  const down = e => {
    e.preventDefault();
    if (k === "menu") { toggleMenu(); return; }
    // route touch through setKey so a quick tap still registers as a press
    setKey(k, true);
  };
  const up = e => { e.preventDefault(); if (k !== "menu") INPUT[k] = false; };
  b.addEventListener("pointerdown", down);
  b.addEventListener("pointerup", up);
  b.addEventListener("pointerleave", up);
  b.addEventListener("pointercancel", up);
});

// ---------- Title wiring ----------
document.getElementById("btnNew").onclick = newGame;
document.getElementById("btnLoad").onclick = continueGame;
document.getElementById("dlgClose").onclick = closeDialogue;
document.getElementById("menuClose").onclick = closeMenu;
document.getElementById("btnLoad").classList.toggle("hidden", !hasSave());
renderSpeciesPick();
renderOriginPick();

// ---------- Loop ----------
let last = performance.now();
let autosaveT = 0;

function frame(now) {
  const rawDt = Math.min(0.05, (now - last) / 1000);
  last = now;
  // hit-stop: the simulation holds still for a few frames when a blow lands
  let dt = rawDt;
  if (FX.freezeT > 0) { FX.freezeT -= rawDt; dt = 0; }
  fxStep(dt);
  const t = now / 1000;

  if (MG.active) {
    stepFireflyCatch(dt);
  } else if (FS.active) {
    stepFishing(dt);
  } else if (SK.active) {
    stepStoneSkip(dt);
  } else if (AM.active) {
    stepAcornMemory(dt);
  } else if (WM.active) {
    stepWhackAMole(dt);
  } else if (RT.active) {
    stepRingToss(dt);
  } else if (CV.active) {
    stepCarnival(dt);
  } else if (G.scene === "village" && !G.dialogue && !G.menu) {
    deedTick(dt);
    stepVillage(dt);
  } else if (G.scene === "expedition" && !G.dialogue) {
    stepExpedition(dt);
  }

  if (G.scene === "village" && wasPressed("bomb")) {
    // no-op in village; bomb is an expedition action
  }
  if (G.scene === "expedition" && wasPressed("bomb") && hasItem("acornBomb")) {
    addItem("acornBomb", -1);
    EX.projectiles.push({ x: EX.px, y: EX.py, vx: EX.fx * 360, vy: EX.fy * 360, t: 0.6, dmg: 40 });
  }

  // day clock (village time passes slowly so the village breathes)
  if (G.scene === "village") {
    G.dayClock += dt / 240;
  }

  autosaveT += dt;
  if (autosaveT > 20 && G.scene !== "title") { autosaveT = 0; saveGame(); }

  draw(t);
  updateHud();
  clearPressed();
  requestAnimationFrame(frame);
}

// Keep the title panel visible until a game starts
// Screen-space weather over the village and expeditions: rain, storm flashes,
// fog banks, and a moonlit glow. Kept faint so text stays readable.
function drawWeather(ctx, t, w, h, weather) {
  if (!weather || weather === "clear") {
    // a warm dapple of sunlight from the top-left
    const sun = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(w, h) * 0.7);
    sun.addColorStop(0, "rgba(255,230,160,.10)"); sun.addColorStop(1, "rgba(255,230,160,0)");
    ctx.fillStyle = sun; ctx.fillRect(0, 0, w, h);
    return;
  }
  if (weather === "rain" || weather === "storm") {
    const n = weather === "storm" ? 110 : 60;
    ctx.strokeStyle = weather === "storm" ? "rgba(190,215,255,.45)" : "rgba(200,225,255,.30)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const x = ((i * 137) + t * (weather === "storm" ? 420 : 260)) % (w + 60) - 30;
      const y = ((i * 91) + t * (weather === "storm" ? 900 : 620)) % (h + 80) - 40;
      ctx.moveTo(x, y); ctx.lineTo(x - 6, y + 14);
    }
    ctx.stroke();
  }
  if (weather === "storm") {
    // lightning: a short bright flash every few seconds
    const f = t % 7.3;
    if (f < 0.12) {
      ctx.fillStyle = `rgba(230,240,255,${0.32 * (1 - f / 0.12)})`;
      ctx.fillRect(0, 0, w, h);
    }
  }
  if (weather === "fog") {
    for (let i = 0; i < 3; i++) {
      const y = (h * (0.2 + i * 0.3)) + Math.sin(t * 0.2 + i) * 20;
      const x = ((t * 18 + i * 260) % (w + 400)) - 200;
      const g = ctx.createRadialGradient(x, y, 10, x, y, 260);
      g.addColorStop(0, "rgba(220,230,235,.22)"); g.addColorStop(1, "rgba(220,230,235,0)");
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    }
  }
  if (weather === "moon") {
    const pulse = 0.12 + 0.03 * Math.sin(t * 1.4);
    const m = ctx.createRadialGradient(w * 0.85, h * 0.12, 10, w * 0.85, h * 0.12, Math.max(w, h) * 0.55);
    m.addColorStop(0, `rgba(170,200,255,${pulse})`); m.addColorStop(1, "rgba(170,200,255,0)");
    ctx.fillStyle = m; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 16; i++) {
      const x = (i * 311) % w, y = (i * 173) % (h * 0.6);
      ctx.fillStyle = `rgba(220,235,255,${0.25 + 0.25 * Math.sin(t * 2 + i)})`;
      ctx.beginPath(); ctx.arc(x, y, 1.4, 0, Math.PI * 2); ctx.fill();
    }
  }
}

function draw(t) {
  pixelBegin();
  ctx.clearRect(0, 0, CAM.vw, CAM.vh);
  if (G.scene === "village") {
    CAM.x = clamp(P.x - CAM.vw / 2, 0, Math.max(0, VIL.w - CAM.vw));
    CAM.y = clamp(P.y - CAM.vh / 2, 0, Math.max(0, VIL.h - CAM.vh));
    drawVillage(ctx, CAM, t);
    drawVillageLighting(ctx, CAM, t);
    drawSeasonAir(ctx, t, CAM.vw, CAM.vh);
    drawScreenVignette(ctx, CAM.vw, CAM.vh, 0.45);
    // a mini-game covers the village, so the village's queued labels must not show through
    if (MG.active || SK.active || AM.active || WM.active || RT.active || CV.active || FS.active) PX.q.length = 0;
    if (MG.active) drawFireflyCatch(ctx, t, CAM.vw, CAM.vh);
    else if (FS.active) drawFishing(ctx, t, CAM.vw, CAM.vh);
    else if (SK.active) drawStoneSkip(ctx, t, CAM.vw, CAM.vh);
    else if (AM.active) drawAcornMemory(ctx, t, CAM.vw, CAM.vh);
    else if (WM.active) drawWhackAMole(ctx, t, CAM.vw, CAM.vh);
    else if (RT.active) drawRingToss(ctx, t, CAM.vw, CAM.vh);
    else if (CV.active) drawCarnival(ctx, t, CAM.vw, CAM.vh);
    else drawVillageOverlay(t);
    drawWeather(ctx, t, CAM.vw, CAM.vh, G.weather);
  } else if (G.scene === "expedition") {
    drawExpedition(ctx, t);
    drawWeather(ctx, t, CAM.vw, CAM.vh, G.weather);
  } else {
    drawTitleBackdrop(t);
  }
  pixelFinish();
}

function drawVillageOverlay(t) {
  // interaction prompt
  const pr = document.getElementById("prompt");
  const target = nearestInteractable();
  if (target && !G.dialogue && !G.menu) {
    pr.textContent = verbFor(target) + " " + target.label;
    pr.classList.remove("hidden");
  } else if (!nearestNode()) {
    pr.classList.add("hidden");
  } else {
    pr.textContent = "Strike to gather";
    pr.classList.remove("hidden");
  }
}

function verbFor(p) {
  if (p.kind === "npc") return "Talk to";
  if (p.kind === "station") return "Use";
  if (p.kind === "willow") return "Commune with";
  if (p.kind === "gate") return "Enter";
  if (p.kind === "rest") return "Rest at";
  if (p.kind === "shrine") return "Offer at";
  if (p.kind === "minigame") return p.game === "fish" ? "Fish from the" : "Play at";
  if (p.kind === "builder") return "Read the";
  if (p.kind === "build") return "Tend the";
  if (p.kind === "carnival") return "Visit";
  if (p.kind === "peddler") return "Trade with";
  if (p.kind === "well") return "Make a wish at";
  if (p.kind === "board") return "Read";
  return "Look at";
}

function drawTitleBackdrop(t) {
  const g = ctx.createRadialGradient(CAM.vw / 2, CAM.vh / 2, 50, CAM.vw / 2, CAM.vh / 2, Math.max(CAM.vw, CAM.vh));
  g.addColorStop(0, "#2b4a3d");
  g.addColorStop(1, "#0a130e");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, CAM.vw, CAM.vh);
  for (let i = 0; i < 40; i++) {
    const x = (i * 311) % CAM.vw, y = (i * 173 + t * 10 * (i % 3)) % CAM.vh;
    ctx.fillStyle = `rgba(200,255,220,${0.2 + 0.2 * Math.sin(t + i)})`;
    ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fill();
  }
}

// ---------- Expedition rendering ----------
function drawExpedition(ctx, t) {
  const room = EX.rooms[EX.cur];
  const region = DATA.regions[EX.region];
  const sx = CAM.vw / ROOM_W, sy = CAM.vh / ROOM_H;
  const s = Math.min(sx, sy);
  const ox = (CAM.vw - ROOM_W * s) / 2, oy = (CAM.vh - ROOM_H * s) / 2;

  ctx.fillStyle = "#0b120e";
  ctx.fillRect(0, 0, CAM.vw, CAM.vh);
  ctx.save();
  const shk = fxShakeOffset();
  ctx.translate(ox + shk.x, oy + shk.y);
  ctx.scale(s, s);

  // ground
  const g = ctx.createLinearGradient(0, 0, 0, ROOM_H);
  g.addColorStop(0, region.bg[0]);
  g.addColorStop(1, region.bg[1]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, ROOM_W, ROOM_H);
  // deeper floors sink into darkness
  if (region.depth && EX.depth > 1) {
    ctx.fillStyle = `rgba(0,0,0,${0.12 * (EX.depth - 1)})`;
    ctx.fillRect(0, 0, ROOM_W, ROOM_H);
  }

  drawExpFloor(region, t);

  // depth spores drift upward on deeper floors
  if (region.depth && EX.depth > 1) {
    for (let i = 0; i < 10 + EX.depth * 4; i++) {
      const sx = (i * 97 + t * 14 * (i % 3 + 1)) % ROOM_W;
      const sy = ROOM_H - ((i * 53 + t * 30) % ROOM_H);
      ctx.fillStyle = `rgba(160,255,230,${0.15 + 0.15 * Math.sin(t * 2 + i)})`;
      ctx.beginPath(); ctx.arc(sx, sy, 2 + (i % 3), 0, Math.PI * 2); ctx.fill();
    }
  }

  drawRegionAmbience(EX.region, t);

  // walls with door gaps
  drawExpWalls(room);

  // nodes
  for (const n of room.nodes) {
    if (!n.alive) continue;
    drawNodeSprite(ctx, n.x, n.y, DATA.items[n.item] ? DATA.items[n.item].color : "#ffffff");
  }

  // points
  for (const p of room.points) {
    const pulse = 0.5 + 0.5 * Math.sin(t * 3);
    ctx.fillStyle = p.kind === "exit" && p.locked ? "rgba(120,60,60,.5)" : p.kind === "altar" ? `rgba(255,214,120,${0.35 + 0.3 * pulse})` : `rgba(200,255,220,${0.3 + 0.3 * pulse})`;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    drawExpPointSprite(ctx, p, t);
    ctx.fillStyle = "#fff6dc";
    ctx.font = "13px Georgia";
    ctx.textAlign = "center";
    const label = { shrine: "Shrine", traveler: "Lost Critter", treasure: "Treasure", silverbell: "Silverbell", crossroads: "Crossroads", altar: "Relic Altar", descend: "Stair Down", exit: p.locked ? "Sealed" : "Portal to Village" }[p.kind] || "";
    ctx.fillText(label, p.x, p.y + p.r + 16);
  }

  // warm stone patches: a ring warns, then the stone flares
  for (const p of EX.patches || []) {
    if (p.t > 0) {
      ctx.strokeStyle = `rgba(255,170,90,${0.4 + 0.5 * (1 - p.t / 1.1)})`;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.stroke();
    } else {
      ctx.fillStyle = `rgba(255,140,60,${0.55 * Math.max(0, 1 + p.t / 0.35)})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    }
  }

  drawBlasts(ctx, t);
  drawBossFx(ctx, t);
  fxDrawGround(ctx, t);

  // enemies
  for (const e of room.enemies) {
    if (e.dead) continue;
    if (EX.hazard === "gloom" && !EX.buffs.keenEye && dist(e, { x: EX.px, y: EX.py }) > 170) continue;
    // telegraph
    if (e.boss && e.windup > 0) {
      const dx = EX.px - e.x, dy = EX.py - e.y, d = Math.hypot(dx, dy) || 1;
      ctx.strokeStyle = `rgba(255,80,80,${0.4 + 0.4 * Math.sin(t * 20)})`;
      ctx.lineWidth = 8;
      ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(e.x + dx / d * 400, e.y + dy / d * 400); ctx.stroke();
    }
    if (!e.boss && e.windup > 0) {
      ctx.strokeStyle = "rgba(255,120,120,.8)";
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 8, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.fillStyle = "rgba(0,0,0,.3)";
    ctx.beginPath(); ctx.ellipse(e.x, e.y + e.r * 0.8, e.r * 0.9, e.r * 0.35, 0, 0, Math.PI * 2); ctx.fill();
    // soft halo; elites glow warmer
    const eg = ctx.createRadialGradient(e.x, e.y, e.r * 0.5, e.x, e.y, e.r * 2.2);
    eg.addColorStop(0, e.elite ? "rgba(255,190,90,.3)" : "rgba(255,255,255,.1)");
    eg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = eg;
    ctx.beginPath(); ctx.arc(e.x, e.y, e.r * 2.2, 0, Math.PI * 2); ctx.fill();
    drawEliteAura(ctx, e, t);
    drawEnemyBody(ctx, e, t);
    // health bar
    ctx.fillStyle = "rgba(0,0,0,.5)";
    ctx.fillRect(e.x - e.r, e.y - e.r - 10, e.r * 2, 4);
    ctx.fillStyle = e.boss ? "#e0603a" : "#7fd17a";
    ctx.fillRect(e.x - e.r, e.y - e.r - 10, e.r * 2 * clamp(e.hp / e.maxHp, 0, 1), 4);
    ctx.fillStyle = "#fff6dc";
    ctx.font = "11px Georgia";
    ctx.textAlign = "center";
    ctx.fillText(e.name, e.x, e.y - e.r - 14);
  }

  // projectiles
  for (const p of EX.projectiles) {
    spriteShadow(ctx, p.x, p.y + 12, p.dmg >= 30 ? 8 : 5);
    pixDot(ctx, p.x, p.y, p.dmg >= 30 ? 6 : 3, p.dmg >= 30 ? "#8a6a4a" : "#fff6dc");
  }

  // wisp
  if (EX.buffs.spiritWisp) {
    ctx.fillStyle = "rgba(155,194,255,.85)";
    ctx.beginPath(); ctx.arc(EX.px + Math.cos(t * 2) * 30, EX.py + Math.sin(t * 2) * 20 - 26, 4, 0, Math.PI * 2); ctx.fill();
  }

  // player
  const moving = isDown("up") || isDown("down") || isDown("left") || isDown("right");
  if (EX.curled) {
    ctx.fillStyle = DATA.species[G.species].color;
    ctx.beginPath(); ctx.arc(EX.px, EX.py, 15, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#2a1d14"; ctx.lineWidth = 2; ctx.stroke();
  } else {
    if (EX.invuln > 0 && Math.floor(t * 20) % 2) ctx.globalAlpha = 0.4;
    drawCritter(ctx, EX.px, EX.py, G.species, EX.fx >= 0 ? 1 : -1, moving ? t : 0, 1.2);
    ctx.globalAlpha = 1;
  }

  if (G.activePet) drawPetSprite(ctx, EX.px - EX.fx * 26, EX.py + 8, G.activePet, t);

  // gloom: darkness everywhere except a pool of light around the player
  if (EX.hazard === "gloom") {
    const gl = ctx.createRadialGradient(EX.px, EX.py, 70, EX.px, EX.py, (EX.buffs.keenEye ? 330 : 230) * (built("lanterns") ? 1.25 : 1));
    gl.addColorStop(0, "rgba(4,10,12,0)");
    gl.addColorStop(1, "rgba(4,10,12,0.93)");
    ctx.fillStyle = gl;
    ctx.fillRect(0, 0, ROOM_W, ROOM_H);
  }

  // torchlight: the room is dim, and light pools around the player, doors, foes and glowing things
  if (EX.hazard !== "gloom") {
    const lights = [{ x: EX.px, y: EX.py, r: 260, a: 0.95, color: "255,226,170" }];
    for (const d of Object.keys(room.doors)) {
      if (!room.doors[d]) continue;
      const dx = d === "w" ? 30 : d === "e" ? ROOM_W - 30 : ROOM_W / 2, dy = d === "n" ? 30 : d === "s" ? ROOM_H - 30 : ROOM_H / 2;
      lights.push({ x: dx, y: dy, r: 120 + 6 * Math.sin(t * 9 + dx), a: 0.8, color: "255,190,100" });
    }
    for (const n of room.nodes) if (n.alive) lights.push({ x: n.x, y: n.y, r: 50, a: 0.5, color: "200,255,200" });
    for (const p of room.points) lights.push({ x: p.x, y: p.y, r: 120, a: 0.8, color: p.kind === "altar" ? "255,214,120" : "200,255,220" });
    for (const e of room.enemies) {
      if (e.dead) continue;
      const col = e.mod ? ELITE_MODS[e.mod].color : e.def.color || "#ffffff";
      const n = parseInt(col.slice(1), 16);
      lights.push({ x: e.x, y: e.y, r: e.boss ? 190 : 70 + e.r, a: e.boss ? 0.7 : 0.45, color: `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}` });
    }
    for (const p of EX.projectiles) lights.push({ x: p.x, y: p.y, r: 70, a: 0.6, color: "255,200,120" });
    for (const p of EX.eproj || []) lights.push({ x: p.x, y: p.y, r: 60, a: 0.6, color: "255,120,90" });
    for (const b of EX.blasts || []) lights.push({ x: b.x, y: b.y, r: b.r * 1.5, a: 0.7, color: "255,140,60" });
    if (EX.buffs.spiritWisp) lights.push({ x: EX.px + Math.cos(t * 2) * 30, y: EX.py + Math.sin(t * 2) * 20 - 26, r: 90, a: 0.6, color: "155,194,255" });
    const bg = region.bg[1], bn = parseInt(bg.slice(1), 16);
    const dark = 0.3 + 0.05 * ((EX.depth || 1) - 1);
    drawLighting(ctx, ROOM_W, ROOM_H, 0.5, [((bn >> 16) & 255) >> 2, ((bn >> 8) & 255) >> 2, (bn & 255) >> 2, Math.min(0.7, dark)], lights);
  }
  fxDrawTop(ctx, t);

  // hit vignette
  if (EX.hitFlash > 0) {
    ctx.fillStyle = `rgba(200,30,40,${EX.hitFlash * 0.25})`;
    ctx.fillRect(0, 0, ROOM_W, ROOM_H);
  }

  ctx.restore();

  // low health: the screen edges throb red
  if (G.hp > 0 && G.hp / G.maxHp < 0.3) {
    const pulse = 0.18 + 0.12 * Math.sin(t * 6);
    const lv = ctx.createRadialGradient(CAM.vw / 2, CAM.vh / 2, Math.min(CAM.vw, CAM.vh) * 0.35, CAM.vw / 2, CAM.vh / 2, Math.max(CAM.vw, CAM.vh) * 0.7);
    lv.addColorStop(0, "rgba(160,10,20,0)"); lv.addColorStop(1, `rgba(160,10,20,${pulse})`);
    ctx.fillStyle = lv; ctx.fillRect(0, 0, CAM.vw, CAM.vh);
  }

  drawBossBar(ctx, CAM.vw, CAM.vh);
  drawCard(ctx, CAM.vw, CAM.vh);

  // HUD text. Wide screens: top-right block. Phones: a left column below the
  // health bars and objective, so it never runs into the Stamina bar.
  const narrow = CAM.vw < 600;
  const lines = [`${region.name}${region.depth ? " · depth " + EX.depth + "/" + region.maxDepth : ""} · room ${EX.cur + 1}/${EX.rooms.length}`,
    `Foes slain ${EX.kills} · ✦ ${EX.wl}`];
  const buffs = Object.keys(EX.buffs).filter(k => RELICS[k]).map(k => RELICS[k].name).join(", ");
  if (buffs) lines.push("Relics: " + buffs);
  const res = activeResonances().map(r => r.name).join(", ");
  if (res) lines.push("Resonance: " + res);
  const blessing = DATA.blessings.filter(b => EX.buffs[b.id]).map(b => b.name).join(", ");
  if (blessing) lines.push("Blessing: " + blessing);
  if (EX.omen) lines.push(`Omen: ${OMENS[EX.omen].name}`);
  if (EX.hazard) lines.push(`Hazard: ${DATA.hazards[EX.hazard].name}`);
  if (G.inv.acornBomb) lines.push(`Bombs ${G.inv.acornBomb} (Q)`);
  ctx.font = narrow ? "12px Georgia" : "14px Georgia";
  ctx.fillStyle = "#fff6dc";
  if (narrow) {
    ctx.textAlign = "left";
    lines.forEach((text, i) => ctx.fillText(text, 12, 112 + i * 16));
  } else {
    ctx.textAlign = "right";
    const rx = CAM.vw - 14;
    lines.forEach((text, i) => ctx.fillText(text, rx, 24 + i * 20));
  }
  ctx.textAlign = "left";
}

function drawRegionGround(id, t) {
  if (id === "starfall") { drawStarfallGround(t); return; }
  if (id === "heartwood") {
    ctx.strokeStyle = "rgba(110,40,90,.22)"; ctx.lineWidth = 6; ctx.lineCap = "round";
    for (let i = 0; i < 6; i++) {
      const y0 = (i * 113) % ROOM_H;
      ctx.beginPath(); ctx.moveTo(0, y0); ctx.quadraticCurveTo(ROOM_W * 0.4, y0 + Math.sin(i) * 60, ROOM_W, y0 + 30); ctx.stroke();
    }
  } else if (id === "grove") {
    ctx.strokeStyle = "rgba(200,235,255,.2)"; ctx.lineWidth = 1.5;
    for (let i = 0; i < 8; i++) {
      let x = (i * 137) % ROOM_W, y = (i * 83) % ROOM_H;
      ctx.beginPath(); ctx.moveTo(x, y);
      for (let k = 0; k < 4; k++) { x += 18 + (k * 7 + i) % 11 - 5; y += (k % 2 ? 9 : -7); ctx.lineTo(x, y); }
      ctx.stroke();
    }
  } else if (id === "ashen") {
    for (let i = 0; i < 8; i++) {
      const x = (i * 173) % ROOM_W, y = (i * 131) % ROOM_H;
      ctx.fillStyle = "rgba(20,10,8,.35)"; ctx.beginPath(); ctx.ellipse(x, y, 40 + (i % 3) * 12, 18, 0.3 * i, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(230,120,50,.12)"; ctx.beginPath(); ctx.ellipse(x, y, 10, 5, 0, 0, Math.PI * 2); ctx.fill();
    }
  } else if (id === "marsh") {
    for (let i = 0; i < 7; i++) {
      const x = (i * 181) % ROOM_W, y = (i * 119) % ROOM_H;
      ctx.fillStyle = "rgba(20,70,70,.3)"; ctx.beginPath(); ctx.ellipse(x, y, 36 + (i % 3) * 10, 14, 0.2 * i, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = `rgba(180,230,220,${0.08 + 0.04 * Math.sin(t + i)})`; ctx.beginPath(); ctx.ellipse(x - 6, y - 3, 14, 4, 0.2 * i, 0, Math.PI * 2); ctx.fill();
    }
  }
}

// Drifting particles that give each region its own air.
function drawRegionAmbience(id, t) {
  const W = ROOM_W, H = ROOM_H;
  if (id === "starfall") { drawStarfallAmbience(t, W, H); return; }
  if (id === "fernwood" || id === "thicket") {
    for (let i = 0; i < 14; i++) {
      const x = (i * 131 + t * (22 + (i % 5) * 4)) % W, y = (i * 77 + t * (10 + (i % 3) * 5)) % H;
      ctx.save(); ctx.translate(x, y); ctx.rotate(t * 2 + i);
      ctx.fillStyle = "rgba(200,220,120,.35)"; ctx.beginPath(); ctx.ellipse(0, 0, 5, 2.2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  } else if (id === "marsh") {
    for (let i = 0; i < 3; i++) {
      const y = 150 + i * 200 + Math.sin(t * 0.3 + i) * 20;
      const m = ctx.createLinearGradient(0, y - 40, 0, y + 40);
      m.addColorStop(0, "rgba(200,240,230,0)"); m.addColorStop(0.5, "rgba(200,240,230,.07)"); m.addColorStop(1, "rgba(200,240,230,0)");
      ctx.fillStyle = m; ctx.fillRect(0, y - 40, W, 80);
    }
    for (let i = 0; i < 12; i++) {
      const x = (i * 211) % W, y = (i * 143) % H;
      ctx.fillStyle = `rgba(230,255,150,${0.2 + 0.25 * Math.sin(t * 3 + i)})`;
      ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fill();
    }
  } else if (id === "grove") {
    for (let i = 0; i < 40; i++) {
      const x = (i * 53 + t * 12 * (1 + (i % 3))) % W, y = (i * 97 + t * 26) % H;
      ctx.fillStyle = "rgba(245,252,255,.7)";
      ctx.beginPath(); ctx.arc(x, y, 1.5 + (i % 3) * 0.6, 0, Math.PI * 2); ctx.fill();
    }
  } else if (id === "heartwood") {
    for (let i = 0; i < 22; i++) {
      const x = (i * 71 + Math.sin(t + i) * 12 + W) % W, y = H - ((i * 61 + t * 40) % H);
      ctx.fillStyle = `rgba(255,${120 + (i % 4) * 20},60,${0.35 + 0.3 * Math.sin(t * 4 + i)})`;
      ctx.beginPath(); ctx.arc(x, y, 1.6 + (i % 3) * 0.5, 0, Math.PI * 2); ctx.fill();
    }
  } else if (id === "ashen") {
    for (let i = 0; i < 26; i++) {
      const x = (i * 97 + t * (8 + (i % 4) * 3)) % W, y = (i * 61 + t * 14) % H;
      ctx.fillStyle = `rgba(200,190,180,${0.25 + 0.15 * Math.sin(t + i)})`;
      ctx.beginPath(); ctx.arc(x, y, 1.8 + (i % 3) * 0.6, 0, Math.PI * 2); ctx.fill();
    }
  } else {
    for (let i = 0; i < 10; i++) {
      const x = (i * 157 + t * 6) % W, y = (i * 91) % H;
      ctx.fillStyle = `rgba(190,255,230,${0.12 + 0.12 * Math.sin(t * 1.5 + i)})`;
      ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI * 2); ctx.fill();
    }
  }
}

function drawExpWalls(room) {
  const t = 26, doorW = 100;
  wallSeg(0, 0, ROOM_W, t, room.doors.n ? "n" : null, doorW);
  wallSeg(0, ROOM_H - t, ROOM_W, t, room.doors.s ? "s" : null, doorW);
  wallSeg(0, 0, t, ROOM_H, room.doors.w ? "w" : null, doorW);
  wallSeg(ROOM_W - t, 0, t, ROOM_H, room.doors.e ? "e" : null, doorW);
}

function torchGlow(x, y, t) {
  const f = 1 + 0.06 * Math.sin(t * 9 + x) + 0.03 * Math.sin(t * 23 + y);
  const g = ctx.createRadialGradient(x, y, 2, x, y, 70 * f);
  g.addColorStop(0, "rgba(255,190,100,.35)");
  g.addColorStop(1, "rgba(255,190,100,0)");
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, 70 * f, 0, Math.PI * 2); ctx.fill();
}

function wallSeg(x, y, w, h, door, doorW) {
  const t = performance.now() / 1000;
  if (!door) { stonePiece(x, y, w, h); return; }
  if (w > h) { // horizontal wall with a door gap in the middle
    const mid = ROOM_W / 2;
    stonePiece(x, y, mid - doorW / 2 - x, h);
    stonePiece(mid + doorW / 2, y, x + w - (mid + doorW / 2), h);
    ctx.fillStyle = "#1a2b1d";
    ctx.fillRect(mid - doorW / 2, y, doorW, h);
    torchGlow(mid - doorW / 2 + 6, y + h + 4, t);
    torchGlow(mid + doorW / 2 - 6, y + h + 4, t);
  } else { // vertical wall with a door gap in the middle
    const mid = ROOM_H / 2;
    stonePiece(x, y, w, mid - doorW / 2 - y);
    stonePiece(x, mid + doorW / 2, w, y + h - (mid + doorW / 2));
    ctx.fillStyle = "#1a2b1d";
    ctx.fillRect(x, mid - doorW / 2, w, doorW);
    torchGlow(x + w + 4, mid - doorW / 2 + 6, t);
    torchGlow(x + w + 4, mid + doorW / 2 - 6, t);
  }
}

// ---------- Boot ----------
requestAnimationFrame(t => { last = t; frame(t); });

// ---------- Graphic helpers ----------
function drawScreenVignette(ctx, w, h, strength) {
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

