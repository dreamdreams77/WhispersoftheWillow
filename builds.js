// Village building: the Builder's Board takes materials and Willowlight and raises new things in
// the village. Each does something. The Garden and Apiary give a harvest every day, the Dock opens
// fishing, the Lantern Walk widens the light in gloomy places and the Training Post sharpens strikes.

const BUILDS = {
  dock:     { name: "Fishing Dock",  cost: { wood: 4 },              wl: 5,  desc: "A pier over the north pond. Lets you fish." },
  garden:   { name: "Garden Plot",   cost: { wood: 3, acorn: 3 },    wl: 8,  desc: "Grows a crop that suits the season, ready every morning." },
  apiary:   { name: "Apiary",        cost: { wood: 4, berry: 3 },    wl: 10, desc: "Bees make a jar of wild honey every day." },
  lanterns: { name: "Lantern Walk",  cost: { quartz: 3, wood: 2 },   wl: 12, desc: "Lamps along the southern path. Your light is a quarter wider in the gloom." },
  training: { name: "Training Post", cost: { wood: 5, thorn: 3 },    wl: 15, desc: "A straw dummy to practise on. Your strikes deal 8% more damage." },
};
const BUILD_SPOTS = {
  dock: [300, 215], garden: [880, 565], apiary: [190, 615], training: [1190, 545],
};
const CROPS = ["moonpetal", "berry", "acorn", "frostberry"];

function built(id) { return !!G.flags["built_" + id]; }

function costText(b) {
  const parts = Object.entries(b.cost).map(([k, n]) => `${n} ${DATA.items[k].name}`);
  parts.push(`${b.wl} Willowlight`);
  return parts.join(", ");
}

function openBuilder() {
  const todo = Object.keys(BUILDS).filter(id => !built(id));
  const done = Object.keys(BUILDS).filter(built);
  const text = (done.length ? `Built: ${done.map(id => BUILDS[id].name).join(", ")}.\n` : "Nothing built yet. ") +
    (todo.length ? "What shall the village raise?" : "Everything on the board is built. The village hums.");
  const choices = todo.map(id => ({ label: `${BUILDS[id].name}: ${costText(BUILDS[id])}`, fn: () => tryBuild(id) }));
  choices.push({ label: "Not now", fn: () => {} });
  if (todo.length) {
    // describe each in the body so the choice is informed
    openDialogue("Builder's Board", text + "\n" + todo.map(id => `${BUILDS[id].name}: ${BUILDS[id].desc}`).join("\n"), choices);
  } else {
    openDialogue("Builder's Board", text, []);
  }
}

function tryBuild(id) {
  const b = BUILDS[id];
  const lacking = Object.entries(b.cost).filter(([k, n]) => !hasItem(k, n)).map(([k, n]) => `${n - (G.inv[k] || 0)} more ${DATA.items[k].name}`);
  if (G.wl < b.wl) lacking.push(`${b.wl - G.wl} more Willowlight`);
  if (lacking.length) { toast(`Not enough for the ${b.name}: you need ${lacking.join(", ")}.`, 4500); return; }
  for (const [k, n] of Object.entries(b.cost)) takeItem(k, n);
  G.wl -= b.wl;
  G.flags["built_" + id] = true;
  if (id === "garden") G.flags.gardenReady = true;
  if (id === "apiary") G.flags.apiaryReady = true;
  SFX.play("portal");
  toast(`The ${b.name} is built. ${b.desc}`, 5000);
  saveGame();
}

function interactBuilding(p) {
  if (p.build === "garden" || p.build === "apiary") {
    const key = p.build + "Ready";
    if (!G.flags[key]) { toast(p.build === "garden" ? "The garden is resting. Come back tomorrow." : "The bees are busy. Come back tomorrow."); return; }
    G.flags[key] = false;
    if (p.build === "garden") {
      const crop = CROPS[G.season], n = 2 + (willowOwned("abundance") ? 1 : 0);
      addItem(crop, n);
      toast(`You harvest ${n} ${DATA.items[crop].name}.`);
    } else {
      const n = G.season <= 1 ? 2 : 1;
      addItem("honey", n);
      toast(`The bees leave you ${n} jar${n > 1 ? "s" : ""} of Wild Honey.`);
    }
    SFX.play("gather");
  } else if (p.build === "training") {
    toast("You trade a few practice blows with the straw dummy. Your strikes deal 8% more damage in the wild.");
  }
}

