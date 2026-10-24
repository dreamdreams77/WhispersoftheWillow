// Entry point: loop, input, scene drawing.
const canvas = document.getElementById("view");
const ctx = canvas.getContext("2d");
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
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(h * dpr);
  canvas.style.width = window.innerWidth + "px";
  canvas.style.height = h + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
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
  if (MG.active || SK.active || AM.active || WM.active || RT.active || CV.active) return; // no menus while a mini-game runs
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
  ctx.clearRect(0, 0, CAM.vw, CAM.vh);
  if (G.scene === "village") {
    CAM.x = clamp(P.x - CAM.vw / 2, 0, Math.max(0, VIL.w - CAM.vw));
    CAM.y = clamp(P.y - CAM.vh / 2, 0, Math.max(0, VIL.h - CAM.vh));
    drawVillage(ctx, CAM, t);
    drawVillageLighting(ctx, CAM, t);
    drawSeasonAir(ctx, t, CAM.vw, CAM.vh);
    drawScreenVignette(ctx, CAM.vw, CAM.vh, 0.45);
    if (MG.active) drawFireflyCatch(ctx, t, CAM.vw, CAM.vh);
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
  if (p.kind === "minigame") return "Play at";
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
  drawRegionGround(EX.region, t);
  drawExpProps(ctx, EX.region, EX.cur || 0, t);

  // decor (glow patches, stones)
  for (const d of room.decor) {
    ctx.fillStyle = "rgba(255,255,255,.04)";
    ctx.beginPath(); ctx.arc(d.x, d.y, d.r * 1.8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,.25)";
    ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2); ctx.fill();
  }

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
    const c = DATA.items[n.item] ? DATA.items[n.item].color : "#fff";
    ctx.fillStyle = "rgba(0,0,0,.3)";
    ctx.beginPath(); ctx.ellipse(n.x, n.y + 8, 10, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.arc(n.x, n.y, 9, 0, Math.PI * 2); ctx.fill();
  }

  // points
  for (const p of room.points) {
    const pulse = 0.5 + 0.5 * Math.sin(t * 3);
    ctx.fillStyle = p.kind === "exit" && p.locked ? "rgba(120,60,60,.5)" : p.kind === "altar" ? `rgba(255,214,120,${0.35 + 0.3 * pulse})` : `rgba(200,255,220,${0.3 + 0.3 * pulse})`;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
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
    ctx.fillStyle = "rgba(0,0,0,.25)";
    ctx.beginPath(); ctx.ellipse(p.x, p.y + 12, 6, 2.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = p.dmg >= 30 ? "#8b5a2b" : "#fff6dc";
    ctx.beginPath(); ctx.arc(p.x, p.y, p.dmg >= 30 ? 9 : 4, 0, Math.PI * 2); ctx.fill();
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
    const gl = ctx.createRadialGradient(EX.px, EX.py, 70, EX.px, EX.py, EX.buffs.keenEye ? 330 : 230);
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
      lights.push({ x: dx, y: dy, r: 170 + 8 * Math.sin(t * 9 + dx), a: 0.8, color: "255,190,100" });
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
    for (const b of EX.blasts || []) lights.push({ x: b.x, y: b.y, r: b.r * 1.5, a: 0.7, color: "255,140,60" });
    if (EX.buffs.spiritWisp) lights.push({ x: EX.px + Math.cos(t * 2) * 30, y: EX.py + Math.sin(t * 2) * 20 - 26, r: 90, a: 0.6, color: "155,194,255" });
    const bg = region.bg[1], bn = parseInt(bg.slice(1), 16);
    const dark = 0.42 + 0.07 * ((EX.depth || 1) - 1);
    drawLighting(ctx, ROOM_W, ROOM_H, 0.5, [((bn >> 16) & 255) >> 2, ((bn >> 8) & 255) >> 2, (bn & 255) >> 2, Math.min(0.8, dark)], lights);
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

// Region ground detail, drawn over the flagstones.
// Small floor props so no room is a bare slab: tufts, stones, flowers and region-specific growth.
const EXP_PROPS = {
  default:   { tuft: "#4f8a4a", stone: "#6f7a6c", bloom: ["#f2d46b", "#f2a6c8", "#c9a6f2"], extra: "fern" },
  fernwood:  { tuft: "#4f8a4a", stone: "#6f7a6c", bloom: ["#9ad6ff", "#f2a6c8", "#fff2a8"], extra: "fern" },
  thicket:   { tuft: "#7a7a3a", stone: "#7a6e58", bloom: ["#c23a6b", "#e0a24a"], extra: "bramble" },
  hollows:   { tuft: "#3d7a6e", stone: "#4d6a6a", bloom: ["#7fe0d0", "#a8f0e0"], extra: "shroom" },
  marsh:     { tuft: "#3d7a6e", stone: "#4d6a66", bloom: ["#c8f0e8", "#e8d44a"], extra: "reed" },
  grove:     { tuft: "#9ec0d0", stone: "#8aa0b2", bloom: ["#e8f6ff", "#bfe6ff"], extra: "crystal" },
  heartwood: { tuft: "#6a3a6a", stone: "#5a3a52", bloom: ["#ff6bd6", "#c23a6b"], extra: "bramble" },
  ashen:     { tuft: "#6a5a4a", stone: "#4a3f3a", bloom: ["#ff9a4a", "#ffcf6a"], extra: "ember" },
  catacombs: { tuft: "#4a4a5a", stone: "#5a566a", bloom: ["#b8a8e8", "#8a7ac8"], extra: "bone" },
  starfall:  { tuft: "#4a5a8a", stone: "#5a6a9a", bloom: ["#fff2a8", "#cfe0ff"], extra: "crystal" },
};
function drawExpProps(ctx, id, seed, t) {
  const pal = EXP_PROPS[id] || EXP_PROPS.default;
  const h = (a, b) => { const v = Math.sin(a * 127.1 + b * 311.7 + seed * 74.7) * 43758.5453; return v - Math.floor(v); };
  const OUT = "rgba(14,10,8,.45)";
  ctx.save(); ctx.lineJoin = "round"; ctx.lineCap = "round";
  for (let i = 0; i < 46; i++) {
    const x = 50 + h(i, 1) * (ROOM_W - 100), y = 50 + h(i, 2) * (ROOM_H - 100), k = h(i, 3);
    const sway = Math.sin(t * 1.6 + i) * 1.4;
    if (k < 0.42) { // grass tuft
      ctx.strokeStyle = pal.tuft; ctx.lineWidth = 1.6;
      for (let b = -2; b <= 2; b++) { ctx.beginPath(); ctx.moveTo(x + b * 2.2, y); ctx.quadraticCurveTo(x + b * 3 + sway * 0.5, y - 6, x + b * 4 + sway, y - 9 - (b % 2 ? 2 : 0)); ctx.stroke(); }
    } else if (k < 0.6) { // stone
      const r = 4 + h(i, 4) * 6;
      ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.beginPath(); ctx.ellipse(x + 1, y + r * 0.5, r * 1.1, r * 0.45, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = pal.stone; ctx.strokeStyle = OUT; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.ellipse(x, y, r * 1.1, r * 0.75, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,.18)"; ctx.beginPath(); ctx.ellipse(x - r * 0.3, y - r * 0.25, r * 0.45, r * 0.22, 0, 0, Math.PI * 2); ctx.fill();
    } else if (k < 0.78) { // little flower
      const col = pal.bloom[Math.floor(h(i, 5) * pal.bloom.length)];
      ctx.strokeStyle = pal.tuft; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + sway * 0.4, y - 8); ctx.stroke();
      ctx.fillStyle = col;
      for (let p = 0; p < 5; p++) { const a = p * Math.PI * 2 / 5; ctx.beginPath(); ctx.arc(x + sway * 0.4 + Math.cos(a) * 2.4, y - 8 + Math.sin(a) * 2.4, 1.7, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = "#fff3b0"; ctx.beginPath(); ctx.arc(x + sway * 0.4, y - 8, 1.3, 0, Math.PI * 2); ctx.fill();
    } else { // the region's own growth
      const e = pal.extra;
      if (e === "fern") {
        ctx.strokeStyle = "#3f7a46"; ctx.lineWidth = 1.4;
        for (let b = -3; b <= 3; b++) { ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + b * 5, y - 10, x + b * 8 + sway, y - 4 - Math.abs(b) * 1.5); ctx.stroke(); }
      } else if (e === "shroom") {
        ctx.fillStyle = "#e9dcc0"; ctx.fillRect(x - 1.6, y - 6, 3.2, 6);
        ctx.fillStyle = pal.bloom[0]; ctx.strokeStyle = OUT; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(x, y - 6, 6, 4, 0, Math.PI, 0); ctx.fill(); ctx.stroke();
        const g = ctx.createRadialGradient(x, y - 6, 0, x, y - 6, 20); g.addColorStop(0, "rgba(127,224,208,.22)"); g.addColorStop(1, "rgba(127,224,208,0)");
        ctx.fillStyle = g; ctx.fillRect(x - 20, y - 26, 40, 40);
      } else if (e === "reed") {
        ctx.strokeStyle = "#5a8a5a"; ctx.lineWidth = 1.5;
        for (let b = -1; b <= 1; b++) { ctx.beginPath(); ctx.moveTo(x + b * 3, y); ctx.quadraticCurveTo(x + b * 3 + sway, y - 12, x + b * 3 + sway * 1.5, y - 20); ctx.stroke(); }
        ctx.fillStyle = "#7a5a3a"; ctx.beginPath(); ctx.ellipse(x + sway * 1.5, y - 20, 1.8, 4, 0, 0, Math.PI * 2); ctx.fill();
      } else if (e === "crystal") {
        for (const [dx, hh] of [[-3, 8], [0, 13], [3, 7]]) {
          ctx.fillStyle = "rgba(190,230,255,.75)"; ctx.strokeStyle = OUT; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(x + dx - 2.5, y); ctx.lineTo(x + dx, y - hh); ctx.lineTo(x + dx + 2.5, y); ctx.closePath(); ctx.fill(); ctx.stroke();
        }
      } else if (e === "bramble") {
        ctx.strokeStyle = "#4a3626"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x - 10, y); ctx.bezierCurveTo(x - 4, y - 10, x + 4, y + 6, x + 10, y - 4); ctx.stroke();
        ctx.fillStyle = "#2a1c14";
        for (let b = 0; b < 4; b++) { const tx = x - 8 + b * 5; ctx.beginPath(); ctx.moveTo(tx - 1.5, y - 2); ctx.lineTo(tx, y - 7); ctx.lineTo(tx + 1.5, y - 2); ctx.fill(); }
      } else if (e === "ember") {
        const a = 0.35 + 0.25 * Math.sin(t * 3 + i);
        const g = ctx.createRadialGradient(x, y, 0, x, y, 14); g.addColorStop(0, `rgba(255,150,60,${a})`); g.addColorStop(1, "rgba(255,150,60,0)");
        ctx.fillStyle = g; ctx.fillRect(x - 14, y - 14, 28, 28);
        ctx.fillStyle = "#2a1c18"; ctx.beginPath(); ctx.ellipse(x, y, 5, 3, 0, 0, Math.PI * 2); ctx.fill();
      } else if (e === "bone") {
        ctx.strokeStyle = "#cfc8b0"; ctx.lineWidth = 2.2;
        ctx.beginPath(); ctx.moveTo(x - 6, y - 2); ctx.lineTo(x + 6, y + 2); ctx.stroke();
        ctx.fillStyle = "#cfc8b0"; for (const sx of [-6, 6]) { ctx.beginPath(); ctx.arc(x + sx, y + (sx > 0 ? 2 : -2) - 1.4, 2, 0, Math.PI * 2); ctx.arc(x + sx, y + (sx > 0 ? 2 : -2) + 1.4, 2, 0, Math.PI * 2); ctx.fill(); }
      }
    }
  }
  ctx.restore();
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

// Each enemy family gets its own silhouette so the deep foes read apart from the common ones.
function enemyFamily(kind) {
  if (kind === "thornBeetle") return "beetle";
  if (kind === "gloomcap" || kind === "sporeHulk" || kind === "gloomMatriarch") return "cap";
  if (kind === "blightSprite" || kind === "thornwraith" || kind === "bramblemaw" || kind === "blightheart") return "thorn";
  if (kind === "frostWisp" || kind === "frostHound" || kind === "icewyrm") return "frost";
  if (kind === "moonWisp" || kind === "bogLurker") return "wisp";
  if (kind === "starSprite") return "wisp";
  if (kind === "meteorBeetle") return "beetle";
  if (kind === "starwarden") return "frost";
  return "blob";
}

function drawEnemyBody(ctx, e, t) {
  const fam = enemyFamily(e.kind);
  const bob = e.dead ? 0 : Math.sin(t * 4 + e.x * 0.05) * (e.boss ? 1.5 : 2.5);
  const x = e.x, y = e.y + bob, r = e.r;
  const fl = e.flash > 0;
  const C = e.def.color;
  const mix = k => (fl ? "#fff" : shadeHex(C, k));
  const face = (typeof EX !== "undefined" && EX.px < e.x) ? -1 : 1;
  const OUT = "rgba(20,12,8,.62)";
  const lw = Math.max(1.4, r * 0.1);
  const lit = (cx, cy, rad) => {
    const g = ctx.createRadialGradient(cx - rad * 0.35, cy - rad * 0.4, rad * 0.1, cx, cy, rad * 1.3);
    g.addColorStop(0, mix(1.4)); g.addColorStop(0.6, mix(1)); g.addColorStop(1, mix(0.58));
    return g;
  };
  const finish = fill => { ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = lw; ctx.lineJoin = "round"; ctx.stroke(); };
  const eye = (ex, ey, er, iris) => {
    const dx = EX.px - ex, dy = EX.py - ey, d = Math.hypot(dx, dy) || 1;
    ctx.fillStyle = fl ? "#fff" : "#fffdf2"; ctx.beginPath(); ctx.arc(ex, ey, er, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = OUT; ctx.lineWidth = Math.max(0.8, lw * 0.6); ctx.stroke();
    const px = ex + (dx / d) * er * 0.32, py = ey + (dy / d) * er * 0.32;
    ctx.fillStyle = fl ? "#fff" : iris; ctx.beginPath(); ctx.arc(px, py, er * 0.68, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#140c08"; ctx.beginPath(); ctx.arc(px, py, er * 0.36, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(px - er * 0.25, py - er * 0.3, Math.max(0.6, er * 0.15), 0, Math.PI * 2); ctx.fill();
  };
  const glow = (gx, gy, gr, rgb, a) => {
    const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
    g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(gx, gy, gr, 0, Math.PI * 2); ctx.fill();
  };
  // ground shadow
  ctx.fillStyle = "rgba(0,0,0,.3)";
  ctx.beginPath(); ctx.ellipse(e.x + 2, e.y + r * 0.95, r * 1.0, r * 0.36, 0, 0, Math.PI * 2); ctx.fill();

  if (fam === "beetle") {
    const meteor = e.kind === "meteorBeetle";
    const ph = t * 11 + e.x * 0.1;
    // six legs on the two flanks
    ctx.lineCap = "round";
    for (let i = -1; i <= 1; i++) for (const s of [-1, 1]) {
      const bx = x + i * r * 0.45, by = y + s * r * 0.55;
      const mx = bx + i * r * 0.2 + face * r * 0.1, my = y + s * r * 1.05;
      const fx = bx + i * r * 0.5 + Math.sin(ph + i * 2.1 + (s > 0 ? 0 : Math.PI)) * r * 0.2, fy = y + s * r * 1.25;
      for (const [col, w] of [[OUT, lw * 2.2], [mix(0.6), lw * 1.1]]) {
        ctx.strokeStyle = col; ctx.lineWidth = w;
        ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(mx, my); ctx.lineTo(fx, fy); ctx.stroke();
      }
    }
    // antennae and mandibles
    const hx = x + face * r * 0.98;
    for (const s of [-1, 1]) {
      ctx.strokeStyle = OUT; ctx.lineWidth = lw * 1.2;
      ctx.beginPath(); ctx.moveTo(hx + face * r * 0.2, y + s * r * 0.15); ctx.quadraticCurveTo(hx + face * r * 0.7, y + s * r * 0.55, hx + face * r * 0.95, y + s * r * 0.3 + Math.sin(t * 5 + s) * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(hx + face * r * 0.3, y + s * r * 0.15); ctx.quadraticCurveTo(hx + face * r * 0.75, y + s * r * 0.05, hx + face * r * 0.7, y + s * r * 0.02 + 0.1);
      ctx.strokeStyle = mix(0.5); ctx.lineWidth = lw * 1.6; ctx.stroke();
    }
    // head and carapace
    ctx.beginPath(); ctx.ellipse(hx, y, r * 0.5, r * 0.44, 0, 0, Math.PI * 2); finish(lit(hx, y, r * 0.5));
    ctx.beginPath(); ctx.ellipse(x - face * r * 0.12, y, r * 1.02, r * 0.8, 0, 0, Math.PI * 2); finish(lit(x, y, r));
    ctx.strokeStyle = OUT; ctx.lineWidth = lw;
    ctx.beginPath(); ctx.moveTo(x + face * r * 0.55, y); ctx.lineTo(x - face * r * 1.1, y); ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,.22)";
    ctx.beginPath(); ctx.ellipse(x - face * r * 0.1, y - r * 0.4, r * 0.6, r * 0.14, 0, 0, Math.PI * 2); ctx.fill();
    if (meteor) {
      ctx.strokeStyle = fl ? "#fff" : "#ffb04a"; ctx.lineWidth = lw * 0.9;
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x - face * r * 0.9, y + s * r * 0.1); ctx.lineTo(x - face * r * 0.3, y + s * r * 0.35); ctx.lineTo(x + face * r * 0.2, y + s * r * 0.2); ctx.stroke(); }
    } else {
      ctx.fillStyle = fl ? "#fff" : "#1a2a20";
      for (let i = 0; i < 4; i++) {
        const sx = x - face * (r * 0.85 - i * r * 0.4);
        for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sx - 2, y + s * r * 0.12); ctx.lineTo(sx, y + s * r * 0.5); ctx.lineTo(sx + 2, y + s * r * 0.12); ctx.closePath(); ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 0.8; ctx.stroke(); }
      }
    }
    eye(hx + face * r * 0.1, y - r * 0.18, r * 0.2, "#ffb43a"); eye(hx + face * r * 0.1, y + r * 0.18, r * 0.2, "#ffb43a");
  } else if (fam === "cap") {
    const step = Math.sin(t * 6 + e.x * 0.1) * r * 0.08;
    // little feet
    ctx.fillStyle = mix(0.6);
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(x + s * r * 0.35, y + r * 0.92 + step * s, r * 0.3, r * 0.17, 0, 0, Math.PI * 2); finish(mix(0.7)); }
    // stalk
    ctx.beginPath(); ctx.moveTo(x - r * 0.45, y - r * 0.2); ctx.quadraticCurveTo(x - r * 0.7, y + r * 0.9, x - r * 0.3, y + r * 0.95);
    ctx.lineTo(x + r * 0.3, y + r * 0.95); ctx.quadraticCurveTo(x + r * 0.7, y + r * 0.9, x + r * 0.45, y - r * 0.2); ctx.closePath();
    const sg = ctx.createLinearGradient(x - r * 0.6, 0, x + r * 0.6, 0);
    sg.addColorStop(0, fl ? "#fff" : "#e9dcc0"); sg.addColorStop(1, fl ? "#fff" : "#a99a7c");
    finish(sg);
    // gills and cap
    ctx.beginPath(); ctx.ellipse(x, y - r * 0.2, r * 1.15, r * 0.3, 0, 0, Math.PI); finish(mix(0.5));
    ctx.strokeStyle = "rgba(0,0,0,.25)"; ctx.lineWidth = 1;
    for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(x + i * r * 0.3, y - r * 0.2); ctx.lineTo(x + i * r * 0.26, y - r * 0.2 + r * 0.26 * (1 - Math.abs(i) / 4)); ctx.stroke(); }
    ctx.beginPath(); ctx.ellipse(x, y - r * 0.2, r * 1.2, r * 0.9, 0, Math.PI, 0); ctx.closePath(); finish(lit(x, y - r * 0.5, r * 1.1));
    ctx.fillStyle = fl ? "#fff" : "rgba(255,255,255,.4)";
    for (const [sx, sy, sr] of [[-0.55, -0.7, 0.16], [0.1, -0.95, 0.2], [0.6, -0.6, 0.14], [-0.1, -0.5, 0.1]]) { ctx.beginPath(); ctx.arc(x + sx * r, y + sy * r, Math.max(1.2, sr * r), 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = "rgba(255,255,255,.3)"; ctx.beginPath(); ctx.ellipse(x - r * 0.5, y - r * 0.85, r * 0.28, r * 0.1, -0.5, 0, Math.PI * 2); ctx.fill();
    eye(x - r * 0.22, y + r * 0.22, r * 0.17, "#a8d96a"); eye(x + r * 0.22, y + r * 0.22, r * 0.17, "#a8d96a");
    ctx.strokeStyle = OUT; ctx.lineWidth = lw * 0.8;
    ctx.beginPath(); ctx.moveTo(x - r * 0.4, y + r * 0.02); ctx.lineTo(x - r * 0.08, y + r * 0.12); ctx.moveTo(x + r * 0.4, y + r * 0.02); ctx.lineTo(x + r * 0.08, y + r * 0.12); ctx.stroke();
    // spores drifting up
    for (let i = 0; i < 3; i++) {
      const ph = (t * 0.7 + i * 0.37 + e.x * 0.01) % 1;
      ctx.fillStyle = `rgba(190,240,150,${0.5 * (1 - ph)})`;
      ctx.beginPath(); ctx.arc(x + (i - 1) * r * 0.6 + Math.sin(t * 3 + i) * 3, y - r * 1.0 - ph * r * 1.0, 1.5 + (1 - ph) * 1.5, 0, Math.PI * 2); ctx.fill();
    }
  } else if (fam === "thorn") {
    const N = e.boss ? 13 : 9;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2 + t * 0.35 + Math.sin(t * 2 + i) * 0.08;
      const len = r * (1.35 + 0.2 * Math.sin(t * 3 + i * 1.7)), w = r * 0.17;
      const c1 = Math.cos(a), s1 = Math.sin(a), px = -s1, py = c1;
      const bx = x + c1 * r * 0.65, by = y + s1 * r * 0.65;
      const tx = x + c1 * len + px * r * 0.22, ty = y + s1 * len + py * r * 0.22;
      ctx.beginPath(); ctx.moveTo(bx + px * w, by + py * w); ctx.quadraticCurveTo(x + c1 * len * 0.85 + px * w, y + s1 * len * 0.85 + py * w, tx, ty);
      ctx.quadraticCurveTo(x + c1 * len * 0.8 - px * w, y + s1 * len * 0.8 - py * w, bx - px * w, by - py * w); ctx.closePath();
      finish(i % 2 ? mix(0.5) : (fl ? "#fff" : "#4a3626"));
    }
    ctx.beginPath(); ctx.arc(x, y, r * 0.92, 0, Math.PI * 2); finish(lit(x, y, r));
    ctx.strokeStyle = "rgba(0,0,0,.28)"; ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(x - r * 0.9 + i * r * 0.5, y + r * 0.8, r * 0.7, Math.PI * 1.15, Math.PI * 1.75); ctx.stroke(); }
    if (e.kind === "blightheart") glow(x, y + r * 0.35, r * (0.55 + 0.08 * Math.sin(t * 5)), "255,80,90", 0.9);
    const eyeC = e.kind === "blightheart" ? "#ff5a4a" : "#ffe06a";
    glow(x - r * 0.3, y - r * 0.15, r * 0.35, "255,224,106", 0.35); glow(x + r * 0.3, y - r * 0.15, r * 0.35, "255,224,106", 0.35);
    for (const s of [-1, 1]) {
      ctx.fillStyle = fl ? "#fff" : eyeC; ctx.beginPath(); ctx.ellipse(x + s * r * 0.3, y - r * 0.15, r * 0.2, r * 0.12, s * 0.35, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#140c08"; ctx.beginPath(); ctx.ellipse(x + s * r * 0.3 + face * r * 0.04, y - r * 0.15, r * 0.05, r * 0.1, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.strokeStyle = "#140c08"; ctx.lineWidth = lw * 0.9;
    ctx.beginPath(); ctx.moveTo(x - r * 0.35, y + r * 0.35);
    for (let i = 1; i <= 6; i++) ctx.lineTo(x - r * 0.35 + i * r * 0.117, y + r * (i % 2 ? 0.48 : 0.32));
    ctx.stroke();
  } else if (fam === "frost") {
    const hound = e.kind === "frostHound";
    // orbiting shards
    for (let i = 0; i < 4; i++) {
      const a = t * 1.3 + i * Math.PI / 2 + e.x * 0.01, sx = x + Math.cos(a) * r * 1.5, sy = y + Math.sin(a) * r * 1.2 - r * 0.1;
      ctx.beginPath(); ctx.moveTo(sx, sy - r * 0.22); ctx.lineTo(sx + r * 0.1, sy); ctx.lineTo(sx, sy + r * 0.22); ctx.lineTo(sx - r * 0.1, sy); ctx.closePath();
      ctx.globalAlpha = 0.85; finish(fl ? "#fff" : "#cfeeff"); ctx.globalAlpha = 1;
    }
    glow(x, y, r * 1.7, "150,210,255", 0.22);
    if (hound) {
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x + s * r * 0.85, y - r * 0.3); ctx.lineTo(x + s * r * 0.7, y - r * 1.5); ctx.lineTo(x + s * r * 0.1, y - r * 0.7); ctx.closePath(); finish(mix(1.1)); }
    }
    // faceted crystal body
    const pts = [];
    for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + i * Math.PI / 3; pts.push([x + Math.cos(a) * r * 1.05, y + Math.sin(a) * r * 1.1]); }
    ctx.beginPath(); pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.closePath();
    ctx.globalAlpha = 0.92; finish(lit(x, y, r)); ctx.globalAlpha = 1;
    ctx.strokeStyle = "rgba(255,255,255,.3)"; ctx.lineWidth = 1;
    pts.forEach(([px, py]) => { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(px, py); ctx.stroke(); });
    ctx.fillStyle = "rgba(255,255,255,.28)";
    ctx.beginPath(); ctx.moveTo(pts[5][0], pts[5][1]); ctx.lineTo(pts[0][0], pts[0][1]); ctx.lineTo(x, y); ctx.closePath(); ctx.fill();
    if (hound) { ctx.beginPath(); ctx.moveTo(x + face * r * 0.7, y + r * 0.05); ctx.lineTo(x + face * r * 1.45, y + r * 0.2); ctx.lineTo(x + face * r * 0.7, y + r * 0.5); ctx.closePath(); finish(mix(1.2)); ctx.fillStyle = "#14202a"; ctx.beginPath(); ctx.arc(x + face * r * 1.4, y + r * 0.2, Math.max(1.4, r * 0.1), 0, Math.PI * 2); ctx.fill(); }
    if (e.boss || e.kind === "starwarden") {
      for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(x + i * r * 0.5 - r * 0.2, y - r * 0.95); ctx.lineTo(x + i * r * 0.5, y - r * (1.6 - Math.abs(i) * 0.3)); ctx.lineTo(x + i * r * 0.5 + r * 0.2, y - r * 0.95); ctx.closePath(); finish(mix(1.3)); }
    }
    eye(x - r * 0.3, y - r * 0.08, r * 0.2, "#6fd6ff"); eye(x + r * 0.3, y - r * 0.08, r * 0.2, "#6fd6ff");
  } else if (fam === "wisp" && e.kind === "bogLurker") {
    const lure = { x: x + face * r * 0.75, y: y - r * 1.25 + Math.sin(t * 3) * 2 };
    ctx.strokeStyle = OUT; ctx.lineWidth = lw * 1.4;
    ctx.beginPath(); ctx.moveTo(x + face * r * 0.2, y - r * 0.5); ctx.quadraticCurveTo(x + face * r * 0.2, y - r * 1.4, lure.x, lure.y); ctx.stroke();
    glow(lure.x, lure.y, r * 0.9, "190,255,170", 0.5);
    ctx.fillStyle = fl ? "#fff" : "#d6ffb0"; ctx.beginPath(); ctx.arc(lure.x, lure.y, r * 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x, y + r * 0.25, r * 1.25, r * 0.78, 0, Math.PI, 0);
    ctx.bezierCurveTo(x + r * 1.3, y + r * 0.9, x - r * 1.3, y + r * 0.9, x - r * 1.25, y + r * 0.25); ctx.closePath(); finish(lit(x, y, r * 1.1));
    ctx.fillStyle = "rgba(255,255,255,.16)"; ctx.beginPath(); ctx.ellipse(x - r * 0.35, y - r * 0.15, r * 0.4, r * 0.12, -0.3, 0, Math.PI * 2); ctx.fill();
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(x + s * r * 0.42, y - r * 0.28, r * 0.24, 0, Math.PI * 2); finish(mix(1.1)); eye(x + s * r * 0.42, y - r * 0.3, r * 0.17, "#e8d44a"); }
    ctx.strokeStyle = "#140c08"; ctx.lineWidth = lw; ctx.beginPath(); ctx.arc(x, y + r * 0.22, r * 0.5, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
    ctx.fillStyle = "#e8e0c8"; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(x + i * r * 0.18 - 1.5, y + r * 0.5 - Math.abs(i) * 1.2); ctx.lineTo(x + i * r * 0.18, y + r * 0.62 - Math.abs(i) * 1.2); ctx.lineTo(x + i * r * 0.18 + 1.5, y + r * 0.5 - Math.abs(i) * 1.2); ctx.fill(); }
    ctx.fillStyle = mix(0.7); for (let i = 0; i < 3; i++) { const ph = (t * 0.8 + i * 0.33) % 1; ctx.beginPath(); ctx.arc(x + (i - 1) * r * 0.7, y + r * 0.85 + ph * r * 0.4, 1.5, 0, Math.PI * 2); ctx.fill(); }
  } else if (fam === "wisp") {
    const star = e.kind === "starSprite";
    glow(x, y, r * 2, star ? "255,240,170" : "170,200,255", 0.28);
    ctx.beginPath();
    if (star) {
      for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5 + Math.sin(t * 1.5) * 0.08, rr = (i % 2 ? 0.62 : 1.25) * r; const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
      ctx.closePath();
    } else {
      ctx.moveTo(x - r, y); ctx.arc(x, y, r, Math.PI, 0);
      for (let i = 0; i <= 5; i++) ctx.quadraticCurveTo(x + r - (i + 0.5) * r * 0.4, y + r * (i % 2 ? 0.5 : 1.15) + Math.sin(t * 6 + i) * 2, x + r - (i + 1) * r * 0.333, y + r * (i % 2 ? 1.0 : 0.6) + Math.sin(t * 6 + i) * 2);
      ctx.closePath();
    }
    ctx.globalAlpha = 0.93; finish(lit(x, y, r)); ctx.globalAlpha = 1;
    glow(x, y - r * 0.1, r * 0.7, "255,255,255", 0.35);
    for (const s of [-1, 1]) {
      ctx.fillStyle = "#101820"; ctx.beginPath(); ctx.ellipse(x + s * r * 0.33, y - r * 0.12, r * 0.15, r * 0.22, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(x + s * r * 0.33 - r * 0.04, y - r * 0.2, Math.max(0.7, r * 0.06), 0, Math.PI * 2); ctx.fill();
    }
  } else {
    // a small blighted beast: horns, stubby feet, brows and fangs
    const hop = Math.abs(Math.sin(t * 5 + e.x * 0.1)) * r * 0.1;
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(x + s * r * 0.45, y + r * 0.92, r * 0.28, r * 0.16, 0, 0, Math.PI * 2); finish(mix(0.6)); }
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x + s * r * 0.45, y - r * 0.75 - hop); ctx.quadraticCurveTo(x + s * r * 0.7, y - r * 1.2, x + s * r * 0.95, y - r * 1.35); ctx.quadraticCurveTo(x + s * r * 0.85, y - r * 0.9, x + s * r * 0.8, y - r * 0.55); ctx.closePath(); finish(fl ? "#fff" : "#e6dcc4"); }
    ctx.beginPath(); ctx.arc(x, y - hop, r, 0, Math.PI * 2); finish(lit(x, y, r));
    eye(x - r * 0.33, y - r * 0.15 - hop, r * 0.24, "#ffcf4a"); eye(x + r * 0.33, y - r * 0.15 - hop, r * 0.24, "#ffcf4a");
    ctx.strokeStyle = "#140c08"; ctx.lineWidth = lw * 1.1;
    ctx.beginPath(); ctx.moveTo(x - r * 0.6, y - r * 0.55 - hop); ctx.lineTo(x - r * 0.12, y - r * 0.38 - hop); ctx.moveTo(x + r * 0.6, y - r * 0.55 - hop); ctx.lineTo(x + r * 0.12, y - r * 0.38 - hop); ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y + r * 0.35 - hop, r * 0.32, 0.1 * Math.PI, 0.9 * Math.PI); ctx.stroke();
    ctx.fillStyle = "#fff"; for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x + s * r * 0.22 - 1.4, y + r * 0.56 - hop); ctx.lineTo(x + s * r * 0.22, y + r * 0.72 - hop); ctx.lineTo(x + s * r * 0.22 + 1.4, y + r * 0.56 - hop); ctx.fill(); }
  }
}

