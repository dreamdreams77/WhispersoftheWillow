// Core state, persistence, input, and shared helpers.
const SAVE_KEY = "whispers_willow_save";
const SAVE_VERSION = 1;

const G = {
  scene: "title",        // title | village | expedition
  species: "fox",
  name: "Pip",
  hp: 100, maxHp: 100,
  stamina: 100,
  inv: {},               // itemId -> count
  equip: { weapon: null, armor: null },
  wl: 0,                 // Willowlight
  day: 1,
  season: 0,             // index into DATA.seasons
  weather: "clear",      // key into DATA.weather
  pets: [], activePet: null,
  dayClock: 0,           // 0..1 time of day
  flags: {},             // quest and story flags
  willow: {},            // upgrade id -> true
  relations: {},         // villager id -> points
  quest: "silverbell",
  visitedRegions: {},
  nodes: [],             // gathered node ids for the current day
  time: 0,
  paused: false,
  dialogue: null,
  menu: null,
};

const INPUT = { up: false, down: false, left: false, right: false, act: false, atk: false, dodge: false, menu: false };
const pressed = {};    // edge-triggered presses for this frame

function isDown(k) { return !!INPUT[k]; }
function wasPressed(k) { return !!pressed[k]; }
function clearPressed() { for (const k in pressed) delete pressed[k]; }

function addItem(id, n = 1) {
  G.inv[id] = (G.inv[id] || 0) + n;
  if (G.inv[id] <= 0) delete G.inv[id];
}
function hasItem(id, n = 1) { return (G.inv[id] || 0) >= n; }
function takeItem(id, n = 1) {
  if (!hasItem(id, n)) return false;
  addItem(id, -n);
  return true;
}

function setFlag(k, v = true) { G.flags[k] = v; }
function flag(k) { return !!G.flags[k]; }

function addWillowlight(n) {
  G.wl += n;
  toast(`+${n} Willowlight`);
}

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function rand(a, b) { return a + Math.random() * (b - a); }
function randInt(a, b) { return Math.floor(rand(a, b + 1)); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

// Toast notifications
let toastTimer = null;
function toast(msg, ms = 3000) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.remove("hidden");
  el.style.animation = "none";
  void el.offsetWidth;
  el.style.animation = `fade ${ms / 1000}s forwards`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add("hidden"), ms);
}

function setObjective() {
  const el = document.getElementById("objective");
  if (typeof advanceQuests === "function") advanceQuests(); // keep the quest chain current
  const q = DATA.quests[G.quest];
  if (!q) { el.textContent = ""; return; }
  const step = q.steps.find(s => !flag(s.check.split(":")[1]));
  el.textContent = step ? `${q.title}: ${step.text}` : `${q.title}: complete`;
}

function updateHud() {
  const hp = document.getElementById("hpFill");
  const st = document.getElementById("stFill");
  hp.style.width = (G.hp / G.maxHp * 100) + "%";
  st.style.width = G.stamina + "%";
  document.getElementById("seasonLbl").textContent = DATA.seasons[G.season];
  document.getElementById("dayLbl").textContent = "Day " + G.day;
  document.getElementById("wlLbl").textContent = "✦ " + G.wl + " Willowlight";
  document.getElementById("wxLbl").textContent = DATA.weather[G.weather] ? DATA.weather[G.weather].label : "";
  setObjective();
}

// ---------- Persistence ----------
function serialize() {
  return {
    v: SAVE_VERSION,
    species: G.species, name: G.name, hp: G.hp, maxHp: G.maxHp,
    inv: G.inv, equip: G.equip, wl: G.wl, day: G.day, season: G.season, weather: G.weather, origin: G.origin, pets: G.pets, activePet: G.activePet,
    flags: G.flags, willow: G.willow, relations: G.relations, quest: G.quest,
    visitedRegions: G.visitedRegions,
  };
}

function saveGame() {
  if (window.__noSave) return false; // set while a reset or import is reloading the page
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(serialize()));
    return true;
  } catch (e) {
    toast("Could not save: storage unavailable");
    return false;
  }
}

