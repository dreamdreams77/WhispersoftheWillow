// Expedition: procedural room graph, encounters, combat, defeat and return.
const ROOM_W = 960, ROOM_H = 600, DOOR_HALF = 50, EDGE = 26;
const DIRS = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] };
const OPP = { n: "s", s: "n", e: "w", w: "e" };

const RELICS = {
  thornArmor:  { name: "Thorn Armor",       desc: "Incoming damage reduced by 25%.", color: "#5f7a3a" },
  lightClaws:  { name: "Lightning Claws",   desc: "Strikes deal 50% more damage.",   color: "#e8d24a" },
  healingPollen:{ name: "Healing Pollen",   desc: "Heal 15 HP each time a room is cleared.", color: "#f2d46b" },
  spiritWisp:  { name: "Spirit Wisp",       desc: "A companion that strikes nearby foes.", color: "#9bc2ff" },
  keenEye:     { name: "Keen Eye",          desc: "You can see foes through the gloom.", color: "#7fe0d0" },
  swiftRoots:  { name: "Swift Roots",       desc: "You move 15% faster.", color: "#8fd0a0" },
  emberHeart:  { name: "Ember Heart",       desc: "Strikes set foes alight for three seconds of burning.", color: "#ff9a4a" },
  lastBreath:  { name: "Last Breath",       desc: "Once per expedition, a killing blow leaves you at 1 health.", color: "#f5e6ff" },
};

// Resonances: two relics held together unlock a combined effect.
const RESONANCES = [
  { id: "thornedFury",  a: "thornArmor",  b: "lightClaws", name: "Thorned Fury",  desc: "Strikes deal 20% more damage." },
  { id: "blazingClaws", a: "lightClaws",  b: "emberHeart", name: "Blazing Claws", desc: "Burning deals double damage." },
  { id: "lingeringBloom", a: "healingPollen", b: "lastBreath", name: "Lingering Bloom", desc: "Last Breath also restores 20 health." },
  { id: "wayfinder",   a: "swiftRoots",  b: "keenEye",    name: "Wayfinder",     desc: "Dodge recovers 25% faster." },
];
function hasRes(id) {
  const r = RESONANCES.find(x => x.id === id);
  return !!(r && EX.buffs[r.a] && EX.buffs[r.b]);
}
function activeResonances() { return RESONANCES.filter(r => hasRes(r.id)); }

// Gain a relic and announce any resonance it completes.
function grantRelic(r) {
  const before = activeResonances().map(x => x.id);
  EX.buffs[r] = true;
  activeResonances().filter(x => !before.includes(x.id)).forEach(x => toast(`Resonance: ${x.name}. ${x.desc}`, 4500));
}

const EX = {
  active: false,
  omen: null,
  region: null,
  rooms: [],
  cur: 0,
  px: 0, py: 0, fx: 1, fy: 0,
  strikeCd: 0, dodgeT: 0, dodgeCd: 0, invuln: 0, contactCd: 0,
  curled: false,
  buffs: {},
  loot: {},        // unbanked loot
  wl: 0,           // unbanked Willowlight
  kills: 0,
  wisp: { t: 0 },
  projectiles: [],
  hitFlash: 0,
  time: 0,
  started: false,
};

const ROOM_TYPES = [
  { type: "enemies", w: 4 },
  { type: "gather",  w: 2 },
  { type: "shrine",  w: 1 },
  { type: "traveler", w: 1 },
  { type: "treasure", w: 1 },
  { type: "crossroads", w: 1 },
  { type: "empty",   w: 1 },
];

function weightedPick(list) {
  const total = list.reduce((a, b) => a + b.w, 0);
  let r = Math.random() * total;
  for (const it of list) { r -= it.w; if (r <= 0) return it.type; }
  return list[0].type;
}

