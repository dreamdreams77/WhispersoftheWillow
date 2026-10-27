// Village scene: map, player, gathering, NPCs, drawing.
const VIL = { w: 1400, h: 900 };

// Solid obstacles (rects)
const VIL_SOLIDS = [
  { x: 560, y: 300, w: 280, h: 240 },   // Great Willow trunk (hollow in the middle)
  { x: 80, y: 80, w: 120, h: 120 },     // trees
  { x: 1180, y: 90, w: 140, h: 110 },
  { x: 90, y: 680, w: 150, h: 120 },
  { x: 1180, y: 690, w: 150, h: 120 },
  { x: 440, y: 120, w: 90, h: 70 },
  { x: 900, y: 610, w: 110, h: 80 },
];

// Buildings and interaction points: kind drives behavior
const VIL_POINTS = [
  { id: "willow",    kind: "willow",   label: "The Great Willow", x: 700, y: 400, r: 150 },
  { id: "kitchen",   kind: "station",  station: "kitchen",  label: "Communal Kitchen", x: 260, y: 300, r: 50 },
  { id: "workshop",  kind: "station",  station: "workshop", label: "Workshop",          x: 1080, y: 300, r: 50 },
  { id: "hollis",    kind: "npc",      npc: "villager_owl",   label: "Elder Thistlemoon",    x: 300, y: 650, r: 46 },
  { id: "wren",      kind: "npc",      npc: "villager_mouse", label: "Posy",            x: 1060, y: 655, r: 46 },
  { id: "ash",       kind: "npc",      npc: "villager_ash",   label: "Brindle",             x: 930, y: 345, r: 46 },
  { id: "gate",      kind: "gate",     label: "Fernwood Path", x: 700, y: 820, r: 60 },
  { id: "bramble",   kind: "gate",     label: "Bramblewild Thicket", x: 130, y: 830, r: 50, region: "thicket" },
  { id: "dorn",     kind: "npc",      npc: "villager_mole",  label: "Nubbins",            x: 1180, y: 430, r: 46 },
  { id: "hollows",   kind: "gate",     label: "Sunken Hollows", x: 1260, y: 720, r: 50, region: "hollows" },
  { id: "catacombs", kind: "gate", label: "Hollowroot Catacombs", x: 1330, y: 560, r: 50, region: "catacombs" },
  { id: "marsh", kind: "gate", label: "Whispering Marsh", x: 430, y: 840, r: 50, region: "marsh" },
  { id: "grove", kind: "gate", label: "Frostfallen Grove", x: 980, y: 840, r: 50, region: "grove" },
  { id: "heartwood", kind: "gate", label: "Corrupted Heartwood", x: 100, y: 330, r: 50, region: "heartwood" },
  { id: "ashen", kind: "gate", label: "The Ashen Glade", x: 1340, y: 400, r: 50, region: "ashen" },
  { id: "shrine", kind: "shrine", label: "Spirit Shrine", x: 700, y: 690, r: 50 },
  { id: "pond", kind: "minigame", label: "Firefly Pond", x: 480, y: 640, r: 50 },
  { id: "skip", kind: "minigame", game: "skip", label: "Stone Skip Creek", x: 150, y: 520, r: 50 },
  { id: "acorn", kind: "minigame", game: "acorn", label: "Squirrel's Stump", x: 330, y: 470, r: 50 },
  { id: "whack", kind: "minigame", game: "whack", label: "Mole Hills", x: 560, y: 760, r: 50 },
  { id: "ring", kind: "minigame", game: "ring", label: "Ring Toss", x: 840, y: 745, r: 50 },
  { id: "starfall", kind: "gate", label: "Starfall Meadow", x: 830, y: 120, r: 50, region: "starfall" },
  { id: "bed",       kind: "rest",     label: "Rest under the Willow", x: 700, y: 180, r: 60 },
];

const VIL_NODES_BASE = [
  { x: 180, y: 180, item: "berry" }, { x: 240, y: 200, item: "berry" },
  { x: 1240, y: 420, item: "moonpetal" }, { x: 960, y: 480, item: "acorn" },
  { x: 420, y: 720, item: "wood" }, { x: 880, y: 700, item: "mushroom" },
  { x: 600, y: 800, item: "acorn" }, { x: 1300, y: 780, item: "wood" },
];

const P = {
  x: 700, y: 600, r: 14, facing: 1, moving: false, t: 0, speed: 180,
};

const WORLD = { nodes: [], time: 0, sparkles: [] };

function resetVillageNodes() {
  WORLD.nodes = VIL_NODES_BASE.filter((n, i) => G.season !== 3 || i < 5).map((n, i) => ({ ...n, id: "v" + i, alive: true, regrow: 0 }));
  // winter is lean; summer has an extra berry patch
  if (G.season === 1) WORLD.nodes.push({ id: "summer", x: 340, y: 430, item: "berry", alive: true, regrow: 0 });
  // seasonal gatherables
  const seasonNodes = (DATA.seasonal[G.season] || { nodes: [] }).nodes;
  seasonNodes.forEach((item, i) => {
    const pos = SEASON_SPOTS[i % SEASON_SPOTS.length];
    WORLD.nodes.push({ id: "s" + i, x: pos[0], y: pos[1], item, alive: true, regrow: 0 });
  });
  if (flag("silverbellSpawn") && !flag("silverbell")) {
    WORLD.nodes.push({ id: "silver", x: 880, y: 130, item: "silverbell", alive: true, regrow: 0 });
  }
}

function nodeYield(item) {
  const base = 1;
  let n = base;
  if (G.species === "mouse" && Math.random() < 0.4) n++;
  if (willowOwned("abundance") && Math.random() < 0.5) n++;
  return n;
}

function stepVillage(dt) {
  // movement
  let dx = 0, dy = 0;
  if (isDown("left")) dx -= 1;
  if (isDown("right")) dx += 1;
  if (isDown("up")) dy -= 1;
  if (isDown("down")) dy += 1;
  P.moving = dx || dy;
  if (dx || dy) {
    const len = Math.hypot(dx, dy);
    dx /= len; dy /= len;
    const sp = P.speed * DATA.species[G.species].speed * (isDown("dodge") && G.stamina > 0 && G.species === "rabbit" ? 1.4 : 1);
    if (dx) P.facing = Math.sign(dx);
    moveWithCollision(P, dx * sp * dt, dy * sp * dt);
    P.t += dt;
  }
  P.x = clamp(P.x, 20, VIL.w - 20);
  P.y = clamp(P.y, 20, VIL.h - 20);

  // regrow nodes
  for (const n of WORLD.nodes) {
    if (!n.alive) {
      n.regrow -= dt;
      if (n.regrow <= 0) { n.alive = true; }
    }
  }

  // action
  const target = nearestInteractable();
  if (wasPressed("act") && target) interact(target);
  if (wasPressed("atk")) gatherNearest();

  G.stamina = clamp(G.stamina + dt * 20, 0, 100);
  WORLD.time += dt;
}

function moveWithCollision(ent, mx, my) {
  ent.x += mx;
  for (const s of VIL_SOLIDS) if (circleRect(ent, s)) { ent.x -= mx; break; }
  ent.y += my;
  for (const s of VIL_SOLIDS) if (circleRect(ent, s)) { ent.y -= my; break; }
}

function circleRect(c, r) {
  const nx = clamp(c.x, r.x, r.x + r.w);
  const ny = clamp(c.y, r.y, r.y + r.h);
  const dx = c.x - nx, dy = c.y - ny;
  return dx * dx + dy * dy < c.r * c.r;
}