// Validates and migrates a save. Returns null if unusable.
function validateSave(raw) {
  if (!raw || typeof raw !== "object") return null;
  const s = { ...raw };
  if (s.v !== SAVE_VERSION) { // future migrations go here
    if (typeof s.v !== "number") return null;
  }
  if (!DATA.species[s.species]) s.species = "fox";
  s.name = typeof s.name === "string" ? s.name.slice(0, 14) : "Pip";
  s.maxHp = clamp(Number(s.maxHp) || 100, 50, 300);
  s.hp = clamp(Number(s.hp) || s.maxHp, 1, s.maxHp);
  s.wl = Math.max(0, Math.floor(Number(s.wl) || 0));
  s.day = Math.max(1, Math.floor(Number(s.day) || 1));
  s.season = clamp(Math.floor(Number(s.season) || 0), 0, 3);
  s.weather = DATA.weather[s.weather] ? s.weather : "clear";
  s.inv = typeof s.inv === "object" && s.inv ? s.inv : {};
  for (const k of Object.keys(s.inv)) {
    if (!DATA.items[k]) delete s.inv[k];
    else s.inv[k] = clamp(Math.floor(Number(s.inv[k]) || 0), 0, 999);
  }
  s.equip = s.equip && typeof s.equip === "object" ? s.equip : { weapon: null, armor: null };
  s.flags = s.flags && typeof s.flags === "object" ? s.flags : {};
  s.willow = s.willow && typeof s.willow === "object" ? s.willow : {};
  s.relations = s.relations && typeof s.relations === "object" ? s.relations : {};
  s.visitedRegions = s.visitedRegions && typeof s.visitedRegions === "object" ? s.visitedRegions : {};
  if (!DATA.quests[s.quest]) s.quest = "silverbell";
  s.origin = DATA.origins[s.origin] ? s.origin : "hedgerow";
  s.pets = Array.isArray(s.pets) ? s.pets.filter(id => DATA.pets[id]) : [];
  s.activePet = s.pets.includes(s.activePet) ? s.activePet : (s.pets[0] || null);
  return s;
}

function loadGame() {
  let raw;
  try { raw = JSON.parse(localStorage.getItem(SAVE_KEY) || "null"); }
  catch (e) { return false; }
  const s = validateSave(raw);
  if (!s) return false;
  Object.assign(G, {
    species: s.species, name: s.name, hp: s.hp, maxHp: s.maxHp,
    inv: s.inv, equip: s.equip, wl: s.wl, day: s.day, season: s.season, weather: s.weather, origin: s.origin, pets: s.pets, activePet: s.activePet,
    flags: s.flags, willow: s.willow, relations: s.relations, quest: s.quest,
    visitedRegions: s.visitedRegions,
  });
  G.stamina = 100;
  return true;
}

function hasSave() {
  try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; }
}

// Willow upgrade effects
// Weather is rolled each morning. Winter favors fog and storms, spring favors rain.
function rollWeather() {
  const pool = Object.entries(DATA.weather).map(([k, v]) => {
    let w = v.rollWeight;
    if (G.season === 3 && (k === "fog" || k === "storm")) w *= 2;
    if (G.season === 0 && k === "rain") w *= 1.5;
    return { k, w };
  });
  const total = pool.reduce((a, b) => a + b.w, 0);
  let r = Math.random() * total;
  for (const p of pool) { r -= p.w; if (r <= 0) return p.k; }
  return "clear";
}

function willowOwned(id) { return !!G.willow[id]; }
function buyWillow(id) {
  const u = DATA.willow[id];
  if (!u || willowOwned(id)) return false;
  if (u.needs && !willowOwned(u.needs)) { toast(`Requires ${DATA.willow[u.needs].name} first`); return false; }
  if (G.wl < u.cost) { toast("Not enough Willowlight"); return false; }
  G.wl -= u.cost;
  G.willow[id] = true;
  if (Object.keys(DATA.willow).every(willowOwned)) setTimeout(() => openDialogue("The Great Willow", DATA.willowAwakened, []), 400);
  if (id === "protection") G.maxHp += 20, G.hp += 20;
  if (id === "vitality") toast("The roots stir. The Fernwood opens.");
  saveGame();
  return true;
}