// Build a connected set of rooms by random walk on a grid.
function genExpedition(regionId, depth = 1) {
  const region = DATA.regions[regionId];
  const maxDepth = region.maxDepth || 1;
  // Deep-only enemies join the pool from region.deepFrom onward.
  const enemyPool = (region.deepEnemies && depth >= (region.deepFrom || 2))
    ? region.enemies.concat(region.deepEnemies) : region.enemies;
  const count = 5 + randInt(0, 2);
  const cells = new Map();
  const order = [];
  const key = (x, y) => x + "," + y;
  let x = 0, y = 0;
  cells.set(key(0, 0), { x, y, doors: {} });
  order.push(cells.get(key(0, 0)));
  while (order.length < count) {
    const from = order[randInt(0, order.length - 1)];
    const dirKeys = Object.keys(DIRS).filter(d => {
      const nx = from.x + DIRS[d][0], ny = from.y + DIRS[d][1];
      return !cells.has(key(nx, ny));
    });
    if (!dirKeys.length) continue;
    const d = pick(dirKeys);
    const nx = from.x + DIRS[d][0], ny = from.y + DIRS[d][1];
    const cell = { x: nx, y: ny, doors: {} };
    cells.set(key(nx, ny), cell);
    from.doors[d] = true;
    cell.doors[OPP[d]] = true;
    order.push(cell);
  }
  // connect adjacent cells that happen to touch (loops add variety)
  for (const c of order) {
    for (const d of Object.keys(DIRS)) {
      const n = cells.get(key(c.x + DIRS[d][0], c.y + DIRS[d][1]));
      if (n && Math.random() < 0.25) { c.doors[d] = true; n.doors[OPP[d]] = true; }
    }
  }

  // Farthest-from-start room is the goal (boss or exit).
  const goal = order[order.length - 1];
  let silverPlaced = !(regionId === "fernwood" && !flag("silverbell") && !flag("silverbellDelivered"));

  const rooms = order.map((c, i) => {
    const room = {
      id: i, gx: c.x, gy: c.y, doors: c.doors,
      type: "empty", enemies: [], nodes: [], points: [], decor: [],
      cleared: false, entered: false,
      region: regionId,
    };
    for (let k = 0; k < 4; k++) {
      room.decor.push({ x: randInt(120, 840), y: randInt(120, 480), r: randInt(18, 36) });
    }
    if (c === goal) {
      if (region.bossKind && depth === maxDepth) room.type = "boss";
      else if (region.depth && depth < maxDepth) room.type = "descent";
      else room.type = "exit";
    } else if (i === 0) {
      room.type = "empty";
    } else {
      room.type = weightedPick(ROOM_TYPES);
    }

    if (room.type === "enemies" || (room.type === "empty" && i > 0 && Math.random() < 0.15)) {
      const n = randInt(2, 4) + (depth - 1);
      for (let k = 0; k < n; k++) {
        const kind = pick(enemyPool);
        room.enemies.push(spawnEnemy(kind, DATA.enemies[kind], 0.2 + 0.1 * (depth - 1)));
      }
      if (room.type === "enemies" && Math.random() < 0.2) {
        const kind = pick(enemyPool);
        room.enemies.push(spawnEnemy(kind, DATA.enemies[kind], 0, true));
      }
    }
    if (room.type === "boss") {
      room.enemies.push(spawnEnemy(region.bossKind, DATA.enemies[region.bossKind], 0));
    }
    if (room.type === "gather" || room.type === "enemies") {
      for (let k = 0; k < randInt(1, 2); k++) {
        room.nodes.push({ x: randInt(160, 800), y: randInt(160, 440), item: pick(region.gather), alive: true });
      }
    }
    if (room.type === "shrine") room.points.push({ kind: "shrine", x: ROOM_W / 2, y: ROOM_H / 2, r: 30 });
    if (room.type === "traveler") room.points.push({ kind: "traveler", x: ROOM_W / 2, y: ROOM_H / 2, r: 30 });
    if (room.type === "treasure") room.points.push({ kind: "treasure", x: ROOM_W / 2, y: ROOM_H / 2, r: 30 });
    if (room.type === "crossroads") room.points.push({ kind: "crossroads", x: ROOM_W / 2, y: ROOM_H / 2, r: 30 });
    if (room.type === "exit") room.points.push({ kind: "exit", x: ROOM_W / 2, y: ROOM_H / 2, r: 36 });
    if (room.type === "descent") room.points.push({ kind: "descend", x: ROOM_W / 2, y: ROOM_H / 2, r: 36 });
    if (room.type === "boss") room.points.push({ kind: "exit", x: ROOM_W / 2, y: ROOM_H / 2, r: 36, locked: true });

    if (!silverPlaced && c !== goal && i > 0 && Math.random() < 0.5) {
      room.points.push({ kind: "silverbell", x: 240, y: 260, r: 30 });
      silverPlaced = true;
    }
    if (c === order[0]) room.cleared = true;
    return room;
  });

  if (!silverPlaced) rooms[rooms.length - 1].points.push({ kind: "silverbell", x: 240, y: 260, r: 30 });
  return rooms;
}

function omenHpMul(def) { return EX.omen === "quiet" && !def.boss ? 0.75 : 1; }

function spawnEnemy(kind, def, _eliteChance, forceElite) {
  const elite = forceElite || Math.random() < (_eliteChance || 0);
  const mult = elite ? 1.6 : 1;
  return {
    kind, def, elite,
    name: (elite ? "Elite " : "") + def.name,
    x: randInt(200, 760), y: randInt(160, 440),
    r: def.size, hp: Math.round(def.hp * mult * omenHpMul(def)), maxHp: Math.round(def.hp * mult * omenHpMul(def)),
    dmg: Math.round(def.dmg * (elite ? 1.3 : 1)),
    speed: def.speed * (elite ? 1.1 : 1) * (EX.omen === "swift" ? 1.1 : 1),
    boss: !!def.boss,
    atkCd: rand(0.5, 1.2), windup: 0, charge: 0, chargeDx: 0, chargeDy: 0, flash: 0, dead: false,
    hitT: 0,
  };
}