function nearestInteractable() {
  let best = null, bd = Infinity;
  for (const p of VIL_POINTS) {
    if (p.when && !p.when()) continue;
    const d = Math.hypot(P.x - p.x, P.y - p.y);
    if (d < p.r + 24 && d < bd) { bd = d; best = p; }
  }
  return best;
}

function nearestNode() {
  let best = null, bd = 42;
  for (const n of WORLD.nodes) {
    if (!n.alive) continue;
    const d = Math.hypot(P.x - n.x, P.y - n.y);
    if (d < bd) { bd = d; best = n; }
  }
  return best;
}

function gatherNearest() {
  const n = nearestNode();
  if (!n) return;
  n.alive = false;
  n.regrow = 25;
  SFX.play("gather");
  const amt = nodeYield(n.item);
  addItem(n.item, amt);
  toast(`Gathered ${amt} ${DATA.items[n.item] ? DATA.items[n.item].name : "something"}`);
  if (n.item === "silverbell") setFlag("silverbell");
}

function interact(p) {
  if (p.kind === "npc") {
    talk(p.npc);
  } else if (p.kind === "station") {
    openMenu("craft", p.station);
  } else if (p.kind === "willow") {
    // Hidden: the seventh communion makes the Great Willow speak.
    G.flags.willowVisits = (G.flags.willowVisits || 0) + 1;
    if (G.flags.willowVisits === 7 && !flag("egg_willow7")) {
      setFlag("egg_willow7");
      openDialogue("The Great Willow", "You knocked seven times, Pip. Nobody has ever done that. Here, take this light. It was always yours to carry.", null);
      addWillowlight(25);
      toast("Hidden journal entry: The Seventh Knock");
      return;
    }
    openMenu("willow");
  } else if (p.kind === "gate") {
    const lock = gateLock(p.region);
    if (lock) { toast(lock); return; }
    chooseOmen(p.region || "fernwood");
  } else if (p.kind === "shrine") {
    openShrine();
  } else if (p.kind === "rest") {
    restAtWillow();
  } else if (p.kind === "minigame") {
    if (p.game === "skip") startStoneSkip();
    else if (p.game === "acorn") startAcornMemory();
    else if (p.game === "whack") startWhackAMole();
    else if (p.game === "ring") startRingToss();
    else if (p.game === "fish") startFishing();
    else startFireflyCatch();
  } else if (p.kind === "builder") {
    openBuilder();
  } else if (p.kind === "build") {
    interactBuilding(p);
  } else if (p.kind === "carnival") {
    openCarnivalMenu();
  } else if (p.kind === "peddler") {
    openPeddler();
  } else if (p.kind === "well") {
    makeWish();
  } else if (p.kind === "board") {
    readNotices();
  }
}

function restAtWillow() {
  const wasSeason = G.season;
  G.hp = G.maxHp;
  G.day += 1;
  G.season = Math.floor((G.day - 1) / 7) % 4;
  G.weather = rollWeather();
  resetVillageNodes();
  villageDaily();
  saveGame();
  // Announcements are quiet toasts, not dialogue, so resting never blocks play.
  if (G.season !== wasSeason) {
    toast(festival(G.season), 7000);
  } else {
    const pool = willowOwned("spiritbond") ? DATA.willowDreams.concat(DATA.deepDreams) : DATA.willowDreams;
    const dream = pool[(G.day - 1) % pool.length];
    toast(`A new day. The Willow dreams: ${dream}${peddlerHere() ? " A peddler's cart has rolled in at the southern edge of the village." : ""}`, 6500);
  }
}

function festival(idx) {
  const f = DATA.festivals[idx];
  if (!f) return "A new season begins.";
  for (const [item, n] of Object.entries(f.gift)) addItem(item, n);
  G.wl += f.wl;
  return f.text;
}

// Village gate requirement: returns the reason it's locked, or null when open.
function gateLock(id) {
  const g = DATA.gates[id];
  if (!g) return null;
  return g.open() ? null : g.msg;
}

function talk(npcId) {
  const v = DATA.villagers[npcId];
  if (!v) return;
  const rel = G.relations[npcId] || 0;
  let line = v.lines[Math.min(rel, v.lines.length - 1)];
  if (rel >= 6 && v.close) line = pick(v.close);
  const choices = [];

  // relationship event: a one-time conversation at close friendship, shaped by the choices
  const evt = DATA.events[npcId];
  if (evt && rel >= evt.at && !flag(`evt_${npcId}`)) {
    setFlag(`evt_${npcId}`);
    openDialogue(v.name, evt.text, evt.choices.map(ch => ({ label: ch.label, fn: () => applyEventChoice(npcId, ch) })));
    return;
  }

  // personal task: offered at friendship giveAt, paid out on turn-in
  const pq = DATA.personal[npcId];
  if (pq && !flag(pqKey(npcId, "done"))) {
    if (flag(pqKey(npcId, "start"))) {
      if (hasItem(pq.need.item, pq.need.n)) {
        takeItem(pq.need.item, pq.need.n);
        setFlag(pqKey(npcId, "done"));
        for (const [k, n] of Object.entries(pq.reward.items || {})) addItem(k, n);
        if (pq.reward.wl) addWillowlight(pq.reward.wl);
        toast(`Task complete: ${pq.title}`);
        line = pq.done;
      } else {
        line = pq.remind;
      }
    } else if (rel >= pq.giveAt) {
      setFlag(pqKey(npcId, "start"));
      toast(`New task from ${v.name}: ${pq.title}`);
      line = pq.intro;
    }
  }

  if (npcId === "villager_mouse" && hasItem("silverbell") && !flag("silverbellDelivered")) {
    line = "Is that... silverbell?! Oh, you found it! Thank you so much.";
    choices.push({
      label: "Hand it over",
      fn: () => {
        takeItem("silverbell", 1);
        setFlag("silverbellDelivered");
        G.relations[npcId] = (G.relations[npcId] || 0) + 1;
        addItem("pollenDraught", 1);
        addWillowlight(2);
        toast("Posy gave you a Pollen Draught.");
        openDialogue(v.name, v.lines[2], []);
      }
    });
  }

  if (npcId === "villager_mole" && flag("matriarchDown") && !flag("dornMatriarch")) {
    setFlag("dornMatriarch");
    line = "The Matriarch is quiet now. Take this quartz. It was singing for her, and it will sing for you.";
    addItem("quartz", 2);
    addWillowlight(1);
  }

  if (npcId === "villager_owl" && flag("silverbellDelivered") && !flag("owlTold")) {
    setFlag("owlTold");
    line = "A silverbell! Posy will be overjoyed. Take this, for the Thicket is no place for the unprepared.";
    addItem("acornBomb", 2);
    addWillowlight(1);
  }

  // Brindle reacts once the Ember Stag has been put to rest.
  if (npcId === "villager_ash" && flag("ashenCleansed") && !flag("ashTold")) {
    setFlag("ashTold");
    line = "The glade is cooling. I smelled that smoke from my forge for years and thought the forest was dying. Take these ashblooms. The Stag kept its oath, and I'll keep mine: no more cinders from this forge in the woods.";
    addItem("ashbloom", 3);
    addWillowlight(2);
    toast("Brindle gave you 3 Ashbloom.");
  }

  // today's errand from the notice board
  const er = G.flags.errand;
  if (er && er.day === G.day && !er.done && er.who === npcId) {
    const nm = DATA.items[er.item].name;
    if (hasItem(er.item, er.n)) {
      line = `Is that my ${nm}? Oh, you are a treasure.`;
      choices.push({
        label: `Hand over ${er.n} ${nm}`,
        fn: () => {
          takeItem(er.item, er.n);
          er.done = true;
          G.flags.stat_errands = (G.flags.stat_errands || 0) + 1;
          G.relations[npcId] = Math.min((G.relations[npcId] || 0) + 1, 99);
          addWillowlight(er.wl + willowRank().idx);
          saveGame();
          openDialogue(v.name, pick(ERRAND_THANKS), []);
        }
      });
    } else {
      line += ` (You promised ${er.n} ${nm} today.)`;
    }
  }

  if (choices.length === 0) {
    G.relations[npcId] = Math.min((G.relations[npcId] || 0) + 1, 99);
  }

  openDialogue(v.name, line, choices);
}

