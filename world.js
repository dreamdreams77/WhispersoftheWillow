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
    else startFireflyCatch();
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

function drawPetSprite(ctx, x, y, id, t) {
  const pet = DATA.pets[id];
  if (!pet) return;
  const bob = Math.sin(t * 4) * 1.5;
  ctx.fillStyle = "rgba(0,0,0,.25)";
  ctx.beginPath(); ctx.ellipse(x, y + 9, 6, 2.5, 0, 0, Math.PI * 2); ctx.fill();
  if (id === "mothling") {
    const halo = ctx.createRadialGradient(x, y + bob, 1, x, y + bob, 12);
    halo.addColorStop(0, "rgba(207,232,255,.5)");
    halo.addColorStop(1, "rgba(207,232,255,0)");
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(x, y + bob, 12, 0, Math.PI * 2); ctx.fill();
  }
  if (id === "cinderkit") {
    const glow = ctx.createRadialGradient(x, y + bob, 1, x, y + bob, 13);
    glow.addColorStop(0, "rgba(255,160,80,.45)");
    glow.addColorStop(1, "rgba(255,160,80,0)");
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(x, y + bob, 13, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = pet.color;
  ctx.beginPath(); ctx.arc(x, y + bob, 5.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#1e140c";
  ctx.beginPath(); ctx.arc(x - 2, y - 1 + bob, 1, 0, Math.PI * 2); ctx.arc(x + 2, y - 1 + bob, 1, 0, Math.PI * 2); ctx.fill();
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

let VIL_TEX = null;
function buildVillageTexture() {
  const c = document.createElement("canvas");
  c.width = VIL.w; c.height = VIL.h;
  const g = c.getContext("2d");
  let seed = 1337;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  // base: sky-tinted gradient, then soft mottling of light and dark grass
  const base = g.createLinearGradient(0, 0, 0, VIL.h);
  base.addColorStop(0, "#3a5e3e");
  base.addColorStop(0.6, "#41703f");
  base.addColorStop(1, "#33593a");
  g.fillStyle = base;
  g.fillRect(0, 0, VIL.w, VIL.h);
  for (let i = 0; i < 260; i++) {
    const x = rnd() * VIL.w, y = rnd() * VIL.h, r = 40 + rnd() * 90;
    const grd = g.createRadialGradient(x, y, 0, x, y, r);
    const light = rnd() < 0.45;
    grd.addColorStop(0, light ? "rgba(150,196,100,.16)" : "rgba(20,44,28,.18)");
    grd.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grd;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }

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
  if (!VIL_TEX) VIL_TEX = buildVillageTexture();
  ctx.drawImage(VIL_TEX, 0, 0);

  // dappled light through the canopy
  drawDappledLight(ctx, t);

  // buildings
  drawHut(ctx, 260, 300, "#7a5636", "Kitchen");
  drawHut(ctx, 1080, 300, "#6a4a58", "Workshop");
  drawHut(ctx, 300, 560, "#5a6b3a", "Library");
  drawHut(ctx, 1040, 560, "#8b6a3a", "Herbalist");
  drawHut(ctx, 1000, 250, "#4a4e5a", "Forge");

  // decor trees
  for (const s of VIL_SOLIDS) {
    if (s.w === 280) continue; // willow drawn separately
    drawTree(ctx, s.x + s.w / 2, s.y + s.h / 2, Math.max(s.w, s.h) / 2);
  }

  drawWillow(ctx, t);
  drawCarnivalTent(ctx, 480, 290, t);
  if (peddlerHere()) drawPeddlerCart(ctx, 1130, 800, t);

  // gather nodes
  for (const n of WORLD.nodes) {
    if (!n.alive) continue;
    const color = DATA.items[n.item] ? DATA.items[n.item].color : "#fff";
    ctx.fillStyle = "#2a4a24";
    ctx.beginPath(); ctx.ellipse(n.x, n.y + 6, 16, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(n.x, n.y - 4, 8, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.4)";
    ctx.stroke();
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
  drawShrine(ctx, 700, 690);

  // village life: the well, the notice board, flower beds and a scarecrow
  drawWishingWell(ctx, 610, 590, t);
  drawNoticeBoard(ctx, 410, 380, t);
  drawFlowerBed(ctx, 980, 440, t);
  drawFlowerBed(ctx, 250, 790, t);
  drawScarecrow(ctx, 900, 470, t);
  drawLampPost(ctx, 790, 628, t);
  drawLampPost(ctx, 1010, 690, t);
  drawLighthouse(ctx, 1230, 330, t);

  // player
  drawCritter(ctx, P.x, P.y, G.species, P.facing, P.moving ? P.t : 0, 1);
  if (G.activePet) drawPetSprite(ctx, P.x - P.facing * 26, P.y + 8, G.activePet, t);

  // NPCs
  drawNpc(ctx, 300, 650, "#c98a4a", "owl", "Thistlemoon");
  drawNpc(ctx, 1060, 655, "#e2b7a0", "mouse", "Posy");
  drawNpc(ctx, 930, 345, "#4a4a52", "badger", "Brindle");
  drawNpc(ctx, 1180, 430, "#6e4f3f", "mole", "Nubbins");

  // floating motes
  drawMotes(ctx, t, 700, 400, 150);

  ctx.restore();
}

function shadeHex(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const c = v => Math.max(0, Math.min(255, Math.round(v * f)));
  return `rgb(${c((n >> 16) & 255)},${c((n >> 8) & 255)},${c(n & 255)})`;
}

function drawTree(ctx, x, y, r) {
  // trunk and ground shadow
  ctx.fillStyle = "rgba(0,0,0,.25)";
  ctx.beginPath(); ctx.ellipse(x + 6, y + r * 0.7, r * 0.9, r * 0.35, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#4a3122";
  ctx.fillRect(x - 6, y + r * 0.1, 12, r * 0.7);
  // layered canopy: dark base, mid, then a lit crown offset toward the light
  const layers = [
    { dx: 0, dy: 0, k: 1.0, c: "#22391f" },
    { dx: -r * 0.2, dy: -r * 0.12, k: 0.78, c: "#2f4f2a" },
    { dx: r * 0.12, dy: -r * 0.28, k: 0.52, c: "#4a7a3b" },
  ];
  for (const L of layers) {
    const g = ctx.createRadialGradient(x + L.dx - r * 0.2, y + L.dy - r * 0.2, 2, x + L.dx, y + L.dy, r * L.k);
    g.addColorStop(0, shadeHex(L.c, 1.25));
    g.addColorStop(1, L.c);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x + L.dx, y + L.dy, r * L.k, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(8,18,8,.38)"; ctx.lineWidth = 1.5; ctx.stroke();
  }
  // soft shade on the lower-right of the crown
  const crownShade = ctx.createRadialGradient(x + r * 0.35, y + r * 0.4, r * 0.2, x + r * 0.2, y + r * 0.1, r * 1.05);
  crownShade.addColorStop(0, "rgba(0,0,0,0)");
  crownShade.addColorStop(1, "rgba(0,12,0,.28)");
  ctx.fillStyle = crownShade;
  ctx.beginPath(); ctx.arc(x, y, r * 1.0, 0, Math.PI * 2); ctx.fill();
  // a few lit leaves
  ctx.fillStyle = "rgba(180,230,140,.35)";
  for (let i = 0; i < 6; i++) {
    const a = i * 1.1 + x * 0.01;
    ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * r * 0.4 - r * 0.1, y - r * 0.35 + Math.sin(a) * r * 0.25, 4, 2, a, 0, Math.PI * 2); ctx.fill();
  }
}

function drawHut(ctx, x, y, color, name) {
  const t = WORLD.time;
  // ground shadow
  ctx.fillStyle = "rgba(0,0,0,.28)";
  ctx.beginPath(); ctx.ellipse(x + 6, y + 56, 60, 15, 0, 0, Math.PI * 2); ctx.fill();
  // walls with a light-to-shadow falloff
  const wall = ctx.createLinearGradient(x - 46, y, x + 46, y + 44);
  wall.addColorStop(0, shadeHex(color, 1.2));
  wall.addColorStop(1, shadeHex(color, 0.65));
  ctx.fillStyle = wall;
  ctx.beginPath(); ctx.ellipse(x, y + 24, 46, 32, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "rgba(20,12,4,.45)"; ctx.lineWidth = 1.5; ctx.stroke();
  // timber ribs
  ctx.strokeStyle = "rgba(0,0,0,.18)"; ctx.lineWidth = 2;
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath(); ctx.moveTo(x + i * 16, y + 4); ctx.lineTo(x + i * 18, y + 46); ctx.stroke();
  }
  // thatched dome roof
  const roof = ctx.createRadialGradient(x - 14, y - 18, 6, x, y - 4, 60);
  roof.addColorStop(0, "#e3c07a");
  roof.addColorStop(1, "#7a5629");
  ctx.fillStyle = roof;
  ctx.beginPath(); ctx.ellipse(x, y + 8, 54, 40, 0, Math.PI, Math.PI * 2); ctx.lineTo(x + 54, y + 12); ctx.lineTo(x - 54, y + 12); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "rgba(60,36,12,.35)"; ctx.lineWidth = 1.5;
  for (let i = 1; i <= 4; i++) {
    const r = 54 * (i / 5);
    ctx.beginPath(); ctx.ellipse(x, y + 8, r, 40 * (i / 5), 0, Math.PI, Math.PI * 2); ctx.stroke();
  }
  // round window and warm door glow
  const pulse = 0.65 + 0.35 * Math.sin(t * 2 + x * 0.01);
  const glow = ctx.createRadialGradient(x, y + 30, 2, x, y + 30, 44);
  glow.addColorStop(0, `rgba(255,214,130,${0.5 * pulse})`);
  glow.addColorStop(1, "rgba(255,214,130,0)");
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(x, y + 30, 44, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#2a1b10";
  ctx.beginPath(); ctx.moveTo(x - 8, y + 44); ctx.lineTo(x - 8, y + 26); ctx.arc(x, y + 26, 8, Math.PI, 0); ctx.lineTo(x + 8, y + 44); ctx.closePath(); ctx.fill();
  ctx.fillStyle = `rgba(255,220,140,${0.7 * pulse})`;
  ctx.beginPath(); ctx.arc(x, y + 14, 4, 0, Math.PI * 2); ctx.fill();
  // chimney smoke
  for (let i = 0; i < 3; i++) {
    const k = ((t * 0.25 + i / 3) % 1);
    ctx.fillStyle = `rgba(230,225,215,${0.35 * (1 - k)})`;
    ctx.beginPath(); ctx.arc(x + 28 + k * 10, y - 26 - k * 46, 5 + k * 8, 0, Math.PI * 2); ctx.fill();
  }
  // name plate
  ctx.font = "13px Georgia";
  ctx.textAlign = "center";
  const w = ctx.measureText(name).width + 14;
  ctx.fillStyle = "rgba(20,26,18,.6)";
  ctx.fillRect(x - w / 2, y - 52, w, 20);
  ctx.fillStyle = "#fff6dc";
  ctx.fillText(name, x, y - 37);
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
const WILLOW_BOX = { x: 350, y: 80, w: 700, h: 520, s: 1.5 };
const WILLOW_GROUPS = 6;
let WILLOW_CACHE = {};

function willowPalette(restored) {
  return restored
    ? { bark0: "#2a1a10", bark1: "#68432a", bark2: "#b48c52", moss: "#5f9a3a", leaf0: "#1f5a2e", leaf1: "#5fb04a", blade: "#9ad45a", leaf2: "#f2f9a0", strand: "#8fd860", blossom: ["#ffd1e8", "#fff0f6", "#ffe29a"] }
    : { bark0: "#30261e", bark1: "#5a4636", bark2: "#8c7458", moss: "#6a8a48", leaf0: "#4a6434", leaf1: "#86a456", blade: "#b0c86c", leaf2: "#dcebb0", strand: "#b0c870", blossom: ["#e8dcc8", "#f4ecd8"] };
}

function willowLayer() {
  const B = WILLOW_BOX, c = document.createElement("canvas");
  c.width = Math.ceil(B.w * B.s); c.height = Math.ceil(B.h * B.s);
  const g = c.getContext("2d");
  g.setTransform(B.s, 0, 0, B.s, -B.x * B.s, -B.y * B.s);
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

function willowCache(restored) {
  if (WILLOW_CACHE[restored]) return WILLOW_CACHE[restored];
  const pal = willowPalette(restored);
  const base = willowLayer();
  paintWillowBase(base.g, pal, restored);
  const groups = [];
  for (let k = 0; k < WILLOW_GROUPS; k++) { const l = willowLayer(); paintWillowStrands(l.g, pal, restored, k); groups.push(l.c); }
  WILLOW_CACHE[restored] = { base: base.c, groups };
  return WILLOW_CACHE[restored];
}
// warm the cache once the page is up, so the first look at the village does not stall
setTimeout(() => { try { willowCache(0); } catch (e) { /* drawn on demand instead */ } }, 30);

function drawWillow(ctx, t) {
  const restored = willowOwned("vitality") ? 1 : 0;
  const cache = willowCache(restored), B = WILLOW_BOX;

  // aura behind the tree
  if (restored) {
    const aura = ctx.createRadialGradient(700, 330, 80, 700, 330, 380);
    aura.addColorStop(0, `rgba(170,255,200,${0.22 + 0.06 * Math.sin(t * 1.5)})`);
    aura.addColorStop(1, "rgba(170,255,200,0)");
    ctx.fillStyle = aura;
    ctx.beginPath(); ctx.arc(700, 330, 380, 0, Math.PI * 2); ctx.fill();
  }
  ctx.drawImage(cache.base, B.x, B.y, B.w, B.h);

  // the weeping strands sway as six bands, each leaning a little differently
  for (let k = 0; k < cache.groups.length; k++) {
    const lean = Math.sin(t * 1.05 + k * 1.1) * 0.032 + Math.sin(t * 0.55 + k * 2.3) * 0.012;
    ctx.save();
    ctx.translate(0, 230); ctx.transform(1, 0, lean, 1, 0, 0); ctx.translate(0, -230);
    ctx.drawImage(cache.groups[k], B.x, B.y, B.w, B.h);
    ctx.restore();
  }

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

// Gate arch with its label above it on a dark plate, so touch controls never cover it
function drawGate(ctx, x, y, name, color, sub) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(x, y, 34, Math.PI, 0); ctx.stroke();
  ctx.font = "13px Georgia";
  ctx.textAlign = "center";
  const lines = sub ? [name, sub] : [name];
  const w = Math.max(...lines.map(l => ctx.measureText(l).width)) + 16;
  const h = 18 * lines.length + 8;
  const top = y - 44 - h;
  ctx.fillStyle = "rgba(20,26,18,.7)";
  ctx.fillRect(x - w / 2, top, w, h);
  ctx.fillStyle = "#fff6dc";
  lines.forEach((l, i) => ctx.fillText(l, x, top + 18 + i * 18));
}

// Each animal has its own ears, snout, tail and markings, so they read as creatures at a glance.
const ANIMAL_STYLE = {
  fox:      { ear: "tall",  snout: "long",  tail: "bush",  tip: "#fff6e8", belly: "#fbe3c4" },
  rabbit:   { ear: "long",  snout: "short", tail: "pom",   tip: "#ffffff", belly: "#f4ebe0", inner: "#e8a9a8" },
  mouse:    { ear: "round", snout: "point", tail: "thin",  belly: "#dcd8e2", inner: "#f0a8b0" },
  squirrel: { ear: "round", snout: "short", tail: "fluff", belly: "#e7c9a0" },
  hedgehog: { ear: "small", snout: "point", tail: "stub",  belly: "#e8d8c0", spikes: true },
  badger:   { ear: "round", snout: "short", tail: "stub",  belly: "#cfcbcd", stripe: true },
  mole:     { ear: "none",  snout: "nose",  tail: "none",  belly: "#8a6a58", nose: "#e7a6a0" },
  owl:      { ear: "tufts", snout: "beak",  tail: "none",  belly: "#f1dcb8", front: true, bigEyes: true },
};

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

function acCapsule(c, x1, y1, x2, y2, r) {
  const a = Math.atan2(y2 - y1, x2 - x1);
  c.arc(x1, y1, r, a + Math.PI / 2, a + Math.PI * 1.5);
  c.arc(x2, y2, r, a - Math.PI / 2, a + Math.PI / 2);
  c.closePath();
}

// Draws one animal around its body centre (0,0). base is the body colour, facing is +1 or -1,
// B is the vertical bob, walk is the gait phase, and opts.blink closes the eyes.
function drawAnimalLocal(ctx, kind, base, facing, B, walk, opts) {
  opts = opts || {};
  if (kind === "owl") { drawOwlLocal(ctx, base, B, opts); return; }
  const st = ANIMAL_STYLE[kind] || ANIMAL_STYLE.fox;
  const bd = ANIMAL_BUILD[kind] || ANIMAL_BUILD.fox;
  const f = facing || 1;
  const T = opts.t != null ? opts.t : (typeof WORLD !== "undefined" ? WORLD.time : 0);
  const sway = Math.sin(T * 3.2 + base.length) * (walk ? 0.3 : 0.14);
  const breath = Math.sin(T * 2.4) * 0.35;
  const sniff = Math.sin(T * 1.3 + 0.5) * 0.45;
  const bx = bd.bx, by = bd.by + B, brx = bd.brx, bry = bd.bry + breath;
  const hx = bd.hx, hy = bd.hy + B + sniff, hr = bd.hr + 0.5;
  const OUT = "rgba(24,14,10,.66)";
  const dark = shadeHex(base, 0.55), far = shadeHex(base, 0.8), light = shadeHex(base, 1.25);
  const sock = bd.sock ? "#3a2418" : null;
  const ground = 11 + B;
  const gait = walk ? Math.sin(walk) * 2.4 : 0;
  const parts = [];
  const add = (p, fill) => parts.push({ p, fill });
  const ell = (x, y, rx, ry, rot) => c => c.ellipse(x, y, rx, ry, rot || 0, 0, Math.PI * 2);
  const dot = (x, y, r, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); };

  ctx.save();
  ctx.scale(f, 1);
  ctx.lineJoin = "round"; ctx.lineCap = "round";

  // a thin tail is a line, drawn first
  if (bd.tail === "thin") {
    const rx0 = bx - brx + 1, ry0 = by + 2;
    const tip = Math.sin(T * 2.2) * 2.5;
    for (const [col, w] of [[OUT, 3.2], ["#d9a6ae", 1.6]]) {
      ctx.strokeStyle = col; ctx.lineWidth = w;
      ctx.beginPath(); ctx.moveTo(rx0, ry0); ctx.bezierCurveTo(rx0 - 9, ry0 + 6, rx0 - 14, ry0 - 2 + tip, rx0 - 19, ry0 - 9 + tip); ctx.stroke();
    }
  }

  // legs: the far pair first, then the near pair, all tucked under the body
  const legTop = by + bry * 0.35;
  const legList = [
    { x: bd.fx[1], sw: -gait, col: far, back: false },
    { x: bd.fx[3], sw: gait, col: far, back: true },
    { x: bd.fx[0], sw: gait, col: base, back: false },
    { x: bd.fx[2], sw: -gait, col: base, back: true },
  ];
  for (const L of legList) {
    if (L.x == null) continue;
    const fxp = L.x + L.sw, lw = bd.lw + 0.4;
    add(c => acCapsule(c, L.x, legTop, fxp, ground - lw * 0.9, lw), L.col);
    const big = bd.bigFoot && L.back;
    add(ell(fxp + (big ? 2.4 : 1), ground - 1.4, lw + (big ? 3.8 : 1.6), 2.2), sock || L.col);
  }

  // tail
  const rump = { x: bx - brx * 0.85, y: by - (bd.upright ? -4 : 1) };
  if (bd.tail === "bush") {
    add(c => { c.save(); c.translate(rump.x, rump.y); c.rotate(-sway); c.moveTo(1, -3.5); c.quadraticCurveTo(-11, -13, -24, -4); c.quadraticCurveTo(-13, 5, 1, 3.5); c.closePath(); c.restore(); }, base);
  } else if (bd.tail === "fluff") {
    add(c => { c.save(); c.translate(rump.x, rump.y + 3); c.rotate(-sway * 0.6); c.scale(0.78, 0.78);
      c.moveTo(0, 0); c.bezierCurveTo(-14, 1, -18, -13, -9, -22); c.bezierCurveTo(-3, -29, 7, -25, 7, -18);
      c.bezierCurveTo(1, -18, -4, -10, 4, -3); c.closePath(); c.restore(); }, shadeHex(base, 1.08));
  } else if (bd.tail === "pom") {
    add(ell(rump.x - 3, rump.y - 1, 3.6, 3.4), st.tip || "#fff");
  } else if (bd.tail === "stub") {
    add(ell(rump.x - 1.5, rump.y + 1, 3, 2.4), base);
  }

  // hedgehog spikes, in two rows, behind the body
  if (bd.spikes) {
    const N = 15;
    for (let i = 0; i < N; i++) {
      const a = Math.PI * 0.9 + (i / (N - 1)) * Math.PI * 1.03;
      const cx = bx + Math.cos(a) * brx * 0.92, cy = by + Math.sin(a) * bry * 0.92;
      const tx = bx + Math.cos(a) * (brx + 5.5) - 2, ty = by + Math.sin(a) * (bry + 5.5);
      const px = -Math.sin(a) * 2.5, py = Math.cos(a) * 2.5;
      add(c => { c.moveTo(cx + px, cy + py); c.lineTo(tx, ty); c.lineTo(cx - px, cy - py); c.closePath(); }, i % 2 ? dark : shadeHex(base, 0.4));
    }
  }

  // body, haunch, neck
  const bodyG = ctx.createLinearGradient(0, by - bry, 0, by + bry);
  bodyG.addColorStop(0, light); bodyG.addColorStop(0.55, base); bodyG.addColorStop(1, shadeHex(base, 0.72));
  add(ell(bx, by, brx, bry), bodyG);
  if (bd.haunch) add(ell(bx - brx * 0.4, by + 0.5, brx * 0.66, bry * 1.08), bodyG);
  if (bd.upright) add(ell(bx - 1, by + 4, brx * 0.95, bry * 0.7), bodyG);
  const nx = bd.upright ? bx + 1 : bx + brx * 0.55, ny = bd.upright ? by - bry * 0.5 : by - bry * 0.25;
  add(c => acCapsule(c, nx, ny, hx - 1, hy + 1.5, bd.upright ? 4.2 : bry * 0.6), base);

  // ears (behind the head; the far one a little darker and further back)
  const twitch = Math.pow(Math.max(0, Math.sin(T * 0.8 + 1.3)), 10) * 0.5;
  const earAt = (dx, tw, col) => {
    const ex = hx - hr * 0.25 + dx, ey = hy - hr * 0.72;
    if (bd.ear === "tall") add(c => { c.save(); c.translate(ex, ey + 2); c.rotate(tw); c.moveTo(-3, 0); c.lineTo(-0.5, -11.5); c.lineTo(3.4, 0); c.closePath(); c.restore(); }, col);
    else if (bd.ear === "long") add(c => { c.save(); c.translate(ex, ey + 1); c.rotate(tw - 0.1); acCapsule(c, 0, 0, -3.5, -12.5, 2.5); c.restore(); }, col);
    else if (bd.ear === "round") add(ell(ex - 1, ey - 0.5, bd.er, bd.er), col);
    else if (bd.ear === "small") add(ell(ex - 1, ey + 0.5, 2.3, 2.5), col);
    else if (bd.ear === "tuft") add(c => { c.save(); c.translate(ex, ey + 2); c.rotate(tw * 0.5); c.moveTo(-2.6, 0); c.lineTo(-1.5, -8.5); c.lineTo(1, -4); c.lineTo(3, -7); c.lineTo(3.4, 0); c.closePath(); c.restore(); }, col);
  };
  if (bd.ear !== "none") { earAt(-3.4, -twitch, far); earAt(1.2, twitch, base); }

  // head and snout
  const headG = ctx.createRadialGradient(hx - 2, hy - 3, 1, hx, hy, hr + 3);
  headG.addColorStop(0, light); headG.addColorStop(1, shadeHex(base, 0.92));
  add(ell(hx, hy, hr, hr * 0.94), headG);
  const tipX = hx + hr + bd.sn, tipY = hy + hr * 0.3;
  const snoutPath = c => {
    c.moveTo(hx, hy - bd.sr * 1.3);
    c.quadraticCurveTo(hx + hr + bd.sn * 0.55, hy - bd.sr * 1.2, tipX, tipY - bd.sr * 0.2);
    c.quadraticCurveTo(tipX + 0.5, tipY + bd.sr * 0.9, tipX - 2, tipY + bd.sr * 1.1);
    c.quadraticCurveTo(hx + hr * 0.8, hy + hr * 0.95, hx, hy + hr * 0.8);
    c.closePath();
  };
  add(snoutPath, shadeHex(base, 1.06));

  // pass 1: one outline around the whole silhouette; pass 2: the colours
  ctx.strokeStyle = OUT; ctx.lineWidth = 2.3;
  for (const q of parts) { ctx.beginPath(); q.p(ctx); ctx.stroke(); }
  for (const q of parts) { ctx.fillStyle = q.fill; ctx.beginPath(); q.p(ctx); ctx.fill(); }

  // coat details, clipped to the body
  ctx.save();
  ctx.beginPath(); ell(bx, by, brx, bry)(ctx); if (bd.haunch) ell(bx - brx * 0.4, by + 0.5, brx * 0.66, bry * 1.08)(ctx);
  if (bd.upright) ell(bx - 1, by + 4, brx * 0.95, bry * 0.7)(ctx);
  ctx.clip();
  ctx.fillStyle = st.belly; ctx.globalAlpha = 0.92;
  ctx.beginPath();
  if (bd.upright) ctx.ellipse(bx + brx * 0.55, by + 1, brx * 0.55, bry * 0.85, 0, 0, Math.PI * 2);
  else ctx.ellipse(bx + brx * 0.12, by + bry * 0.78, brx * 0.82, bry * 0.55, 0, 0, Math.PI * 2);
  ctx.fill(); ctx.globalAlpha = 1;
  if (kind === "fox") { ctx.fillStyle = st.tip; ctx.beginPath(); ctx.ellipse(bx + brx * 0.85, by + 0.5, 4.6, 5.2, 0, 0, Math.PI * 2); ctx.fill(); }
  if (kind === "badger") { ctx.fillStyle = "rgba(255,255,255,.18)"; ctx.fillRect(bx - brx, by - bry, brx * 2, 2.4); }
  ctx.fillStyle = "rgba(20,10,5,.14)";
  ctx.beginPath(); ctx.ellipse(bx, by - bry * 0.1, brx + 1, bry * 0.55, 0, Math.PI, 0); ctx.fill();
  ctx.strokeStyle = shadeHex(base, 1.6); ctx.globalAlpha = 0.38; ctx.lineWidth = 1.3;
  ctx.beginPath(); ctx.ellipse(bx, by, brx - 1.3, bry - 1.3, 0, Math.PI * 1.08, Math.PI * 1.62); ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.restore();

  // tail details: the white tip on a fox
  if (bd.tail === "bush") {
    ctx.save();
    ctx.beginPath(); ctx.save(); ctx.translate(rump.x, rump.y); ctx.rotate(-sway);
    ctx.moveTo(1, -3.5); ctx.quadraticCurveTo(-11, -13, -24, -4); ctx.quadraticCurveTo(-13, 5, 1, 3.5); ctx.closePath(); ctx.restore();
    ctx.clip();
    ctx.save(); ctx.translate(rump.x, rump.y); ctx.rotate(-sway);
    ctx.fillStyle = st.tip; ctx.fillRect(-26, -10, 9, 20);
    ctx.fillStyle = shadeHex(base, 1.2); ctx.fillRect(-18, -5, 16, 1.6);
    ctx.restore(); ctx.restore();
  } else if (bd.tail === "fluff") {
    ctx.strokeStyle = shadeHex(base, 1.3); ctx.globalAlpha = 0.55; ctx.lineWidth = 1.4;
    ctx.save(); ctx.translate(rump.x, rump.y + 3); ctx.rotate(-sway * 0.6); ctx.scale(0.78, 0.78);
    ctx.beginPath(); ctx.moveTo(-3, -3); ctx.bezierCurveTo(-11, -6, -12, -16, -5, -21); ctx.stroke();
    ctx.restore(); ctx.globalAlpha = 1;
  }

  // head details, clipped to head and snout
  ctx.save();
  ctx.beginPath(); ell(hx, hy, hr, hr * 0.94)(ctx); snoutPath(ctx); ctx.clip();
  if (bd.stripe) {
    ctx.fillStyle = "#f1eee6"; ctx.fillRect(hx - hr - 2, hy - hr - 2, hr * 2 + bd.sn + 6, hr * 2 + 4);
    ctx.strokeStyle = "#1c181a"; ctx.lineWidth = 3.4; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(tipX - 0.5, tipY - 0.5); ctx.lineTo(hx + hr * 0.2, hy - hr * 0.2); ctx.lineTo(hx - hr * 1.1, hy - hr * 0.6); ctx.stroke();
    ctx.fillStyle = "#1c181a"; ctx.fillRect(hx - hr - 2, hy - hr - 2, hr * 1.2, hr * 1.4);
  } else if (kind !== "mole") {
    ctx.fillStyle = st.belly; ctx.globalAlpha = 0.9;
    ctx.beginPath(); ctx.ellipse(hx + hr * 0.45, hy + hr * 0.78, hr * 0.95 + bd.sn * 0.55, hr * 0.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.restore();

  // inner ear
  if (bd.ear === "long" || bd.ear === "tall" || bd.ear === "round") {
    const ex = hx - hr * 0.25 + 1.2, ey = hy - hr * 0.72;
    ctx.fillStyle = st.inner || shadeHex(base, 1.5);
    ctx.beginPath();
    if (bd.ear === "tall") { ctx.save(); ctx.translate(ex, ey + 2); ctx.rotate(twitch); ctx.moveTo(-1.5, -0.5); ctx.lineTo(-0.3, -7); ctx.lineTo(1.8, -0.5); ctx.closePath(); ctx.restore(); }
    else if (bd.ear === "long") { ctx.save(); ctx.translate(ex, ey + 1); ctx.rotate(twitch - 0.1); acCapsule(ctx, -0.3, -1, -3, -10.5, 1.2); ctx.restore(); }
    else ctx.arc(ex - 1, ey - 0.5, bd.er * 0.55, 0, Math.PI * 2);
    ctx.fill();
  }

  // squirrel: an acorn held in the little paws
  if (kind === "squirrel") {
    const ax = bx + brx * 0.95, ay = by + 1.5;
    ctx.fillStyle = "#cf9d56"; ctx.beginPath(); ctx.ellipse(ax, ay + 0.8, 2.6, 3.2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#7a4e26"; ctx.beginPath(); ctx.ellipse(ax, ay - 1.4, 3, 1.6, 0, 0, Math.PI * 2); ctx.fill();
    dot(ax - 2.2, ay + 1.6, 1.9, base); dot(ax + 1.8, ay + 2, 1.9, base);
  }
  // mole: big pink digging paws
  if (bd.paws) {
    const px = bx + brx * 0.8 + gait * 0.4, py = by + bry * 0.55;
    ctx.fillStyle = st.nose; ctx.strokeStyle = OUT; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.ellipse(px, py, 5, 3.4, -0.2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = "#f6e6d8"; ctx.lineWidth = 1.1;
    for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(px + 4 , py + i * 1.4); ctx.lineTo(px + 6.8, py + i * 1.8); ctx.stroke(); }
  }
  // badger: pale claws on the front foot
  if (bd.claws) {
    ctx.strokeStyle = "#efe8d8"; ctx.lineWidth = 0.9;
    const x0 = bd.fx[0] + gait + 2.4;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(x0 + i * 1.5, ground - 1.2); ctx.lineTo(x0 + i * 1.5 + 1.3, ground + 0.8); ctx.stroke(); }
  }

  // nose
  if (kind === "mole") {
    dot(tipX - 0.4, tipY - 0.3, 2.5, st.nose);
    dot(tipX - 1, tipY - 1.2, 0.8, "#fff");
  } else {
    dot(tipX - 0.5, tipY - 0.2, kind === "rabbit" ? 1.4 : 1.7, "#1e140c");
    dot(tipX - 1, tipY - 0.9, 0.5, "#fff");
  }
  // eye
  const ex2 = hx + hr * 0.42, ey2 = hy - hr * 0.18;
  const er = kind === "mole" ? 0.9 : kind === "mouse" ? 1.5 : kind === "hedgehog" ? 1.4 : 1.8;
  if (opts.blink) {
    ctx.strokeStyle = "#1e140c"; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(ex2 - er, ey2); ctx.lineTo(ex2 + er, ey2); ctx.stroke();
  } else if (kind === "mole") {
    dot(ex2, ey2, er, "#140c08");
  } else {
    dot(ex2, ey2, er + 0.6, bd.stripe ? "#f1eee6" : "#fff");
    dot(ex2 + er * 0.2, ey2 + 0.1, er * 0.7, "#1e140c");
    dot(ex2 - er * 0.1, ey2 - er * 0.4, er * 0.25, "#fff");
  }
  // whiskers
  if (bd.whisk) {
    ctx.strokeStyle = "rgba(255,255,255,.4)"; ctx.lineWidth = 0.5;
    for (let i = -1; i <= 1; i += 2) {
      ctx.beginPath(); ctx.moveTo(tipX - 3, tipY + 0.8); ctx.lineTo(tipX + 2.4, tipY + 0.6 + i * 1.6); ctx.stroke();
    }
  }
  ctx.restore();
}

// The owl faces the front: folded wings, a feathered chest, a round face with great amber eyes.
function drawOwlLocal(ctx, base, B, opts) {
  const st = ANIMAL_STYLE.owl;
  const T = opts.t != null ? opts.t : (typeof WORLD !== "undefined" ? WORLD.time : 0);
  const breath = Math.sin(T * 2.4) * 0.4, sniff = Math.sin(T * 1.3 + 0.5) * 0.5;
  const OUT = "rgba(24,14,10,.66)";
  const dark = shadeHex(base, 0.55), far = shadeHex(base, 0.72), light = shadeHex(base, 1.22);
  const hy = -11 + B + sniff;
  const parts = [];
  const add = (p, fill) => parts.push({ p, fill });
  const ell = (x, y, rx, ry, rot) => c => c.ellipse(x, y, rx, ry, rot || 0, 0, Math.PI * 2);
  ctx.save(); ctx.lineJoin = "round"; ctx.lineCap = "round";
  for (const s of [-1, 1]) add(ell(s * 4.6, 10.8 + B, 3.6, 1.9), "#d9a040");
  for (const s of [-1, 1]) add(c => { c.moveTo(s * 5, hy - 5); c.lineTo(s * 10.5, hy - 15.5); c.lineTo(s * 9.5, hy - 2); c.closePath(); }, base);
  const bodyG = ctx.createLinearGradient(0, -12 + B, 0, 12 + B);
  bodyG.addColorStop(0, light); bodyG.addColorStop(0.6, base); bodyG.addColorStop(1, far);
  add(ell(0, 0.5 + B, 10.6, 12 + breath), bodyG);
  for (const s of [-1, 1]) add(ell(s * 9, 2 + B, 4.2, 10, s * 0.1), far);
  add(ell(0, hy, 10.6, 8.4), bodyG);
  ctx.strokeStyle = OUT; ctx.lineWidth = 2.8;
  for (const q of parts) { ctx.beginPath(); q.p(ctx); ctx.stroke(); }
  for (const q of parts) { ctx.fillStyle = q.fill; ctx.beginPath(); q.p(ctx); ctx.fill(); }
  // chest feathers
  ctx.fillStyle = st.belly; ctx.globalAlpha = 0.95;
  ctx.beginPath(); ctx.ellipse(0, 3.5 + B, 6.4, 8.2, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
  ctx.strokeStyle = dark; ctx.globalAlpha = 0.4; ctx.lineWidth = 1;
  for (let r = 0; r < 3; r++) for (let k = -1; k <= 1; k++) {
    const cx = k * 3.6 + (r % 2 ? 1.8 : 0), cy = 0 + r * 4.2 + B;
    ctx.beginPath(); ctx.arc(cx, cy + 1, 1.9, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // wing feather lines
  ctx.strokeStyle = dark; ctx.globalAlpha = 0.35;
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(s * 7.5, 1 + i * 3 + B); ctx.lineTo(s * 10.5, 4 + i * 3 + B); ctx.stroke(); }
  ctx.globalAlpha = 1;
  // facial discs and eyes
  for (const s of [-1, 1]) {
    ctx.fillStyle = st.belly; ctx.strokeStyle = "rgba(60,36,20,.45)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(s * 4.6, hy + 0.5, 5.6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    const ex = s * 4.6, ey = hy + 0.2;
    if (opts.blink) {
      ctx.strokeStyle = "#1e140c"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(ex, ey, 3, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
    } else {
      ctx.fillStyle = "#f4b840"; ctx.beginPath(); ctx.arc(ex, ey, 3.7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#1e140c"; ctx.beginPath(); ctx.arc(ex, ey, 2.1, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(ex - 0.9, ey - 1, 0.8, 0, Math.PI * 2); ctx.fill();
    }
    ctx.strokeStyle = dark; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(s * 1.2, hy - 4.2); ctx.quadraticCurveTo(s * 5, hy - 6.8, s * 9, hy - 3.2); ctx.stroke();
  }
  // beak
  ctx.fillStyle = "#e0a845"; ctx.strokeStyle = OUT; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(0, hy + 1.2); ctx.lineTo(2.1, hy + 4.4); ctx.lineTo(0, hy + 7.4); ctx.lineTo(-2.1, hy + 4.4); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
}

// Player sprite: species animal, drawn at the sprite origin.
function drawCritter(ctx, x, y, species, facing, walkT, scale) {
  const s = DATA.species[species] || DATA.species.fox;
  const sc = scale || 1;
  const bob = Math.sin(walkT * 12) * 1.5;
  ctx.save();
  ctx.translate(x, y + 4);
  ctx.scale(sc * 1.3, sc * 1.3);
  ctx.fillStyle = "rgba(0,0,0,.3)";
  ctx.beginPath(); ctx.ellipse(0, 10, 13, 5, 0, 0, Math.PI * 2); ctx.fill();
  drawAnimalLocal(ctx, species, s.color, facing, bob, walkT * 12, {});
  if (typeof drawGear === "function") drawGear(ctx, species, facing, bob, WORLD.time, walkT * 12);
  ctx.restore();
}

// Little signature props so the villagers read as individuals, drawn in the animal's own space.
function drawNpcAccessory(ctx, kind, face, B, T) {
  const OUT = "rgba(24,14,10,.65)";
  const bd = ANIMAL_BUILD[kind];
  ctx.save();
  ctx.lineJoin = "round";
  if (kind === "owl") {
    const hy = -11 + B;
    // a plum shawl across the shoulders
    ctx.fillStyle = "#8a4f8e"; ctx.strokeStyle = OUT; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(-10.5, -1 + B); ctx.quadraticCurveTo(0, 5 + B, 10.5, -1 + B); ctx.lineTo(10, 3 + B); ctx.quadraticCurveTo(0, 9 + B, -10, 3 + B); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#e8c15a"; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.arc(i * 4.2, 6 + B - Math.abs(i) * 0.5, 0.9, 0, Math.PI * 2); ctx.fill(); }
    // round spectacles
    ctx.strokeStyle = "#d9b25a"; ctx.lineWidth = 1.2;
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(s * 4.6, hy + 0.2, 4.7, 0, Math.PI * 2); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(-1, hy + 0.2); ctx.lineTo(1, hy + 0.2); ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,.14)"; for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(s * 4.6, hy + 0.2, 4.5, 0, Math.PI * 2); ctx.fill(); }
  } else if (bd) {
    ctx.scale(face, 1);
    const hx = bd.hx, hy = bd.hy + B, hr = bd.hr + 0.5;
    if (kind === "mouse") {
      // a pink blossom tucked by the ear, and a satchel strap
      const fx = hx - hr * 0.45, fy = hy - hr * 0.55;
      for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5; ctx.fillStyle = "#f7a8c6"; ctx.beginPath(); ctx.arc(fx + Math.cos(a) * 2.2, fy + Math.sin(a) * 2.2, 1.7, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = "#ffe07a"; ctx.beginPath(); ctx.arc(fx, fy, 1.3, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#7a5230"; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(bd.bx - 4, bd.by - 4 + B); ctx.lineTo(bd.bx + 4, bd.by + 6 + B); ctx.stroke();
      ctx.fillStyle = "#a9753f"; ctx.strokeStyle = OUT; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.rect(bd.bx + 2, bd.by + 3 + B, 6, 5); ctx.fill(); ctx.stroke();
    } else if (kind === "badger") {
      // a flat cap and a red neckerchief
      ctx.fillStyle = "#c0503a"; ctx.strokeStyle = OUT; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(hx - 4, hy + hr * 0.8); ctx.lineTo(hx + 5, hy + hr * 0.8); ctx.lineTo(hx + 1, hy + hr * 0.8 + 6); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#4f5a3a";
      ctx.beginPath(); ctx.ellipse(hx - 0.5, hy - hr * 0.78, hr * 0.95, 3.6, -0.08, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(hx + hr * 0.85, hy - hr * 0.7, 4.2, 1.3, 0.1, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    } else if (kind === "mole") {
      // a miner's helmet with a little lamp
      ctx.fillStyle = "#e9b62e"; ctx.strokeStyle = OUT; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.ellipse(hx, hy - hr * 0.55, hr * 0.95, hr * 0.75, 0, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(hx, hy - hr * 0.5, hr * 1.1, 1.6, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      const lx = hx + hr * 0.7, ly = hy - hr * 0.95;
      const g = ctx.createRadialGradient(lx + 2, ly, 0, lx + 2, ly, 12); g.addColorStop(0, "rgba(255,240,170,.6)"); g.addColorStop(1, "rgba(255,240,170,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(lx + 2, ly, 12, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fff6c0"; ctx.beginPath(); ctx.arc(lx, ly, 1.8, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = OUT; ctx.stroke();
    }
  }
  ctx.restore();
}

// Villager sprite. The villager turns to face the player.
function drawNpc(ctx, x, y, color, kind, name) {
  const t = WORLD.time;
  const bob = Math.sin(t * 3 + x) * 1.2;
  const blink = (t + x * 0.01) % 4.2 < 0.12;
  const face = P.x < x ? -1 : 1;
  ctx.fillStyle = "rgba(0,0,0,.28)";
  ctx.beginPath(); ctx.ellipse(x, y + 22, 18, 6.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.save();
  ctx.translate(x, y + 7);
  ctx.scale(1.4, 1.4);
  drawAnimalLocal(ctx, kind, color, face, bob, 0, { blink });
  drawNpcAccessory(ctx, kind, face, bob, t);
  ctx.restore();
  // name plate
  if (name) {
    ctx.font = "12px Georgia";
    ctx.textAlign = "center";
    const w = ctx.measureText(name).width + 12;
    ctx.fillStyle = "rgba(20,26,18,.6)";
    ctx.fillRect(x - w / 2, y + 28, w, 17);
    ctx.fillStyle = "#fff6dc";
    ctx.fillText(name, x, y + 41);
  }
}

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

// ---- Spirit shrine ----
function drawShrine(ctx, x, y) {
  const awake = willowOwned("spiritbond");
  const t = WORLD.time;
  ctx.fillStyle = "rgba(0,0,0,.28)";
  ctx.beginPath(); ctx.ellipse(x + 4, y + 22, 26, 8, 0, 0, Math.PI * 2); ctx.fill();
  const stone = ctx.createLinearGradient(x - 14, y, x + 14, y);
  stone.addColorStop(0, awake ? "#8a8fa6" : "#4a4a52");
  stone.addColorStop(1, awake ? "#4a4e60" : "#2a2a30");
  ctx.fillStyle = stone;
  ctx.beginPath(); ctx.moveTo(x - 14, y + 20); ctx.lineTo(x - 10, y - 22); ctx.lineTo(x + 10, y - 22); ctx.lineTo(x + 14, y + 20); ctx.closePath(); ctx.fill();
  if (awake) {
    const g = ctx.createRadialGradient(x, y - 26, 2, x, y - 26, 34 + Math.sin(t * 2) * 3);
    g.addColorStop(0, "rgba(200,170,255,.6)");
    g.addColorStop(1, "rgba(200,170,255,0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y - 26, 34, 0, Math.PI * 2); ctx.fill();
  }
  ctx.font = "13px Georgia";
  ctx.textAlign = "center";
  const label = "Spirit Shrine";
  const w = ctx.measureText(label).width + 14;
  ctx.fillStyle = "rgba(20,26,18,.6)";
  ctx.fillRect(x - w / 2, y - 60, w, 19);
  ctx.fillStyle = "#fff6dc";
  ctx.fillText(label, x, y - 46);
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