// Omens: one risk-for-reward modifier chosen at the gate.
const OMENS = {
  bounty: { name: "Bounty Omen", desc: "Every gathered pile gives +1, but foes hit 25% harder." },
  quiet:  { name: "Quiet Omen",  desc: "Foes have 25% less health, but Willowlight rewards are halved." },
  swift:  { name: "Swift Omen",  desc: "You and every foe move 10% faster." },
};

function chooseOmen(regionId) {
  const region = DATA.regions[regionId];
  const pick3 = id => ({ label: OMENS[id].name, fn: () => { G.flags.omenPending = id; startExpedition(regionId); } });
  const choices = Object.keys(OMENS).map(pick3);
  choices.push({ label: "No omen", fn: () => { G.flags.omenPending = null; startExpedition(regionId); } });
  const text = `Choose an omen to carry into ${region.name}.\n` + Object.keys(OMENS).map(id => `${OMENS[id].name}: ${OMENS[id].desc}`).join("\n");
  openDialogue("Before You Go", text, choices);
}

function startExpedition(regionId) {
  const region = DATA.regions[regionId];
  if (!region) return;
  saveGame();
  EX.active = true;
  EX.region = regionId;
  EX.depth = 1;
  EX.omen = G.flags.omenPending || null;
  if (regionId === "ashen") setFlag("ashenEntered");
  if (regionId === "starfall") setFlag("starfallEntered");
  G.flags.omenPending = null;
  EX.rooms = genExpedition(regionId, 1);
  EX.cur = 0;
  EX.px = ROOM_W / 2; EX.py = ROOM_H / 2 + 60;
  EX.fx = 0; EX.fy = -1;
  EX.strikeCd = 0; EX.dodgeT = 0; EX.dodgeCd = 0; EX.invuln = 0; EX.contactCd = 0;
  EX.curled = false;
  EX.buffs = {};
  if (willowOwned("spiritbond")) EX.buffs.spiritWisp = true;
  if (G.flags.blessingPending) {
    EX.buffs[G.flags.blessingPending] = true;
    G.flags.blessingPending = null;
  }
  EX.loot = {}; EX.wl = 0; EX.kills = 0;
  EX.projectiles = [];
  EX.time = 0;
  EX.started = true;
  G.scene = "expedition";
  G.visitedRegions[regionId] = true;
  G.flags.stat_runs = (G.flags.stat_runs || 0) + 1;
  EX.chaseR = DATA.weather[G.weather].chase;
  EX.decoyT = 0;
  EX.poisonT = 0;
  if (regionId === "fernwood") setFlag("silverbellSpawn");
  if (regionId === "heartwood") setFlag("heartwoodEntered");
  if (G.species === "rabbit") G.hp = Math.min(G.maxHp, G.hp + 0);
  // Protection's max HP bonus is applied when bought (core.js buyWillow)
  setDepthHazard();
  enterRoom(0);
  toast(`Entering ${region.name}.`);
}

function enterRoom(i, fromDir) {
  EX.cur = i;
  const room = EX.rooms[i];
  room.entered = true;
  if (fromDir) {
    // place player on opposite side of the door
    if (fromDir === "n") { EX.px = ROOM_W / 2; EX.py = ROOM_H - 70; }
    if (fromDir === "s") { EX.px = ROOM_W / 2; EX.py = 70; }
    if (fromDir === "e") { EX.px = 70; EX.py = ROOM_H / 2; }
    if (fromDir === "w") { EX.px = ROOM_W - 70; EX.py = ROOM_H / 2; }
  }
  if (room.enemies.length === 0) room.cleared = true;
  if (room.type === "boss" && room.enemies.every(e => e.dead)) room.cleared = true;
  EX.projectiles = [];
  EX.patches = [];
  if (room.type === "boss" && !room.cleared) {
    const bossDef = DATA.enemies[DATA.regions[EX.region].bossKind];
    toast(bossDef.intro || `The ${bossDef.name} stirs.`);
  }
}

function roomEnemiesAlive() {
  return EX.rooms[EX.cur].enemies.some(e => !e.dead);
}