function buildDaily() {
  if (built("garden")) G.flags.gardenReady = true;
  if (built("apiary")) G.flags.apiaryReady = true;
}

// Points of interest. Built things only answer once they exist.
VIL_POINTS.push(
  { id: "builder", kind: "builder", label: "Builder's Board", x: 480, y: 505, r: 44 },
  { id: "b_dock", kind: "minigame", game: "fish", label: "Fishing Dock", x: BUILD_SPOTS.dock[0], y: BUILD_SPOTS.dock[1], r: 44, when: () => built("dock") },
  { id: "b_garden", kind: "build", build: "garden", label: "Garden Plot", x: BUILD_SPOTS.garden[0], y: BUILD_SPOTS.garden[1], r: 52, when: () => built("garden") },
  { id: "b_apiary", kind: "build", build: "apiary", label: "Apiary", x: BUILD_SPOTS.apiary[0], y: BUILD_SPOTS.apiary[1], r: 40, when: () => built("apiary") },
  { id: "b_training", kind: "build", build: "training", label: "Training Post", x: BUILD_SPOTS.training[0], y: BUILD_SPOTS.training[1], r: 40, when: () => built("training") },
);

const LANTERN_SPOTS = [[640, 730], [760, 730], [640, 790], [760, 790], [570, 835], [830, 835]];

function buildLights() {
  const L = [[480, 480, 70, "255,214,140"]];
  if (built("dock")) L.push([300, 190, 100, "255,214,140"]);
  if (built("lanterns")) for (const [x, y] of LANTERN_SPOTS) L.push([x, y - 44, 110, "255,214,140"]);
  return L;
}

// ---------- Drawing ----------
function drawBuilderBoard(ctx, x, y, t) {
  ctx.fillStyle = "rgba(0,0,0,.25)";
  ctx.beginPath(); ctx.ellipse(x + 4, y + 3, 24, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#5a3d24"; ctx.fillRect(x - 20, y - 46, 5, 48); ctx.fillRect(x + 15, y - 46, 5, 48);
  ctx.fillStyle = "#7a5636"; ctx.fillRect(x - 26, y - 58, 52, 34);
  ctx.strokeStyle = "#3e2915"; ctx.lineWidth = 2; ctx.strokeRect(x - 26, y - 58, 52, 34);
  // a blueprint pinned to the boards
  ctx.fillStyle = "#cfe0ee"; ctx.fillRect(x - 20, y - 53, 40, 24);
  ctx.strokeStyle = "rgba(60,100,150,.8)"; ctx.lineWidth = 1;
  ctx.strokeRect(x - 14, y - 49, 14, 12); ctx.beginPath(); ctx.moveTo(x - 14, y - 49); ctx.lineTo(x - 7, y - 56); ctx.lineTo(x, y - 49); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + 4, y - 44); ctx.lineTo(x + 16, y - 44); ctx.moveTo(x + 4, y - 38); ctx.lineTo(x + 14, y - 38); ctx.stroke();
  // a hammer leaning on the post
  ctx.strokeStyle = "#8a6a44"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x + 24, y + 2); ctx.lineTo(x + 32, y - 22); ctx.stroke();
  ctx.fillStyle = "#6a6e76"; ctx.fillRect(x + 26, y - 28, 12, 7);
  ctx.font = "13px Georgia"; ctx.textAlign = "center"; ctx.fillStyle = "rgba(20,26,18,.6)";
  const w = ctx.measureText("Builder's Board").width + 14; ctx.fillRect(x - w / 2, y + 8, w, 20);
  ctx.fillStyle = "#fff6dc"; ctx.fillText("Builder's Board", x, y + 23);
}