// Villagers' schedules and spontaneous gifts
function villageDaily() {
  buildDaily();
  if (G.day % 5 === 0) {
    const gifts = Object.keys(DATA.villagers);
    const who = pick(gifts);
    addItem(DATA.villagers[who].gift, 1);
    toast(`${DATA.villagers[who].name} left you a gift in your satchel.`);
  }
}

// ---------- Drawing ----------
// Painted village ground, rendered once to an offscreen canvas.
// Seeded so it looks identical every time it is built.
// A worn trail: a dark edge, a packed-earth band, a light centre, and flagstones set along it.
function drawTrail(g, x0, y0, cx, cy, x1, y1, w, rnd) {
  const trace = () => { g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(cx, cy, x1, y1); };
  g.lineCap = "round";
  trace(); g.strokeStyle = "rgba(60,46,30,.5)"; g.lineWidth = w + 10; g.stroke();
  trace(); g.strokeStyle = "#8a7150"; g.lineWidth = w; g.stroke();
  trace(); g.strokeStyle = "rgba(196,172,124,.55)"; g.lineWidth = w * 0.45; g.stroke();
  g.lineCap = "butt";
  // flagstones, staggered either side of the centre line
  for (let i = 0; i <= 12; i++) {
    const u = i / 12;
    const px = (1 - u) * (1 - u) * x0 + 2 * (1 - u) * u * cx + u * u * x1;
    const py = (1 - u) * (1 - u) * y0 + 2 * (1 - u) * u * cy + u * u * y1;
    const side = (i % 2 ? 1 : -1) * w * 0.14;
    g.fillStyle = "rgba(80,66,46,.55)";
    g.beginPath(); g.ellipse(px + side, py + 1.5, w * 0.3 + rnd() * 2, w * 0.2 + rnd(), rnd() * 3, 0, Math.PI * 2); g.fill();
    g.fillStyle = "rgba(222,206,168,.5)";
    g.beginPath(); g.ellipse(px + side - 1, py, w * 0.22, w * 0.12, 0, 0, Math.PI * 2); g.fill();
  }
}

let VIL_TEX = null, VIL_A = 0;
function buildVillageTexture(a) {
  const c = document.createElement("canvas");
  c.width = Math.ceil(VIL.w * a); c.height = Math.ceil(VIL.h * a);
  const g = c.getContext("2d");
  let seed = 1337;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  paintGrassTerrain(g, c.width, c.height, a, rnd);
  g.scale(a, a);
  const lwd = Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype, "lineWidth");
  Object.defineProperty(g, "lineWidth", { get() { return lwd.get.call(this); }, set(v) { lwd.set.call(this, Math.max(v, 1 / a)); } });

  // grass tufts: little three-blade clumps in several greens
  const greens = ["#5f8f48", "#7ba65a", "#2f5a34", "#8dbb6a"];
  for (let i = 0; i < 1500; i++) {
    const x = rnd() * VIL.w, y = rnd() * VIL.h;
    g.strokeStyle = greens[Math.floor(rnd() * greens.length)];
    g.lineWidth = 1.6; g.lineCap = "round";
    for (let b = -1; b <= 1; b++) {
      const lean = b * 2.5 + (rnd() - 0.5) * 2;
      g.beginPath(); g.moveTo(x + b * 1.8, y);
      g.quadraticCurveTo(x + b * 2 + lean * 0.5, y - 4, x + b * 2.6 + lean, y - 8 - rnd() * 4);
      g.stroke();
    }
  }

  // small wildflowers
  const petals = ["#f4e27a", "#f2a7c3", "#fff3d6", "#b9d3ff", "#e88f6a"];
  for (let i = 0; i < 110; i++) {
    const x = rnd() * VIL.w, y = rnd() * VIL.h;
    g.fillStyle = "rgba(0,0,0,.22)"; g.beginPath(); g.arc(x + 1, y + 1.5, 2.6, 0, Math.PI * 2); g.fill();
    g.fillStyle = petals[Math.floor(rnd() * petals.length)];
    g.beginPath(); g.arc(x, y, 2.4, 0, Math.PI * 2); g.fill();
    g.fillStyle = "rgba(255,240,180,.9)"; g.beginPath(); g.arc(x, y, 0.9, 0, Math.PI * 2); g.fill();
  }

  // the path: worn earth with a lighter centre and a darker, bumpy edge
  const pathEdge = g.createRadialGradient(700, 560, 120, 700, 560, 430);
  pathEdge.addColorStop(0, "#a88c62");
  pathEdge.addColorStop(0.7, "#8a7150");
  pathEdge.addColorStop(1, "#5e4c33");
  g.fillStyle = pathEdge;
  g.beginPath(); g.ellipse(700, 560, 420, 280, 0, 0, Math.PI * 2); g.fill();
  // edge stones
  for (let i = 0; i < 90; i++) {
    const a = (i / 90) * Math.PI * 2;
    const jitter = 1 + (rnd() - 0.5) * 0.06;
    const x = 700 + Math.cos(a) * 420 * jitter, y = 560 + Math.sin(a) * 280 * jitter;
    g.fillStyle = "rgba(70,55,35,.55)";
    g.beginPath(); g.ellipse(x, y, 5 + rnd() * 3, 3 + rnd() * 2, a, 0, Math.PI * 2); g.fill();
  }
  // inner pebbles and scuffs
  for (let i = 0; i < 260; i++) {
    const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * 0.92;
    const x = 700 + Math.cos(a) * 420 * d, y = 560 + Math.sin(a) * 280 * d;
    g.fillStyle = rnd() < 0.5 ? "rgba(60,46,30,.35)" : "rgba(235,222,190,.3)";
    g.beginPath(); g.ellipse(x, y, 2 + rnd() * 3, 1.5 + rnd() * 1.5, rnd() * 3, 0, Math.PI * 2); g.fill();
  }
  // trails from the plaza to the huts, the willow and the gates
  drawTrail(g, 700, 520, 706, 660, 700, 830, 30, rnd);     // the Fernwood gate
  drawTrail(g, 640, 520, 470, 560, 310, 610, 26, rnd);     // to the Library
  drawTrail(g, 760, 520, 900, 560, 1030, 610, 26, rnd);    // to the Herbalist
  drawTrail(g, 880, 420, 1000, 380, 1080, 340, 22, rnd);   // to the Workshop and Forge
  drawTrail(g, 540, 430, 390, 370, 290, 340, 22, rnd);     // to the Kitchen
  drawTrail(g, 520, 610, 470, 700, 430, 800, 20, rnd);     // to the Marsh gate
  drawTrail(g, 860, 640, 1000, 740, 980, 820, 20, rnd);    // to the Grove gate
  return c;
}