function stepExpedition(dt) {
  if (!EX.active) return;
  const room = EX.rooms[EX.cur];
  EX.time += dt;
  EX.strikeCd = Math.max(0, EX.strikeCd - dt);
  EX.dodgeCd = Math.max(0, EX.dodgeCd - dt);
  EX.invuln = Math.max(0, EX.invuln - dt);
  EX.contactCd = Math.max(0, EX.contactCd - dt);
  EX.hitFlash = Math.max(0, EX.hitFlash - dt * 3);
  EX.decoyT = Math.max(0, EX.decoyT - dt);
  if (EX.poisonT > 0) { EX.poisonT -= dt; G.hp -= 3 * dt; }

  const species = DATA.species[G.species];

  // curl (hedgehog holds dodge)
  EX.curled = G.species === "hedgehog" && isDown("dodge") && EX.dodgeT <= 0;

  // movement
  let dx = 0, dy = 0;
  if (isDown("left")) dx -= 1;
  if (isDown("right")) dx += 1;
  if (isDown("up")) dy -= 1;
  if (isDown("down")) dy += 1;
  if (EX.dodgeT > 0) {
    EX.dodgeT -= dt;
    EX.invuln = Math.max(EX.invuln, 0.05);
    moveExpedition(EX.dodgeDx * 420 * dt, EX.dodgeDy * 420 * dt, room);
  } else if (!EX.curled) {
    if (dx || dy) {
      const len = Math.hypot(dx, dy); dx /= len; dy /= len;
      EX.fx = dx; EX.fy = dy;
      const sp = 190 * species.speed * (G.species === "rabbit" ? 1.15 : 1) * (EX.hazard === "bogMire" ? 0.6 : 1) * (EX.buffs.swiftRoots ? 1.15 : 1) * (EX.omen === "swift" ? 1.1 : 1);
      moveExpedition(dx * sp * dt, dy * sp * dt, room);
    }
  }

  // dodge input
  if (wasPressed("dodge") && EX.dodgeCd <= 0 && G.stamina >= 25 && !EX.curled) {
    G.stamina -= 25;
    EX.dodgeT = 0.22;
    EX.dodgeCd = (EX.buffs.moonStep ? 0.275 : 0.55) * (hasRes("wayfinder") ? 0.75 : 1);
    if (G.species === "fox") EX.decoyT = 1.2; // afterimage confuses pursuers
    SFX.play("dodge");
    EX.invuln = 0.22;
    const d = Math.hypot(EX.fx, EX.fy) || 1;
    EX.dodgeDx = EX.fx / d; EX.dodgeDy = EX.fy / d;
  }

  // strike
  if (wasPressed("atk") && EX.strikeCd <= 0 && !EX.curled && EX.dodgeT <= 0) {
    EX.strikeCd = 0.38;
    SFX.play("strike");
    let range = 56;
    if (G.species === "squirrel") range = 90;
    let dmg = 18 * (G.species === "badger" ? 1.25 : 1) * (EX.buffs.lightClaws ? 1.5 : 1) * (G.activePet === "emberfinch" ? 1.1 : 1) * (EX.buffs.stoneHeart ? 1.15 : 1) * (hasRes("thornedFury") ? 1.2 : 1);
    const weapon = G.equip.weapon && DATA.items[G.equip.weapon];
    if (weapon && weapon.atk) dmg *= weapon.atk;
    for (const e of room.enemies) {
      if (e.dead) continue;
      const ddx = e.x - EX.px, ddy = e.y - EX.py;
      const d = Math.hypot(ddx, ddy);
      if (d < range + e.r && (ddx * EX.fx + ddy * EX.fy) >= -e.r * 0.3) {
        if (EX.buffs.emberHeart || (G.activePet === "cinderkit" && Math.random() < 0.2)) e.burnT = 3;
        hurtEnemy(e, Math.round(dmg));
      }
    }
    // squirrels loose an acorn when nothing is in melee reach
    if (G.species === "squirrel" && !room.enemies.some(e => !e.dead && Math.hypot(e.x - EX.px, e.y - EX.py) < 200)) {
      EX.projectiles.push({ x: EX.px, y: EX.py, vx: EX.fx * 420, vy: EX.fy * 420, t: 0.6, dmg: 12 });
    }
  }

  // spirit wisp companion
  if (EX.buffs.spiritWisp) {
    EX.wisp.t += dt;
    if (EX.wisp.t > 1.6) {
      EX.wisp.t = 0;
      const tgt = room.enemies.find(e => !e.dead);
      if (tgt) hurtEnemy(tgt, 8);
    }
  }

  // enemies
  // Ember Heart: burning foes take steady damage
  for (const e of room.enemies) {
    if (e.dead || !(e.burnT > 0)) continue;
    e.burnT -= dt;
    hurtEnemy(e, (hasRes("blazingClaws") ? 10 : 5) * dt);
  }
  if (roomEnemiesAlive()) {
    for (const e of room.enemies) {
      if (e.dead) continue;
      updateEnemy(e, dt, room);
    }
  } else if (!room.cleared) {
    room.cleared = true;
    if (EX.buffs.healingPollen) healPlayer(15);
    if (G.activePet === "sproutkin") healPlayer(3);
    toast("The room falls quiet.");
  }

  // projectiles
  for (const p of EX.projectiles) {
    p.x += p.vx * dt; p.y += p.vy * dt; p.t -= dt;
    for (const e of room.enemies) {
      if (e.dead || p.hit) continue;
      if (Math.hypot(e.x - p.x, e.y - p.y) < e.r + 8) {
        hurtEnemy(e, p.dmg || 14); p.hit = true;
      }
    }
  }
  EX.projectiles = EX.projectiles.filter(p => p.t > 0 && !p.hit);

  // room points
  const target = expNearestPoint(room);
  if (wasPressed("act") && target) interactExpPoint(target);

  // gathering nodes
  if (wasPressed("act") && !target) {
    for (const n of room.nodes) {
      if (!n.alive) continue;
      if (Math.hypot(n.x - EX.px, n.y - EX.py) < 40) {
        n.alive = false;
        const amt = 1 + (G.species === "mouse" && Math.random() < 0.4 ? 1 : 0) + (willowOwned("abundance") && Math.random() < 0.5 ? 1 : 0) + (DATA.weather[G.weather].gatherBonus && Math.random() < 0.5 ? 1 : 0);
        expLoot(n.item, amt);
        if (G.species === "mole" && Math.random() < 0.3) expLoot("quartz", 1);
        SFX.play("gather");
        toast(`Found ${DATA.items[n.item].name} x${amt}`);
        break;
      }
    }
  }

  // exit tiles
  if (room.type === "boss" && !roomEnemiesAlive() && room.cleared) {
    room.points.forEach(p => { if (p.kind === "exit") p.locked = false; });
  }

  updateDepthHazard(dt);
  updatePetPassive(dt);

  // death check
  if (G.hp <= 0) endExpedition(false);
  G.stamina = clamp(G.stamina + dt * (EX.hazard === "coldDraft" ? 7.5 : 15) * (EX.buffs.winterBreath ? 1.5 : 1), 0, 100);
  G.hp = clamp(G.hp, 0, G.maxHp + (EX.bonusHp || 0));
}