function drawExpWalls(room) {
  const t = 26, doorW = 100;
  wallSeg(0, 0, ROOM_W, t, room.doors.n ? "n" : null, doorW);
  wallSeg(0, ROOM_H - t, ROOM_W, t, room.doors.s ? "s" : null, doorW);
  wallSeg(0, 0, t, ROOM_H, room.doors.w ? "w" : null, doorW);
  wallSeg(ROOM_W - t, 0, t, ROOM_H, room.doors.e ? "e" : null, doorW);
}

// Stone walls: each block has its own tone, a bevelled top edge and the odd patch of moss.
function stonePiece(x, y, w, h) {
  const horiz = w > h;
  ctx.fillStyle = "#17271b";
  ctx.fillRect(x, y, w, h);
  const step = 48;
  const hash = (a, b) => { const v = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return v - Math.floor(v); };
  if (horiz) {
    for (let sx = x; sx < x + w; sx += step) {
      const bw = Math.min(step, x + w - sx);
      ctx.fillStyle = hash(sx, y) < 0.5 ? "rgba(255,255,255,.04)" : "rgba(0,0,0,.14)";
      ctx.fillRect(sx + 2, y + 2, bw - 4, h - 4);
      ctx.fillStyle = "rgba(190,230,180,.16)"; ctx.fillRect(sx + 2, y + 2, bw - 4, 2);
      ctx.fillStyle = "rgba(0,0,0,.3)"; ctx.fillRect(sx + 2, y + h - 4, bw - 4, 2);
      if (hash(sx + 7, y + 3) < 0.22) {
        ctx.fillStyle = "rgba(90,150,70,.32)";
        ctx.beginPath(); ctx.ellipse(sx + bw * 0.5, y + h * 0.5, 5 + hash(sx, y + 9) * 6, 3, 0, 0, Math.PI * 2); ctx.fill();
      }
    }
  } else {
    for (let sy = y; sy < y + h; sy += step) {
      const bh = Math.min(step, y + h - sy);
      ctx.fillStyle = hash(x, sy) < 0.5 ? "rgba(255,255,255,.04)" : "rgba(0,0,0,.14)";
      ctx.fillRect(x + 2, sy + 2, w - 4, bh - 4);
      ctx.fillStyle = "rgba(190,230,180,.16)"; ctx.fillRect(x + 2, sy + 2, 2, bh - 4);
      ctx.fillStyle = "rgba(0,0,0,.3)"; ctx.fillRect(x + w - 4, sy + 2, 2, bh - 4);
      if (hash(x + 3, sy + 7) < 0.22) {
        ctx.fillStyle = "rgba(90,150,70,.32)";
        ctx.beginPath(); ctx.ellipse(x + w * 0.5, sy + bh * 0.5, 3, 5 + hash(x, sy + 9) * 6, 0, 0, Math.PI * 2); ctx.fill();
      }
    }
  }
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

function drawExpFloor(region, t) {
  // checkered flagstones with a few moss tufts, lit from the room's center
  for (let gy = 0; gy < ROOM_H; gy += 60) {
    for (let gx = 0; gx < ROOM_W; gx += 80) {
      const odd = ((gx / 80) + (gy / 60)) % 2;
      ctx.fillStyle = odd ? "rgba(255,255,255,.026)" : "rgba(0,0,0,.08)";
      ctx.fillRect(gx + 2, gy + 2, 76, 56);
      // bevel: a light top edge and a dark bottom edge on each stone
      ctx.fillStyle = "rgba(200,240,190,.05)";
      ctx.fillRect(gx + 2, gy + 2, 76, 2);
      ctx.fillStyle = "rgba(0,0,0,.14)";
      ctx.fillRect(gx + 2, gy + 56, 76, 2);
    }
  }
  for (let i = 0; i < 18; i++) {
    const x = (i * 157) % ROOM_W, y = (i * 91) % ROOM_H;
    const moss = ctx.createRadialGradient(x, y, 0, x, y, 18 + (i % 3) * 5);
    moss.addColorStop(0, "rgba(110,165,90,.32)");
    moss.addColorStop(1, "rgba(90,140,80,0)");
    ctx.fillStyle = moss;
    ctx.beginPath(); ctx.ellipse(x, y, 16 + (i % 3) * 5, 8, 0, 0, Math.PI * 2); ctx.fill();
  }
  const lit = ctx.createRadialGradient(ROOM_W / 2, ROOM_H / 2, 40, ROOM_W / 2, ROOM_H / 2, ROOM_W * 0.6);
  lit.addColorStop(0, `rgba(255,250,220,${0.06 + 0.02 * Math.sin(t * 1.3)})`);
  lit.addColorStop(1, "rgba(0,0,0,.25)");
  ctx.fillStyle = lit;
  ctx.fillRect(0, 0, ROOM_W, ROOM_H);
}