// Slow pools of sunlight and a few shafts falling from the canopy.
function drawDappledLight(ctx, t) {
  ctx.save();
  // shafts of light from the upper left
  for (let i = 0; i < 3; i++) {
    const sx = 180 + i * 420 + Math.sin(t * 0.2 + i) * 30;
    const shaft = ctx.createLinearGradient(sx, 0, sx + 160, 620);
    shaft.addColorStop(0, "rgba(255,246,200,.10)");
    shaft.addColorStop(1, "rgba(255,246,200,0)");
    ctx.fillStyle = shaft;
    ctx.beginPath();
    ctx.moveTo(sx, 0); ctx.lineTo(sx + 90, 0); ctx.lineTo(sx + 250, 620); ctx.lineTo(sx + 130, 620);
    ctx.closePath(); ctx.fill();
  }
  // drifting pools of light and shade on the grass
  for (let i = 0; i < 9; i++) {
    const x = (i * 211 + Math.sin(t * 0.15 + i) * 60) % VIL.w;
    const y = (i * 149 + Math.cos(t * 0.12 + i * 2) * 40) % VIL.h;
    const r = 90 + (i % 3) * 30;
    const pool = ctx.createRadialGradient(x, y, 0, x, y, r);
    pool.addColorStop(0, `rgba(255,248,210,${0.06 + 0.02 * Math.sin(t + i)})`);
    pool.addColorStop(1, "rgba(255,248,210,0)");
    ctx.fillStyle = pool;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  ctx.restore();
}

function drawVillage(ctx, cam, t) {
  const w = cam.vw, h = cam.vh;
  // sky/ground gradient
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#1c3350");
  g.addColorStop(0.55, "#2e5246");
  g.addColorStop(1, "#3f6b44");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.translate(-cam.x, -cam.y);

  // painted ground (grass, flowers, cobbled path), built once and reused
  const va = ctx.getTransform().a;
  if (!VIL_TEX || VIL_A !== va) { VIL_TEX = buildVillageTexture(va); VIL_A = va; }
  blitSprite(ctx, VIL_TEX, 0, 0, 0, 0);

  // dappled light through the canopy
  drawDappledLight(ctx, t);

  drawGrassTufts(ctx, cam, t);
  drawWillow(ctx, t);

  // everything that stands up is drawn back to front, so critters walk behind trees and huts
  const stand = [];
  const add = (y, fn) => stand.push({ y, fn });
  add(300 + 50, () => drawHut(ctx, 260, 300, "#7a5636", "Kitchen"));
  add(300 + 50, () => drawHut(ctx, 1080, 300, "#6a4a58", "Workshop"));
  add(560 + 50, () => drawHut(ctx, 300, 560, "#5a6b3a", "Library"));
  add(560 + 50, () => drawHut(ctx, 1040, 560, "#8b6a3a", "Herbalist"));
  add(250 + 50, () => drawHut(ctx, 1000, 250, "#4a4e5a", "Forge"));
  for (const sol of VIL_SOLIDS) {
    if (sol.w === 280) continue; // willow drawn separately
    const r = Math.max(sol.w, sol.h) / 2, cx = sol.x + sol.w / 2, cy = sol.y + sol.h / 2;
    add(cy + r * 0.7, () => drawTree(ctx, cx, cy, r));
  }
  add(290 + 40, () => drawCarnivalTent(ctx, 480, 290, t));
  if (peddlerHere()) add(800, () => drawPeddlerCart(ctx, 1130, 800, t));
  add(690, () => drawShrine(ctx, 700, 690));
  add(590, () => drawWishingWell(ctx, 610, 590, t));
  add(380, () => drawNoticeBoard(ctx, 410, 380, t));
  add(470, () => drawScarecrow(ctx, 900, 470, t));
  add(628, () => drawLampPost(ctx, 790, 628, t));
  add(690, () => drawLampPost(ctx, 1010, 690, t));
  add(330, () => drawLighthouse(ctx, 1230, 330, t));
  add(P.y + 14, () => {
    drawCritter(ctx, P.x, P.y, G.species, P.facing, P.moving ? P.t : 0, 1);
    if (G.activePet) drawPetSprite(ctx, P.x - P.facing * 26, P.y + 8, G.activePet, t);
  });
  add(650 + 22, () => drawNpc(ctx, 300, 650, "#c98a4a", "owl", "Thistlemoon"));
  add(655 + 22, () => drawNpc(ctx, 1060, 655, "#e2b7a0", "mouse", "Posy"));
  add(345 + 22, () => drawNpc(ctx, 930, 345, "#4a4a52", "badger", "Brindle"));
  add(430 + 22, () => drawNpc(ctx, 1180, 430, "#6e4f3f", "mole", "Nubbins"));

  // ground-level things go first
  drawFlowerBed(ctx, 980, 440, t);
  drawFlowerBed(ctx, 250, 790, t);

  // gather nodes
  for (const n of WORLD.nodes) {
    if (!n.alive) continue;
    drawNodeSprite(ctx, n.x, n.y - 2, DATA.items[n.item] ? DATA.items[n.item].color : "#ffffff");
  }

  // gate & points
  drawGate(ctx, 700, 820, "Fernwood Path", "#9fd7ff");
  drawGate(ctx, 130, 830, "Bramblewild", willowOwned("vitality") ? "#e6c86a" : "#7a2f3a");
  drawGate(ctx, 1260, 720, "Sunken Hollows", willowOwned("wisdom") ? "#7fe0d0" : "#3a4a48", gateSub("hollows"));
  drawGate(ctx, 1330, 560, "Hollowroot Catacombs", flag("catacombsOpen") ? "#c9a0ff" : "#3a3048", gateSub("catacombs"));
  drawGate(ctx, 430, 840, "Whispering Marsh", gateLock("marsh") ? "#3a4a3a" : "#8fd0a0", gateSub("marsh"));
  drawGate(ctx, 980, 840, "Frostfallen Grove", gateLock("grove") ? "#3a4a5a" : "#bfe6ff", gateSub("grove"));
  drawGate(ctx, 1340, 400, "The Ashen Glade", gateLock("ashen") ? "#4a3a30" : "#e0905a", gateSub("ashen"));
  drawPond(ctx, 480, 640, t);
  drawCreek(ctx, 150, 470, t);
  drawAcornStump(ctx, 330, 430, t);
  drawMoleHills(ctx, 560, 760, t);
  drawRingPitch(ctx, 840, 745, t);
  drawGate(ctx, 830, 120, "Starfall Meadow", gateLock("starfall") ? "#2a3566" : "#9fb8ff", gateSub("starfall"));
  drawGate(ctx, 100, 330, "Corrupted Heartwood", gateLock("heartwood") ? "#4a2a40" : "#c76fd6", gateSub("heartwood"));
  drawBuildings(ctx, t, add);
  stand.sort((p, q) => p.y - q.y).forEach(o => o.fn());


  // floating motes
  drawMotes(ctx, t, 700, 400, 150);

  ctx.restore();
}

function shadeHex(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const c = v => Math.max(0, Math.min(255, Math.round(v * f)));
  return `rgb(${c((n >> 16) & 255)},${c((n >> 8) & 255)},${c(n & 255)})`;
}

// The Great Willow: a flared trunk that forks into limbs, dark twigs fanning up into a broad dome of
// foliage, and long weeping strands that fall toward the grass. The layout is generated once, from a fixed seed.
let WILLOW_LAYOUT = null;
function willowLayout() {
  if (WILLOW_LAYOUT) return WILLOW_LAYOUT;
  let seed = 4242;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  // foliage clusters that make up the dome, back to front
  const canopy = [];
  for (let i = 0; i < 90; i++) {
    const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd());
    const c = { x: 700 + Math.cos(a) * 250 * d, y: 225 + Math.sin(a) * 130 * d, r: 30 + rnd() * 24, leaves: [] };
    for (let j = 0; j < 11; j++) {
      const la = rnd() * Math.PI * 2, lr = Math.sqrt(rnd()) * c.r * 0.9;
      c.leaves.push({ x: Math.cos(la) * lr, y: Math.sin(la) * lr * 0.7, ang: Math.PI / 2 + (rnd() - 0.5) * 1.1, len: 14 + rnd() * 9, tone: rnd() });
    }
    canopy.push(c);
  }
  canopy.sort((p, q) => p.y - q.y);

  // dark twigs fanning from the limb tips up into the foliage
  const tips = [[520, 190], [880, 190], [700, 120], [600, 140], [800, 140]];
  const twigs = [];
  for (const [tx, ty] of tips) {
    for (let i = 0; i < 7; i++) {
      const ex = tx + (rnd() - 0.5) * 230, ey = ty + 30 + rnd() * 130;
      twigs.push({ x0: tx, y0: ty, mx: (tx + ex) / 2 + (rnd() - 0.5) * 36, my: (ty + ey) / 2, x1: ex, y1: ey, w: 1.6 + rnd() * 2.4 });
    }
  }

  // weeping strands: long thin hangers around the dome, reaching down toward the grass
  const strands = [];
  for (let i = 0; i < 120; i++) {
    const a = (i / 120) * Math.PI * 2 + rnd() * 0.05;
    const sx = 700 + Math.cos(a) * 240, sy = 230 + Math.sin(a) * 125;
    if (Math.sin(a) > 0 && Math.abs(Math.cos(a)) < 0.25) continue; // keep the hollow clear
    const len = Math.max(90, Math.min(470 - sy - rnd() * 30, 110 + rnd() * 250));
    const st = { sx, sy, len, out: Math.cos(a) * (40 + rnd() * 80), k: rnd(), ph: rnd() * 6, leaves: [] };
    for (let j = 0; j < 10; j++) st.leaves.push({ u: 0.15 + (j / 10) * 0.83, side: j % 2 ? 1 : -1, tone: rnd() });
    strands.push(st);
  }
  WILLOW_LAYOUT = { canopy, strands, twigs };
  return WILLOW_LAYOUT;
}