function moveExpedition(mx, my, room) {
  EX.px += mx;
  EX.py += my;
  EX.px = clamp(EX.px, EDGE + 18, ROOM_W - EDGE - 18);
  EX.py = clamp(EX.py, EDGE + 18, ROOM_H - EDGE - 18);
  // doors: when stepping into an edge gap that has a connection, transition
  for (const d of Object.keys(room.doors)) {
    if (!room.doors[d]) continue;
    const next = EX.rooms.find(r => r.gx === room.gx + DIRS[d][0] && r.gy === room.gy + DIRS[d][1]);
    if (!next) continue;
    if (roomEnemiesAlive()) continue; // lock doors until clear
    if (d === "n" && EX.py <= EDGE + 20 && Math.abs(EX.px - ROOM_W / 2) < DOOR_HALF) return enterRoom(next.id, "s");
    if (d === "s" && EX.py >= ROOM_H - EDGE - 20 && Math.abs(EX.px - ROOM_W / 2) < DOOR_HALF) return enterRoom(next.id, "n");
    if (d === "w" && EX.px <= EDGE + 20 && Math.abs(EX.py - ROOM_H / 2) < DOOR_HALF) return enterRoom(next.id, "e");
    if (d === "e" && EX.px >= ROOM_W - EDGE - 20 && Math.abs(EX.py - ROOM_H / 2) < DOOR_HALF) return enterRoom(next.id, "w");
  }
}

function updateEnemy(e, dt, room) {
  e.flash = Math.max(0, e.flash - dt);
  e.hitT = Math.max(0, e.hitT - dt);
  const dxp = EX.px - e.x, dyp = EX.py - e.y;
  const d = Math.hypot(dxp, dyp) || 1;

  if (e.boss) {
    // Bramblemaw: wind up thorns, then charge toward the player's last position
    if (e.charge > 0) {
      e.charge -= dt;
      e.x += e.chargeDx * 320 * dt; e.y += e.chargeDy * 320 * dt;
      e.x = clamp(e.x, 60, ROOM_W - 60); e.y = clamp(e.y, 60, ROOM_H - 60);
      if (d < e.r + 22 && EX.contactCd <= 0) damagePlayer(e.dmg);
    } else if (e.windup > 0) {
      e.windup -= dt;
      if (e.windup <= 0) { e.charge = 0.6; e.chargeDx = dxp / d; e.chargeDy = dyp / d; }
    } else {
      e.atkCd -= dt;
      e.x += (dxp / d) * 30 * dt; e.y += (dyp / d) * 30 * dt;
      if (e.atkCd <= 0) { e.windup = 0.9; e.atkCd = 3.2; }
    }
    return;
  }

  if (e.kind === "thornBeetle" && d < 150 && e.windup <= 0 && e.charge <= 0) {
    e.windup = 0.5; // telegraph lunge
    e.atkCd = 1.8;
  }
  if (e.windup > 0) {
    e.windup -= dt;
    if (e.windup <= 0) { e.charge = 0.25; e.chargeDx = dxp / d; e.chargeDy = dyp / d; }
  } else if (e.charge > 0) {
    e.charge -= dt;
    e.x += e.chargeDx * 260 * dt; e.y += e.chargeDy * 260 * dt;
  } else if (d < EX.chaseR && EX.decoyT <= 0) {
    e.x += (dxp / d) * e.speed * dt;
    e.y += (dyp / d) * e.speed * dt;
  }
  e.x = clamp(e.x, 40, ROOM_W - 40); e.y = clamp(e.y, 40, ROOM_H - 40);

  if (d < e.r + 14 && EX.contactCd <= 0) damagePlayer(e.dmg * 0.7);
  if (e.def.poison && d < e.r + 14) EX.poisonT = 3;
}