function drawNorthPond(ctx, t) {
  const x = 300, y = 160;
  ctx.fillStyle = "rgba(60,50,38,.5)";
  ctx.beginPath(); ctx.ellipse(x, y + 3, 98, 53, 0, 0, Math.PI * 2); ctx.fill();
  const water = ctx.createRadialGradient(x - 20, y - 10, 6, x, y, 96);
  water.addColorStop(0, "rgba(120,190,205,.95)"); water.addColorStop(1, "rgba(40,100,125,.95)");
  ctx.fillStyle = water;
  ctx.beginPath(); ctx.ellipse(x, y, 92, 47, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "rgba(200,240,255,.35)"; ctx.lineWidth = 2; ctx.stroke();
  for (let i = 0; i < 4; i++) {
    const k = (t * 0.3 + i / 4) % 1;
    ctx.strokeStyle = `rgba(220,245,255,${0.35 * (1 - k)})`; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.ellipse(x + Math.sin(i * 2.3) * 40, y + Math.cos(i * 1.7) * 14, 4 + k * 20, 1.5 + k * 7, 0, 0, Math.PI * 2); ctx.stroke();
  }
  // lily pads and reeds
  ctx.fillStyle = "#3f7a46";
  for (const [lx, ly] of [[x + 40, y + 10], [x - 50, y - 12], [x + 10, y - 26]]) { ctx.beginPath(); ctx.ellipse(lx, ly, 9, 5, 0.3, 0, Math.PI * 2); ctx.fill(); }
  ctx.strokeStyle = "#5a8a4a"; ctx.lineWidth = 2;
  for (let i = 0; i < 6; i++) { const rx = x - 86 + i * 5, sway = Math.sin(t * 1.5 + i) * 2; ctx.beginPath(); ctx.moveTo(rx, y + 16); ctx.lineTo(rx + sway, y - 4); ctx.stroke(); }
}

function drawDock(ctx, t) {
  const x = 300;
  ctx.fillStyle = "rgba(0,0,0,.22)"; ctx.fillRect(x - 15, 152, 34, 66);
  for (let y = 214; y > 146; y -= 8) {
    ctx.fillStyle = ((y / 8) | 0) % 2 ? "#8a6a44" : "#7a5a38";
    ctx.fillRect(x - 17, y - 7, 34, 7);
  }
  ctx.fillStyle = "#4a321c";
  for (const py of [212, 176, 150]) { ctx.fillRect(x - 20, py - 8, 5, 12); ctx.fillRect(x + 15, py - 8, 5, 12); }
  // a lantern at the head of the dock
  const f = 0.85 + 0.15 * Math.sin(t * 8);
  ctx.fillStyle = `rgba(255,224,150,${f})`; ctx.beginPath(); ctx.arc(x + 18, 136, 4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#3a2a1a"; ctx.fillRect(x + 17, 138, 2, 14);
  // the little boat
  ctx.fillStyle = "#6a4a2a"; ctx.beginPath(); ctx.ellipse(x - 52, 150 + Math.sin(t * 1.4) * 1.5, 16, 6, 0, 0, Math.PI); ctx.fill();
}

function drawGardenPlot(ctx, x, y, t) {
  ctx.fillStyle = "rgba(0,0,0,.2)"; ctx.fillRect(x - 46, y - 20, 96, 54);
  ctx.fillStyle = "#5a3e26"; ctx.fillRect(x - 48, y - 24, 96, 50);
  ctx.strokeStyle = "#8a6a44"; ctx.lineWidth = 3; ctx.strokeRect(x - 48, y - 24, 96, 50);
  const col = ["#f2a6c8", "#e84a5a", "#e0a23a", "#bfe6ff"][G.season], ready = !!G.flags.gardenReady;
  for (let r = 0; r < 3; r++) {
    ctx.fillStyle = "#3c2a18"; ctx.fillRect(x - 42, y - 16 + r * 15, 84, 4);
    for (let c = 0; c < 5; c++) {
      const px = x - 34 + c * 17, py = y - 18 + r * 15, sway = Math.sin(t * 1.6 + c + r) * 1.5;
      ctx.strokeStyle = "#4f8a3a"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(px, py + 6); ctx.lineTo(px + sway, py - (ready ? 8 : 2)); ctx.stroke();
      if (ready) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(px + sway, py - 10, 3.6, 0, Math.PI * 2); ctx.fill(); }
    }
  }
  if (ready) { ctx.fillStyle = `rgba(255,246,200,${0.5 + 0.4 * Math.sin(t * 4)})`; ctx.beginPath(); ctx.arc(x + 40, y - 30, 3, 0, Math.PI * 2); ctx.fill(); }
}

function drawApiary(ctx, x, y, t) {
  ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.beginPath(); ctx.ellipse(x, y + 22, 40, 9, 0, 0, Math.PI * 2); ctx.fill();
  for (const [hx, hy] of [[x - 16, y], [x + 16, y + 4]]) {
    ctx.fillStyle = "#c9a24a"; ctx.fillRect(hx - 12, hy - 8, 24, 26);
    ctx.fillStyle = "#e0bd62"; ctx.fillRect(hx - 12, hy - 8, 24, 6);
    ctx.fillStyle = "#6a4a1a"; ctx.fillRect(hx - 12, hy + 6, 24, 2);
    ctx.fillStyle = "#2a1a0a"; ctx.fillRect(hx - 4, hy + 11, 8, 3);
    ctx.fillStyle = "#8a6a2a"; ctx.fillRect(hx - 14, hy - 12, 28, 5);
  }
  ctx.fillStyle = "#2a2418";
  for (let i = 0; i < 6; i++) {
    const a = t * 2.5 + i * 1.05, bx = x + Math.cos(a) * (22 + i * 3), by = y - 6 + Math.sin(a * 1.4) * 14;
    ctx.beginPath(); ctx.arc(bx, by, 1.8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.6)"; ctx.fillRect(bx - 1, by - 3, 2, 2); ctx.fillStyle = "#2a2418";
  }
  if (G.flags.apiaryReady) { ctx.fillStyle = `rgba(255,210,90,${0.5 + 0.4 * Math.sin(t * 4)})`; ctx.beginPath(); ctx.arc(x, y - 24, 3, 0, Math.PI * 2); ctx.fill(); }
}

function drawTrainingPost(ctx, x, y, t) {
  ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.beginPath(); ctx.ellipse(x + 4, y + 20, 22, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#6a4a2a"; ctx.fillRect(x - 3, y - 34, 6, 56);
  ctx.fillStyle = "#6a4a2a"; ctx.fillRect(x - 20, y - 24, 40, 5);
  ctx.fillStyle = "#d8b860"; ctx.beginPath(); ctx.ellipse(x, y - 14, 14, 18, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#8a6a2a"; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = "#e8cc78"; ctx.beginPath(); ctx.arc(x, y - 38, 9, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = "#a83a2a"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x, y - 14, 6, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.arc(x, y - 14, 2, 0, Math.PI * 2); ctx.stroke();
}

// Adds the village's built things: ground pieces are drawn now, standing pieces join the depth sort.
function drawBuildings(ctx, t, add) {
  drawNorthPond(ctx, t);
  if (built("dock")) drawDock(ctx, t);
  add(505, () => drawBuilderBoard(ctx, 480, 505, t));
  if (built("garden")) drawGardenPlot(ctx, BUILD_SPOTS.garden[0], BUILD_SPOTS.garden[1] - 5, t);
  if (built("apiary")) add(615, () => drawApiary(ctx, BUILD_SPOTS.apiary[0], BUILD_SPOTS.apiary[1] - 10, t));
  if (built("training")) add(545, () => drawTrainingPost(ctx, BUILD_SPOTS.training[0], BUILD_SPOTS.training[1] - 5, t));
  if (built("lanterns")) for (const [x, y] of LANTERN_SPOTS) add(y, () => drawLampPost(ctx, x, y, t));
}

DEEDS.push(
  { id: "builder", title: "Village Builder", text: "Build everything on the Builder's Board.", reward: 20, prog: () => [Object.keys(BUILDS).filter(built).length, Object.keys(BUILDS).length] },
);