// ---------------- the Great Willow: painted once into cached layers, then only lightly animated ----------------
const WILLOW_BOX = { x: 350, y: 80, w: 700, h: 520 };
const WILLOW_GROUPS = 6;
let WILLOW_CACHE = {};

function willowPalette(restored) {
  return restored
    ? { bark0: "#2a1a10", bark1: "#68432a", bark2: "#b48c52", moss: "#5f9a3a", leaf0: "#1f5a2e", leaf1: "#5fb04a", blade: "#9ad45a", leaf2: "#f2f9a0", strand: "#8fd860", blossom: ["#ffd1e8", "#fff0f6", "#ffe29a"] }
    : { bark0: "#30261e", bark1: "#5a4636", bark2: "#8c7458", moss: "#6a8a48", leaf0: "#4a6434", leaf1: "#86a456", blade: "#b0c86c", leaf2: "#dcebb0", strand: "#b0c870", blossom: ["#e8dcc8", "#f4ecd8"] };
}

// Layers are painted at the exact art resolution (a = art pixels per world unit), with no line thinner than a pixel.
function willowLayer(a) {
  const B = WILLOW_BOX, c = document.createElement("canvas");
  c.width = Math.ceil(B.w * a); c.height = Math.ceil(B.h * a);
  const g = c.getContext("2d");
  g.setTransform(a, 0, 0, a, -B.x * a, -B.y * a);
  const lwd = Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype, "lineWidth");
  Object.defineProperty(g, "lineWidth", { get() { return lwd.get.call(this); }, set(v) { lwd.set.call(this, Math.max(v, 1 / a)); } });
  return { c, g };
}