function hurtEnemy(e, dmg) {
  if (e.dead) return;
  e.hp -= dmg;
  e.flash = 0.12;
  e.hitT = 0.15;
  if (e.hp <= 0) {
    e.dead = true;
    SFX.play("death");
    EX.kills++;
    G.flags.stat_kills = (G.flags.stat_kills || 0) + 1;
    const def = e.def;
    let wl = e.boss ? (def.wl || 6) : (e.elite ? 2 : 1);
    if (G.species === "fox") wl += 0;
    expWl(wl + DATA.weather[G.weather].wlBonus + (G.activePet === "mothling" ? 1 : 0));
    for (const [item, range] of Object.entries(def.drops || {})) {
      const n = randInt(range[0], range[1]);
      if (n > 0) expLoot(item, n);
    }
    if (e.kind === "bramblemaw") {
      setFlag("bramblemawDown");
      toast("The Bramblemaw collapses. A Shrine Charm is left behind.");
    }
    if (e.kind === "blightheart") {
      setFlag("heartwoodCleansed");
      toast("The Blightheart shatters. Green light pours back into the roots.");
    }
    if (e.kind === "emberStag") {
      setFlag("ashenCleansed");
      adoptPet("cinderkit");
      toast("The Ember Stag bows its burning head and walks into the smoke. A Cinder Kit stays behind and follows you home.", 6000);
    }
    if (e.kind === "starwarden") {
      setFlag("starwardenDown");
      toast("The Starwarden folds its wings and the fallen stars drift up like sparks. The meadow is quiet at last.", 6000);
    }
    if (e.kind === "gloomMatriarch") {
      setFlag("matriarchDown");
      setFlag("catacombsOpen");
      toast("The Gloomcap Matriarch sinks into the moss. Deeper down, a sealed door unlocks: the Hollowroot Catacombs are open.");
    }
  }
}

function damagePlayer(amount) {
  if (EX.invuln > 0) return;
  let dmg = amount;
  if (EX.omen === "bounty") dmg *= 1.25;
  if (EX.curled) dmg *= 0.5;
  if (EX.buffs.thornArmor) dmg *= 0.75;
  if (EX.buffs.glowWard) dmg *= 0.85;
  if (G.equip.armor === "thornMail") dmg *= DATA.items.thornMail.dmgTake;
  dmg *= DATA.weather[G.weather].enemyDmg;
  const hit = Math.round(dmg);
  if (EX.buffs.lastBreath && G.hp - hit <= 0) {
    // Last Breath: the relic is spent and the Willow holds you at 1 health
    const bloom = hasRes("lingeringBloom");
    G.hp = 1; EX.invuln = 1; delete EX.buffs.lastBreath;
    if (bloom) G.hp = clamp(G.hp + 20, 0, G.maxHp);
    EX.hitFlash = 1; SFX.play("hurt");
    toast("Last Breath: the Willow pulls you back to 1 health.", 4000);
    return;
  }
  G.hp -= hit;
  EX.contactCd = 0.5;
  EX.hitFlash = 1;
  SFX.play("hurt");
  if (G.hp <= 0) G.hp = 0;
}

function healPlayer(n) {
  G.hp = clamp(G.hp + n, 0, G.maxHp);
}

function expLoot(item, n) {
  // Bounty Omen: every gathered pile gains one extra
  const bonus = EX.omen === "bounty" && n > 0 ? 1 : 0;
  EX.loot[item] = (EX.loot[item] || 0) + n + bonus;
}
function expWl(n) { EX.wl += EX.omen === "quiet" ? Math.ceil(n / 2) : n; }

function expNearestPoint(room) {
  let best = null, bd = Infinity;
  for (const p of room.points) {
    const d = Math.hypot(EX.px - p.x, EX.py - p.y);
    if (d < p.r + 26 && d < bd) { bd = d; best = p; }
  }
  return best;
}

