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