function paintWillowBase(g, pal, restored) {
  const L = willowLayout();
  let seed = 977;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const SH = (hex, f) => shadeHex(hex, Math.max(0.5, Math.min(1.45, f)));

  // ground shadow under the whole tree
  const shade = g.createRadialGradient(700, 480, 20, 700, 480, 330);
  shade.addColorStop(0, "rgba(0,0,0,.45)"); shade.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = shade; g.beginPath(); g.ellipse(700, 480, 330, 78, 0, 0, Math.PI * 2); g.fill();

  // roots spreading into the grass, with moss on top
  g.lineCap = "round";
  for (let i = -5; i <= 5; i++) {
    const ex = 700 + i * 52, ey = 502 + Math.abs(i) * 3, sx = 700 + i * 22;
    g.strokeStyle = pal.bark0; g.lineWidth = 13 - Math.abs(i) * 0.6;
    g.beginPath(); g.moveTo(sx, 466); g.quadraticCurveTo(700 + i * 70, 488, ex, ey); g.stroke();
    g.strokeStyle = pal.bark1; g.lineWidth = 8 - Math.abs(i) * 0.4;
    g.beginPath(); g.moveTo(sx - 1, 465); g.quadraticCurveTo(700 + i * 70, 486, ex, ey - 1); g.stroke();
    g.strokeStyle = pal.bark2; g.lineWidth = 2.4;
    g.beginPath(); g.moveTo(sx - 3, 463); g.quadraticCurveTo(700 + i * 70, 483, ex - 2, ey - 3); g.stroke();
    if (i % 2 === 0) { g.strokeStyle = pal.moss; g.globalAlpha = 0.85; g.lineWidth = 5; g.beginPath(); g.moveTo(sx + 6, 470); g.quadraticCurveTo(700 + i * 70 + 4, 486, ex - 12, ey - 2); g.stroke(); g.globalAlpha = 1; }
  }
  g.lineCap = "butt";

  // trunk: flared base, lit from the left, with moss, ridges, knots and cracks
  const trunkPath = () => {
    g.beginPath();
    g.moveTo(580, 492);
    g.quadraticCurveTo(604, 480, 612, 440);
    g.bezierCurveTo(606, 390, 628, 330, 640, 280);
    g.lineTo(760, 280);
    g.bezierCurveTo(772, 330, 794, 390, 788, 440);
    g.quadraticCurveTo(796, 480, 820, 492);
    g.closePath();
  };
  const tg = g.createLinearGradient(606, 0, 794, 0);
  tg.addColorStop(0, pal.bark0); tg.addColorStop(0.3, pal.bark2); tg.addColorStop(0.55, pal.bark1); tg.addColorStop(0.85, pal.bark0); tg.addColorStop(1, "#140c08");
  trunkPath(); g.fillStyle = tg; g.fill();
  g.save(); trunkPath(); g.clip();
  for (let i = 0; i < 16; i++) {
    const x0 = 612 + i * 11;
    g.strokeStyle = i % 3 === 0 ? "rgba(255,230,180,.26)" : "rgba(26,14,6,.4)"; g.lineWidth = 1.6 + (i % 3);
    g.beginPath(); g.moveTo(x0, 490); g.bezierCurveTo(x0 - 8 + (i % 2) * 6, 410, x0 + 10, 340, x0 + 2 + (i % 3) * 3, 270); g.stroke();
  }
  g.strokeStyle = "rgba(20,10,4,.35)"; g.lineWidth = 1.2;
  for (let i = 0; i < 14; i++) { const y0 = 290 + i * 14; g.beginPath(); g.moveTo(612 + rnd() * 30, y0); g.lineTo(640 + rnd() * 110, y0 + rnd() * 6); g.stroke(); }
  // moss creeping up the shaded side and the base
  for (let i = 0; i < 26; i++) {
    const mx = 612 + rnd() * 60, my = 340 + rnd() * 150, mr = 6 + rnd() * 12;
    const mg = g.createRadialGradient(mx, my, 0, mx, my, mr);
    mg.addColorStop(0, pal.moss); mg.addColorStop(1, "rgba(95,154,58,0)");
    g.globalAlpha = 0.75; g.fillStyle = mg; g.beginPath(); g.arc(mx, my, mr, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1;
  }
  for (let i = 0; i < 10; i++) {
    const mx = 760 + rnd() * 40, my = 430 + rnd() * 60, mr = 5 + rnd() * 9;
    const mg = g.createRadialGradient(mx, my, 0, mx, my, mr);
    mg.addColorStop(0, pal.moss); mg.addColorStop(1, "rgba(95,154,58,0)");
    g.globalAlpha = 0.6; g.fillStyle = mg; g.beginPath(); g.arc(mx, my, mr, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1;
  }
  // knots
  for (const [kx, ky, kr] of [[655, 330, 9], [748, 372, 7], [640, 455, 6]]) {
    g.fillStyle = pal.bark0; g.beginPath(); g.ellipse(kx, ky, kr * 0.8, kr, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = pal.bark2; g.lineWidth = 1.4; g.beginPath(); g.ellipse(kx, ky, kr * 1.25, kr * 1.5, 0, 0, Math.PI * 2); g.stroke();
  }
  // sunlit rim down the left edge
  const rim = g.createLinearGradient(606, 0, 650, 0);
  rim.addColorStop(0, "rgba(255,232,170,.32)"); rim.addColorStop(1, "rgba(255,232,170,0)");
  g.fillStyle = rim; g.fillRect(600, 270, 60, 230);
  g.restore();

  // glowing glyphs carved into the bark once the Willow is restored
  if (restored) {
    g.strokeStyle = "rgba(255,226,140,.85)"; g.lineWidth = 1.8; g.lineCap = "round";
    for (const [gx, gy, gr] of [[668, 352, 7], [740, 330, 6], [726, 392, 5]]) {
      const gl = g.createRadialGradient(gx, gy, 0, gx, gy, gr * 3);
      gl.addColorStop(0, "rgba(255,226,140,.3)"); gl.addColorStop(1, "rgba(255,226,140,0)");
      g.fillStyle = gl; g.fillRect(gx - gr * 3, gy - gr * 3, gr * 6, gr * 6);
      g.beginPath();
      for (let a = 0; a < Math.PI * 3.4; a += 0.25) { const r = (a / (Math.PI * 3.4)) * gr; const px = gx + Math.cos(a) * r, py = gy + Math.sin(a) * r; a ? g.lineTo(px, py) : g.moveTo(px, py); }
      g.stroke();
    }
    g.lineCap = "butt";
  }

  // the hollow, with a mossy lip and warm light spilling out
  const hollow = g.createRadialGradient(700, 420, 4, 700, 420, 50);
  hollow.addColorStop(0, restored ? "rgba(255,214,140,.95)" : "rgba(100,44,80,.9)");
  hollow.addColorStop(0.6, restored ? "rgba(120,60,20,.9)" : "rgba(30,14,28,.95)");
  hollow.addColorStop(1, "rgba(8,5,3,1)");
  g.fillStyle = hollow; g.beginPath(); g.ellipse(700, 420, 34, 45, 0, 0, Math.PI * 2); g.fill();
  g.strokeStyle = pal.bark0; g.lineWidth = 5; g.stroke();
  g.strokeStyle = pal.moss; g.lineWidth = 3; g.beginPath(); g.ellipse(700, 420, 36, 47, 0, Math.PI * 1.05, Math.PI * 1.9); g.stroke();
  g.fillStyle = pal.bark1; g.beginPath(); g.ellipse(700, 466, 26, 7, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = "rgba(255,230,170,.25)"; g.beginPath(); g.ellipse(700, 464, 18, 3, 0, 0, Math.PI * 2); g.fill();
  if (restored) {
    const spill = g.createRadialGradient(700, 470, 2, 700, 470, 60);
    spill.addColorStop(0, "rgba(255,214,140,.38)"); spill.addColorStop(1, "rgba(255,214,140,0)");
    g.fillStyle = spill; g.fillRect(630, 440, 140, 70);
  }

  // glowing mushrooms and moss tufts around the roots
  for (const [mx, my, s2] of [[590, 504, 1], [622, 514, 0.8], [782, 512, 0.9], [816, 502, 1.1], [662, 520, 0.7]]) {
    g.fillStyle = "#efe2c6"; g.fillRect(mx - 1.6 * s2, my - 7 * s2, 3.2 * s2, 7 * s2);
    const gl = g.createRadialGradient(mx, my - 8 * s2, 0, mx, my - 8 * s2, 18 * s2);
    gl.addColorStop(0, "rgba(130,230,210,.3)"); gl.addColorStop(1, "rgba(130,230,210,0)");
    g.fillStyle = gl; g.fillRect(mx - 18 * s2, my - 26 * s2, 36 * s2, 36 * s2);
    g.fillStyle = restored ? "#7fe0d0" : "#8aa89a"; g.strokeStyle = "rgba(20,12,8,.5)"; g.lineWidth = 1;
    g.beginPath(); g.ellipse(mx, my - 8 * s2, 6 * s2, 4 * s2, 0, Math.PI, 0); g.fill(); g.stroke();
    g.fillStyle = "rgba(255,255,255,.55)"; g.beginPath(); g.arc(mx - 2 * s2, my - 10 * s2, 1 * s2, 0, Math.PI * 2); g.fill();
  }
  g.strokeStyle = pal.moss; g.lineWidth = 1.6; g.lineCap = "round";
  for (let i = 0; i < 18; i++) {
    const tx = 560 + rnd() * 280, ty = 498 + rnd() * 20;
    for (let b = -1; b <= 1; b++) { g.beginPath(); g.moveTo(tx + b * 2, ty); g.quadraticCurveTo(tx + b * 4, ty - 6, tx + b * 6, ty - 10 - rnd() * 3); g.stroke(); }
  }
  g.lineCap = "butt";

  // limbs: bark arms that split up into the canopy
  g.lineCap = "round";
  const limbs = [
    [660, 290, 520, 190, 600, 250], [740, 290, 880, 190, 800, 250],
    [700, 280, 700, 120, 640, 200], [680, 285, 600, 140, 620, 220], [720, 285, 800, 140, 780, 220],
  ];
  for (const [x0, y0, x1, y1, cx, cy] of limbs) {
    g.strokeStyle = pal.bark0; g.lineWidth = 21;
    g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(cx, cy, x1, y1); g.stroke();
    g.strokeStyle = pal.bark1; g.lineWidth = 12;
    g.beginPath(); g.moveTo(x0 - 2, y0 - 3); g.quadraticCurveTo(cx - 2, cy - 3, x1 - 2, y1 - 3); g.stroke();
    g.strokeStyle = pal.bark2; g.lineWidth = 3;
    g.beginPath(); g.moveTo(x0 - 5, y0 - 6); g.quadraticCurveTo(cx - 5, cy - 6, x1 - 5, y1 - 6); g.stroke();
  }
  for (const w of L.twigs) {
    g.strokeStyle = pal.bark0; g.lineWidth = w.w;
    g.beginPath(); g.moveTo(w.x0, w.y0); g.quadraticCurveTo(w.mx, w.my, w.x1, w.y1); g.stroke();
    g.strokeStyle = pal.bark2; g.lineWidth = Math.max(0.8, w.w * 0.35);
    g.beginPath(); g.moveTo(w.x0 - 0.8, w.y0 - 0.8); g.quadraticCurveTo(w.mx - 0.8, w.my - 0.8, w.x1 - 0.8, w.y1 - 0.8); g.stroke();
  }
  g.lineCap = "butt";

  // canopy: a dark mass for depth, then long narrow leaves, lit from the upper left
  const light = (x, y) => 1.2 - 0.34 * ((x - 440) / 520) - 0.26 * ((y - 130) / 230);
  for (const c of L.canopy) {
    const lf0 = light(c.x, c.y);
    g.fillStyle = SH(pal.leaf0, lf0 * 0.95);
    g.globalAlpha = 0.7;
    g.beginPath(); g.arc(c.x, c.y, c.r * 0.95, 0, Math.PI * 2); g.fill();
    g.globalAlpha = 1;
    for (const lf of c.leaves) {
      const lx = c.x + lf.x, ly = c.y + lf.y, ang = lf.ang, f = light(lx, ly);
      g.strokeStyle = pal.bark1; g.lineWidth = 0.8;
      g.beginPath(); g.moveTo(lx, ly); g.lineTo(lx + Math.cos(ang) * 2, ly + Math.sin(ang) * 2); g.stroke();
      const col = lf.tone < 0.4 ? pal.leaf1 : (lf.tone < 0.8 ? pal.blade : pal.leaf2);
      g.fillStyle = SH(col, f);
      g.beginPath();
      g.ellipse(lx + Math.cos(ang) * lf.len * 0.5, ly + Math.sin(ang) * lf.len * 0.5, lf.len, 2.1, ang, 0, Math.PI * 2);
      g.fill();
    }
  }
  // blossoms scattered through the foliage
  const nBloom = restored ? 70 : 12;
  for (let i = 0; i < nBloom; i++) {
    const c = L.canopy[Math.floor(rnd() * L.canopy.length)];
    const bx = c.x + (rnd() - 0.5) * c.r * 1.4, by = c.y + (rnd() - 0.2) * c.r;
    const col = pal.blossom[i % pal.blossom.length];
    g.fillStyle = col;
    for (let p = 0; p < 5; p++) { const a = p * Math.PI * 2 / 5 + i; g.beginPath(); g.arc(bx + Math.cos(a) * 2.6, by + Math.sin(a) * 2.6, 1.9, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = "#ffd75a"; g.beginPath(); g.arc(bx, by, 1.4, 0, Math.PI * 2); g.fill();
  }
  // sunlight pooling on the upper left of the dome
  const sun = g.createRadialGradient(560, 170, 10, 560, 170, 200);
  sun.addColorStop(0, restored ? "rgba(255,244,170,.3)" : "rgba(255,244,190,.14)"); sun.addColorStop(1, "rgba(255,244,170,0)");
  g.fillStyle = sun; g.beginPath(); g.ellipse(560, 170, 200, 120, -0.2, 0, Math.PI * 2); g.fill();
}

function paintWillowStrands(g, pal, restored, grp) {
  let seed = 31 + grp * 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const L = willowLayout();
  g.lineCap = "round";
  L.strands.forEach((s, idx) => {
    if (idx % WILLOW_GROUPS !== grp) return;
    const ex = s.sx + s.out, ey = s.sy + s.len, cx = s.sx + s.out * 0.2, cy = s.sy + s.len * 0.55;
    const fade = 0.72 + s.k * 0.3;
    g.strokeStyle = shadeHex(pal.strand, fade); g.lineWidth = 1.3;
    g.beginPath(); g.moveTo(s.sx, s.sy); g.quadraticCurveTo(cx, cy, ex, ey); g.stroke();
    for (const lf of s.leaves) {
      const u = lf.u;
      const px = (1 - u) * (1 - u) * s.sx + 2 * (1 - u) * u * cx + u * u * ex;
      const py = (1 - u) * (1 - u) * s.sy + 2 * (1 - u) * u * cy + u * u * ey;
      const tx = 2 * (1 - u) * (cx - s.sx) + 2 * u * (ex - cx), ty = 2 * (1 - u) * (cy - s.sy) + 2 * u * (ey - cy);
      const ang = Math.atan2(ty, tx) + lf.side * 0.7;
      const tipLight = 1.12 - u * 0.32;
      g.fillStyle = shadeHex(lf.tone < 0.5 ? pal.blade : pal.leaf1, tipLight);
      g.beginPath(); g.ellipse(px + Math.cos(ang) * 4.6, py + Math.sin(ang) * 4.6, 8.5, 1.7, ang, 0, Math.PI * 2); g.fill();
    }
    // a few strands carry a tiny blossom or a glowing bead near the tip
    if (restored && rnd() < 0.22) {
      g.fillStyle = pal.blossom[Math.floor(rnd() * pal.blossom.length)];
      g.beginPath(); g.arc(ex, ey, 2.6, 0, Math.PI * 2); g.fill();
    } else if (restored && rnd() < 0.1) {
      const gl = g.createRadialGradient(ex, ey, 0, ex, ey, 8);
      gl.addColorStop(0, "rgba(255,226,140,.7)"); gl.addColorStop(1, "rgba(255,226,140,0)");
      g.fillStyle = gl; g.fillRect(ex - 8, ey - 8, 16, 16);
      g.fillStyle = "#ffe08a"; g.beginPath(); g.arc(ex, ey, 1.9, 0, Math.PI * 2); g.fill();
    }
  });
  g.lineCap = "butt";
}

function willowCache(restored, a) {
  const key = restored + "|" + a.toFixed(3);
  if (WILLOW_CACHE[key]) return WILLOW_CACHE[key];
  WILLOW_CACHE = {};
  const pal = willowPalette(restored);
  const base = willowLayer(a);
  paintWillowBase(base.g, pal, restored);
  const groups = [];
  for (let k = 0; k < WILLOW_GROUPS; k++) { const l = willowLayer(a); paintWillowStrands(l.g, pal, restored, k); groups.push(l.c); }
  WILLOW_CACHE[key] = { base: base.c, groups };
  return WILLOW_CACHE[key];
}
// warm the cache once the page is up, so the first look at the village does not stall

function drawWillow(ctx, t) {
  const restored = willowOwned("vitality") ? 1 : 0;
  const wa = ctx.getTransform().a, cache = willowCache(restored, wa), B = WILLOW_BOX;

  // aura behind the tree
  if (restored) {
    const aura = ctx.createRadialGradient(700, 330, 80, 700, 330, 380);
    aura.addColorStop(0, `rgba(170,255,200,${0.22 + 0.06 * Math.sin(t * 1.5)})`);
    aura.addColorStop(1, "rgba(170,255,200,0)");
    ctx.fillStyle = aura;
    ctx.beginPath(); ctx.arc(700, 330, 380, 0, Math.PI * 2); ctx.fill();
  }
  blitSprite(ctx, cache.base, B.x, B.y, 0, 0);

  // the weeping strands sway as six bands, each leaning a little differently
  // the sway is whole-pixel shifts of thin horizontal strips, so the strands stay crisp
  const M = ctx.getTransform(), ox = Math.round(M.a * B.x + M.c * B.y + M.e), oy = Math.round(M.b * B.x + M.d * B.y + M.f);
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = false;
  const strip = 3;
  for (let k = 0; k < cache.groups.length; k++) {
    const lean = Math.sin(t * 1.05 + k * 1.1) * 0.032 + Math.sin(t * 0.55 + k * 2.3) * 0.012, src = cache.groups[k];
    for (let sy = 0; sy < src.height; sy += strip) {
      const wy = B.y + sy / wa, shift = Math.round(lean * (wy - 230) * wa);
      ctx.drawImage(src, 0, sy, src.width, strip, ox + shift, oy + sy, src.width, strip);
    }
  }
  ctx.restore();

  // slow shafts of light through the leaves
  for (let i = 0; i < 3; i++) {
    const x0 = 560 + i * 120 + Math.sin(t * 0.3 + i) * 14, a = (0.05 + 0.025 * Math.sin(t * 0.8 + i * 2)) * (restored ? 1.4 : 0.8);
    const lg = ctx.createLinearGradient(0, 250, 0, 500);
    lg.addColorStop(0, `rgba(255,240,170,${a})`); lg.addColorStop(1, "rgba(255,240,170,0)");
    ctx.fillStyle = lg;
    ctx.beginPath(); ctx.moveTo(x0, 250); ctx.lineTo(x0 + 34, 250); ctx.lineTo(x0 + 70, 500); ctx.lineTo(x0 + 8, 500); ctx.closePath(); ctx.fill();
  }

  // twinkles in the canopy and drifting leaves or petals
  for (let i = 0; i < 12; i++) {
    const a = 0.5 + 0.5 * Math.sin(t * 2.2 + i * 1.9);
    const sx = 470 + (i * 97) % 460, sy = 140 + (i * 61) % 150;
    ctx.fillStyle = `rgba(255,252,200,${0.55 * a * a})`;
    ctx.fillRect(sx - 1, sy - 1, 2.4, 2.4);
  }
  const fall = restored ? 9 : 3;
  for (let i = 0; i < fall; i++) {
    const k = (t * 0.07 + i / fall) % 1;
    const fx = 520 + (i * 53) % 360 + Math.sin(t * 0.9 + i) * 20, fy = 240 + k * 270;
    ctx.fillStyle = restored && i % 2 ? `rgba(255,214,232,${0.85 * (1 - k)})` : `rgba(200,255,190,${0.8 * (1 - k)})`;
    ctx.beginPath(); ctx.ellipse(fx, fy, 5, 2, t + i, 0, Math.PI * 2); ctx.fill();
  }

  // name plate, so the label stays readable over the leaves
  ctx.font = "15px Georgia";
  ctx.textAlign = "center";
  const label = "The Great Willow";
  const lw = ctx.measureText(label).width + 16;
  ctx.fillStyle = "rgba(20,26,18,.6)";
  ctx.fillRect(700 - lw / 2, 160, lw, 26);
  ctx.fillStyle = "#fff6dc";
  ctx.fillText(label, 700, 179);
}

// Deepest floor reached in a depth region, as a short gate subtitle
function gateSub(id) {
  if (gateLock(id)) return DATA.gates[id].short;
  const r = DATA.regions[id];
  if (!r || !r.depth) return "";
  let best = 0;
  for (let d = 1; d <= r.maxDepth; d++) if (flag(`depth_${id}_${d}`)) best = d;
  if (!best && G.visitedRegions[id]) best = 1;
  return best ? `Deepest: ${best}/${r.maxDepth}` : "Unexplored";
}

// Body plans. Everyone is drawn in profile facing right (mirrored by facing); the owl faces front.
// bx/by/brx/bry: body ellipse. hx/hy/hr: head. sn: snout length, sr: snout half height.
// fx: leg x positions [near front, far front, near back, far back], null to skip a leg.
const ANIMAL_BUILD = {
  fox:      { bx: -1, by: -1.8, brx: 13,  bry: 6.6, hx: 11.5, hy: -8.5, hr: 6.2, sn: 7.5, sr: 2.6, ear: "tall",  tail: "bush",  fx: [7, 4, -8, -11], lw: 1.7, sock: true, whisk: true },
  rabbit:   { bx: -1, by: 0, brx: 10,   bry: 7,   hx: 10, hy: -6.5,   hr: 5.2, sn: 3,   sr: 2.4, ear: "long",  tail: "pom",   fx: [7, 4, -6, -9],  lw: 2,   haunch: true, bigFoot: true, whisk: true },
  mouse:    { bx: -1, by: 2,   brx: 8.5,  bry: 5.2, hx: 9,  hy: -1,   hr: 4.4, sn: 6.5, sr: 1.8, ear: "round", er: 4.4, tail: "thin", fx: [5, 3, -5, -7], lw: 1.3, whisk: true },
  squirrel: { bx: -2, by: -1,  brx: 7.5,  bry: 9,   hx: 5,  hy: -12,  hr: 5,   sn: 3.2, sr: 2.2, ear: "tuft",  tail: "fluff", fx: [null, null, -2, -6], lw: 1.8, bigFoot: true, upright: true, whisk: true },
  hedgehog: { bx: -1, by: 1.5, brx: 13,   bry: 8.5, hx: 12, hy: 3,    hr: 4.6, sn: 6,   sr: 1.9, ear: "small", tail: "stub",  fx: [6, 3, -6, -9],  lw: 1.6, spikes: true },
  badger:   { bx: -1, by: 1.5, brx: 14,   bry: 7,   hx: 13, hy: -1.5, hr: 6,   sn: 6,   sr: 2.5, ear: "round", er: 2.8, tail: "stub", fx: [8, 5, -8, -11], lw: 2.5, stripe: true, claws: true },
  mole:     { bx: 0,  by: 2.5, brx: 11.5, bry: 8,   hx: 11, hy: 1,    hr: 5,   sn: 4,   sr: 2,   ear: "none",  tail: "none",  fx: [null, 3, -6, -9], lw: 2.2, paws: true },
};

function drawMotes(ctx, t, cx, cy, spread) {
  // fireflies: soft halo plus a bright core that pulses on its own rhythm
  for (let i = 0; i < 16; i++) {
    const a = t * 0.5 + i * 1.7;
    const x = cx + Math.cos(a * 1.1) * spread * (0.3 + (i % 5) * 0.15);
    const y = cy + Math.sin(a * 0.9) * 80 + ((i * 47) % 120) - 60;
    const p = 0.5 + 0.5 * Math.sin(t * 3 + i);
    const halo = ctx.createRadialGradient(x, y, 0, x, y, 9);
    halo.addColorStop(0, `rgba(220,255,140,${0.4 * p})`);
    halo.addColorStop(1, "rgba(220,255,140,0)");
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = `rgba(255,255,205,${0.5 + 0.5 * p})`;
    ctx.beginPath(); ctx.arc(x, y, 1.8, 0, Math.PI * 2); ctx.fill();
  }
}

function openShrine() {
  if (!willowOwned("spiritbond")) {
    openDialogue("Spirit Shrine", "A cold stone with an empty hollow. Something here waits to be bonded to the Willow. Awaken Spirit Bond first.", []);
    return;
  }
  if (G.flags.blessingPending) {
    openDialogue("Spirit Shrine", "The spirits already hold an offering. Go and use the blessing first.", []);
    return;
  }
  const choices = DATA.blessings
    .filter(b => hasItem(b.item))
    .map(b => ({
      label: `Offer ${DATA.items[b.item].name}: ${b.name}`,
      fn: () => {
        takeItem(b.item, 1);
        G.flags.blessingPending = b.id;
        G.wl += 1;
        toast(`The spirits accept. ${b.name} will walk with you on your next expedition.`);
        saveGame();
      },
    }));
  choices.push({ label: "Leave it", fn: () => {} });
  const text = choices.length > 1
    ? "The shrine hums and waits. Offer something a spirit would want, and it will lend its strength to your next journey."
    : "The shrine hums and waits. You have nothing it wants right now.";
  openDialogue("Spirit Shrine", text, choices);
}

// Relationship event choices: friendship, Willowlight, and items.
function applyEventChoice(npcId, ch) {
  G.relations[npcId] = (G.relations[npcId] || 0) + (ch.rel || 0);
  if (ch.wl) addWillowlight(ch.wl);
  for (const [item, n] of Object.entries(ch.items || {})) addItem(item, n);
  if (ch.note) toast(ch.note, 4500);
}