function interactExpPoint(p) {
  const room = EX.rooms[EX.cur];
  if (p.kind === "shrine") {
    const hasB = hasItem("berry");
    const choices = [];
    if (hasB) choices.push({ label: "Offer a Wild Berry (+1 Willowlight)", fn: () => { addItem("berry", -1); expWl(1); toast("The shrine hums."); }});
    choices.push({ label: "Risk it: +2 Willowlight, -10 HP", fn: () => { expWl(2); G.hp -= 10; toast("Thorns bite you, but the shrine answers."); }});
    choices.push({ label: "Walk away", fn: () => {} });
    openDialogue("Mysterious Shrine", "A moss-covered stone asks for a small offering before it gives its gift.", choices);
    room.points = room.points.filter(q => q !== p);
  } else if (p.kind === "traveler") {
    const choices = [{ label: "Help them home", fn: () => {
      expLoot("acorn", 2); expWl(2); setRelation("villager_ash", 1); grantPet();
      toast("A lost hedgehog child thanks you and scurries home.");
    }}];
    choices.push({ label: "Take their trinket", fn: () => { expLoot("shrineCharm", 1); toast("You take the trinket. The child cries out."); } });
    openDialogue("A Lost Critter", "A young hedgehog is trapped by brambles, calling for their family.", choices);
    room.points = room.points.filter(q => q !== p);
  } else if (p.kind === "treasure") {
    const owned = Object.keys(EX.buffs);
    const avail = Object.keys(RELICS).filter(k => !owned.includes(k));
    if (avail.length >= 2 && Math.random() < 0.8) {
      // two relics on offer; the player chooses one
      const offer = avail.slice().sort(() => Math.random() - 0.5).slice(0, 2);
      const choices = offer.map(r => ({ label: `Take ${RELICS[r].name}`, fn: () => { grantRelic(r); toast(`Relic gained: ${RELICS[r].name}`); } }));
      openDialogue("Relic Cache", offer.map(r => `${RELICS[r].name}: ${RELICS[r].desc}`).join("\n"), choices);
    } else if (avail.length && Math.random() < 0.8) {
      const r = pick(avail);
      grantRelic(r);
      openDialogue("Relic Found", `You find a relic: ${RELICS[r].name}. ${RELICS[r].desc}`, []);
    } else {
      expLoot("acorn", 2); expLoot("wood", 2); expWl(1);
      openDialogue("Treasure", "A cache of acorns and driftwood, half buried in moss.", []);
    }
    room.points = room.points.filter(q => q !== p);
  } else if (p.kind === "crossroads") {
    // A three-way choice: each path trades something different. The stone is spent on any choice.
    const region = DATA.regions[EX.region];
    const spent = () => { room.points = room.points.filter(q => q !== p); };
    const choices = [
      { label: "Follow the warm smoke", fn: () => {
        spent();
        for (let k = 0; k < 2; k++) {
          const kind = pick(region.enemies);
          room.enemies.push(spawnEnemy(kind, DATA.enemies[kind], 0.2));
        }
        room.cleared = false;
        expWl(4);
        toast("Two foes rise from the smoke. You also find 4 Willowlight in the ash.");
      } },
      { label: "Drink from the cool spring", fn: () => {
        spent();
        healPlayer(25);
        G.stamina = 100;
        toast("The spring restores 25 health and your stamina.");
      } },
      { label: "Search the roots", fn: () => {
        spent();
        for (let k = 0; k < 2; k++) expLoot(pick(region.gather), 1);
        expWl(1);
        toast("You pull two useful things from the roots.");
      } },
    ];
    openDialogue("Crossroads", `Three paths open before you in ${region.name}. You may take only one.`, choices);
  } else if (p.kind === "silverbell") {
    expLoot("silverbell", 1);
    openDialogue("Silverbell", "A pale silver bloom, faintly chiming. Posy would love this.", []);
    room.points = room.points.filter(q => q !== p);
  } else if (p.kind === "descend") {
    const next = EX.depth + 1;
    const lore = (DATA.depthLore[EX.region] || [])[EX.depth - 1] || "Cold air rises from a stair cut into the stone.";
    openDialogue("A Deeper Stair", `${lore} Depth ${next} waits below, and so do stronger guardians.`, [
      { label: `Descend to depth ${next}`, fn: descendExpedition },
      { label: "Not yet", fn: () => {} },
    ]);
  } else if (p.kind === "exit") {
    if (p.locked) { toast("The way is sealed."); return; }
    endExpedition(true);
  }
}

function setRelation(id, n) {
  G.relations[id] = (G.relations[id] || 0) + n;
}

function endExpedition(success) {
  if (!EX.active) return;
  EX.active = false;
  SFX.play(success ? "portal" : "death");
  const kept = {};
  for (const [item, n] of Object.entries(EX.loot)) {
    // defeat keeps half of unbanked materials; the silverbell is never lost
    const full = success || item === "silverbell";
    const k = full ? n : Math.floor(n / 2);
    if (k > 0) kept[item] = k;
  }
  for (const [item, n] of Object.entries(kept)) addItem(item, n);
  if (kept.silverbell) setFlag("silverbell");
  G.wl += EX.wl; // Willowlight is always kept: knowledge and magic survive failure
  if (!success) {
    G.hp = Math.max(1, Math.floor(G.maxHp * 0.5));
    toast("You limp home. Some spoils were lost, but the village remembers you.");
  } else {
    G.hp = G.maxHp;
    toast(`Safe home. Gathered ${Object.values(kept).reduce((a, b) => a + b, 0)} items and ${EX.wl} Willowlight.`);
  }
  G.scene = "village";
  if (EX.region === "thicket" && success && flag("bramblemawDown")) G.quest = "silverbell";
  if (success) advanceQuests();
  if (success && flag("heartwoodCleansed") && !flag("endingShown")) {
    setFlag("endingShown");
    setTimeout(() => openDialogue("The Great Willow", DATA.heartwoodEnding, []), 800);
  }
  resetVillageNodes();
  P.x = 700; P.y = 700;
  saveGame();
}

function descendExpedition() {
  if (!EX.active) return;
  const region = DATA.regions[EX.region];
  EX.depth++;
  EX.rooms = genExpedition(EX.region, EX.depth);
  EX.px = ROOM_W / 2; EX.py = ROOM_H - 110;
  EX.fx = 0; EX.fy = -1;
  EX.projectiles = [];
  G.hp = clamp(G.hp + 20, 0, G.maxHp + (EX.bonusHp || 0));
  EX.wl += EX.depth; // deeper floors pay better Willowlight
  setFlag(`depth_${EX.region}_${EX.depth}`);
  setDepthHazard();
  enterRoom(0);
  const hz = EX.hazard ? DATA.hazards[EX.hazard] : null;
  toast(`Depth ${EX.depth} of ${region.maxDepth}: +${EX.depth} Willowlight. ${hz ? hz.name + ": " + hz.desc : "The air grows colder."}`);
}

// Each floor may carry one hazard. Only state lives here; drawing is in main.js.
function setDepthHazard() {
  const region = DATA.regions[EX.region];
  EX.hazard = (region.hazards && region.hazards[EX.depth]) || null;
  EX.patches = [];
  EX.hazardT = 2.2;
  EX.frostT = 5;
}

function updateDepthHazard(dt) {
  if (EX.hazard === "frostBite") {
    EX.frostT -= dt;
    if (EX.frostT <= 0) { EX.frostT = 5; damagePlayer(4); }
  }
  if (EX.hazard !== "warmStone") return;
  EX.hazardT -= dt;
  if (EX.hazardT <= 0) {
    EX.hazardT = 3.2;
    const a = rand(0, Math.PI * 2), d = rand(40, 170);
    EX.patches.push({
      x: clamp(EX.px + Math.cos(a) * d, 60, ROOM_W - 60),
      y: clamp(EX.py + Math.sin(a) * d, 60, ROOM_H - 60),
      t: 1.1, r: 42, hit: false,
    });
  }
  for (const p of EX.patches) {
    p.t -= dt;
    if (p.t <= 0 && !p.hit) {
      p.hit = true;
      if (Math.hypot(EX.px - p.x, EX.py - p.y) < p.r) damagePlayer(12);
    }
  }
  EX.patches = EX.patches.filter(p => p.t > -0.35);
}

// Companions: rescued critters who walk beside you, one at a time.
// Story pets join only through their story beats, never from the random pool.
function adoptPet(id) {
  const owned = G.pets || [];
  if (owned.includes(id)) return;
  G.pets = [...owned, id];
  if (!G.activePet) G.activePet = id;
}

function grantPet() {
  const owned = G.pets || [];
  const open = Object.keys(DATA.pets).filter(id => !owned.includes(id) && !DATA.pets[id].story);
  if (!open.length) { expWl(2); return; }
  const id = pick(open);
  G.pets = [...owned, id];
  if (!G.activePet) G.activePet = id;
  toast(`${DATA.pets[id].name} has chosen to follow you. ${DATA.pets[id].passive}`);
}

function updatePetPassive(dt) {
  if (G.activePet !== "hedgepup") return;
  EX.petT = (EX.petT || 0) + dt;
  if (EX.petT >= 5) { EX.petT = 0; healPlayer(1); }
}

function advanceQuests() {
  if (flag("heartwoodCleansed")) G.quest = "ashen";
  if (flag("silverbell") && flag("silverbellDelivered") && flag("bramblemawDown")) {
    G.quest = "heartwood";
  }
  if (flag("starfallEntered") && !flag("starwardenDown")) G.quest = "starfall";
}
