// More depth for expeditions: eight new relics (two of them cursed), four more resonances, the
// Relic Altar (pick one of three), and elite foes that carry a modifier.

Object.assign(RELICS, {
  briarPact:   { name: "Briar Pact",     desc: "Cursed. Strikes deal 40% more damage, but you take 15% more.", color: "#a8423a", cursed: true },
  glassAcorn:  { name: "Glass Acorn",    desc: "Cursed. Strikes deal 75% more damage, but you take 35% more.", color: "#bfe8ff", cursed: true },
  stormcap:    { name: "Stormcap",       desc: "A quarter of strikes chain lightning to a nearby foe.", color: "#b8d0ff" },
  leechMoss:   { name: "Leech Moss",     desc: "Heal 2 health for each foe you slay.", color: "#6fb35a" },
  echoBark:    { name: "Echo Bark",      desc: "One strike in five echoes for 60% extra damage.", color: "#c9a56a" },
  dewVeil:     { name: "Dewdrop Veil",   desc: "The first hit you take in each room is turned aside.", color: "#9fe0ff" },
  dustDevil:   { name: "Dust Devil",     desc: "Dodging whips up a whirl that hurts and shoves nearby foes.", color: "#d6b98a" },
  magpieCoin:  { name: "Magpie's Coin",  desc: "Every foe you slay gives 1 more Willowlight.", color: "#f2d46b" },
});

RESONANCES.push(
  { id: "thunderclaw",  a: "stormcap",   b: "lightClaws", name: "Thunderclaw",   desc: "Stormcap fires half the time, for 16 damage." },
  { id: "brambleAegis", a: "dewVeil",    b: "thornArmor", name: "Bramble Aegis", desc: "When the Veil turns a hit, nearby foes take 18 damage." },
  { id: "cinderEcho",   a: "echoBark",   b: "emberHeart", name: "Cinder Echo",   desc: "Echoes set foes alight." },
  { id: "verdantCycle", a: "leechMoss",  b: "healingPollen", name: "Verdant Cycle", desc: "Leech Moss heals 4 per foe." },
  { id: "recklessPact", a: "briarPact",  b: "glassAcorn", name: "Reckless Pact", desc: "Strikes deal 25% more damage again. You will regret this." },
);

// Multipliers folded into strikes and into damage taken.
function relicDamageMul() {
  const b = EX.buffs;
  return (b.briarPact ? 1.4 : 1) * (b.glassAcorn ? 1.75 : 1) * (hasRes("recklessPact") ? 1.25 : 1);
}
function relicTakenMul() {
  const b = EX.buffs;
  return (b.briarPact ? 1.15 : 1) * (b.glassAcorn ? 1.35 : 1);
}

// Called for every foe a strike lands on.
function afterStrikeHit(e, dmg) {
  const b = EX.buffs, room = EX.rooms[EX.cur];
  if (b.echoBark && Math.random() < 0.2 && !e.dead) {
    hurtEnemy(e, Math.round(dmg * 0.6), { echo: true });
    fxRing(e.x, e.y, e.r + 16, "rgba(201,165,106,.9)", 0.3);
    if (hasRes("cinderEcho")) e.burnT = 3;
  }
  if (b.stormcap && Math.random() < (hasRes("thunderclaw") ? 0.5 : 0.25)) {
    let near = null, nd = 170;
    for (const o of room.enemies) {
      if (o.dead || o === e) continue;
      const d = dist(o, e);
      if (d < nd) { nd = d; near = o; }
    }
    if (near) {
      fxBolt(e.x, e.y, near.x, near.y);
      hurtEnemy(near, hasRes("thunderclaw") ? 16 : 10, { bolt: true });
    }
  }
  if (e.mod === "thorned" && !e.dead) {
    damagePlayer(4);
    fxBurst(EX.px, EX.py, "#8fd05a", 5, 120);
  }
}

// Called once when a foe dies.
function onEnemyKilled(e) {
  const room = EX.rooms[EX.cur], b = EX.buffs;
  if (b.leechMoss) { const n = hasRes("verdantCycle") ? 4 : 2; healPlayer(n); fxNumber(EX.px, EX.py - 30, "+" + n, "#8fe08a"); }
  if (b.magpieCoin) expWl(1);
  if (e.mod) {
    expWl(1);
    if (e.mod === "explosive") EX.blasts.push({ x: e.x, y: e.y, t: 1.0, r: 95 });
    if (e.mod === "swarming") {
      for (let k = 0; k < 2; k++) {
        const m = spawnEnemy(e.kind, e.def, 0);
        m.x = clamp(e.x + (k ? 26 : -26), 50, ROOM_W - 50); m.y = clamp(e.y + rand(-14, 14), 50, ROOM_H - 50);
        m.r = Math.round(e.def.size * 0.7); m.hp = m.maxHp = Math.round(e.def.hp * 0.4);
        m.name = "Spawnling"; m.minion = true; m.noLoot = true; m.speed *= 1.2;
        room.enemies.push(m);
        fxBurst(m.x, m.y, "#d48aff", 6, 110);
      }
    }
  }
}

// Called at the moment of a dodge.
function onDodge() {
  if (!EX.buffs.dustDevil) return;
  const room = EX.rooms[EX.cur];
  fxRing(EX.px, EX.py, 90, "rgba(214,185,138,.9)", 0.4);
  fxBurst(EX.px, EX.py, "#d6b98a", 14, 200);
  for (const e of room.enemies) {
    if (e.dead || dist(e, { x: EX.px, y: EX.py }) > 90 + e.r) continue;
    hurtEnemy(e, 10, { push: true });
  }
}

// Called on entering a room.
function onEnterRoom() {
  EX.blasts = [];
  if (EX.buffs.dewVeil) EX.veil = true;
}

// Dewdrop Veil: returns true when it turns a hit aside.
function veilBlocks() {
  if (!EX.veil) return false;
  EX.veil = false;
  fxRing(EX.px, EX.py, 60, "rgba(159,224,255,.95)", 0.45);
  fxBurst(EX.px, EX.py, "#9fe0ff", 12, 160);
  fxNumber(EX.px, EX.py - 34, "Veiled", "#9fe0ff", true);
  if (hasRes("brambleAegis")) {
    for (const e of EX.rooms[EX.cur].enemies) {
      if (!e.dead && dist(e, { x: EX.px, y: EX.py }) < 120 + e.r) hurtEnemy(e, 18);
    }
  }
  return true;
}

// ---------- Elite modifiers ----------
const ELITE_MODS = {
  shielded:  { name: "Shielded",  color: "#7fc8ff", note: "A glassy shield soaks damage first." },
  thorned:   { name: "Thorned",   color: "#8fd05a", note: "Striking it by hand stings you." },
  explosive: { name: "Volatile",  color: "#ff8a3a", note: "Bursts a moment after it falls." },
  swarming:  { name: "Brooding",  color: "#d48aff", note: "Splits into spawnlings when slain." },
  hasty:     { name: "Frenzied",  color: "#ffe45a", note: "Moves much faster." },
};

function applyEliteMod(e) {
  const key = pick(Object.keys(ELITE_MODS));
  e.mod = key;
  e.name = `${ELITE_MODS[key].name} ${e.def.name}`;
  if (key === "shielded") e.shield = Math.round(e.maxHp * 0.5);
  if (key === "hasty") e.speed *= 1.35;
}

function stepBlasts(dt) {
  for (const b of EX.blasts) {
    b.t -= dt;
    if (b.t > 0) continue;
    b.done = true;
    fxRing(b.x, b.y, b.r + 20, "rgba(255,150,70,.95)", 0.45);
    fxBurst(b.x, b.y, "#ffb060", 22, 260, { spark: true });
    fxShake(9);
    if (dist(b, { x: EX.px, y: EX.py }) < b.r) damagePlayer(14);
    for (const e of EX.rooms[EX.cur].enemies) {
      if (!e.dead && dist(b, e) < b.r + e.r) hurtEnemy(e, 20);
    }
  }
  EX.blasts = EX.blasts.filter(b => !b.done);
}

function drawBlasts(ctx, t) {
  for (const b of EX.blasts) {
    const k = 1 - b.t;
    ctx.fillStyle = `rgba(255,120,50,${0.1 + 0.2 * k})`;
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = `rgba(255,170,90,${0.5 + 0.4 * Math.sin(t * 30)})`; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r * (0.4 + 0.6 * k), 0, Math.PI * 2); ctx.stroke();
  }
}

function drawEliteAura(ctx, e, t) {
  if (!e.mod) return;
  const m = ELITE_MODS[e.mod];
  ctx.strokeStyle = m.color; ctx.lineWidth = 2; ctx.globalAlpha = 0.55 + 0.3 * Math.sin(t * 4);
  ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 7, 0, Math.PI * 2); ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.fillStyle = m.color;
  for (let i = 0; i < 3; i++) {
    const a = t * 2.2 + i * 2.094;
    ctx.beginPath(); ctx.arc(e.x + Math.cos(a) * (e.r + 7), e.y + Math.sin(a) * (e.r + 7), 2.6, 0, Math.PI * 2); ctx.fill();
  }
  if (e.shield > 0) {
    ctx.fillStyle = "rgba(127,200,255,.22)"; ctx.strokeStyle = "rgba(190,230,255,.8)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
}

// ---------- Relic Altar ----------
function interactAltar(p) {
  const room = EX.rooms[EX.cur];
  const avail = Object.keys(RELICS).filter(k => !EX.buffs[k]);
  room.points = room.points.filter(q => q !== p);
  if (!avail.length) {
    healPlayer(20);
    openDialogue("Relic Altar", "The altar is bare. It has nothing left to give you, but its stone is warm, and you feel mended.", []);
    return;
  }
  const offer = avail.slice().sort(() => Math.random() - 0.5).slice(0, 3);
  const choices = offer.map(r => ({
    label: `Take ${RELICS[r].name}${RELICS[r].cursed ? " (cursed)" : ""}`,
    fn: () => { grantRelic(r); toast(`Relic gained: ${RELICS[r].name}`); fxRing(EX.px, EX.py, 80, "rgba(255,214,120,.95)", 0.5); },
  }));
  choices.push({ label: "Leave them: restore 15 health", fn: () => healPlayer(15) });
  openDialogue("Relic Altar", "Three relics rest on the altar. You may take only one.\n" + offer.map(r => `${RELICS[r].name}: ${RELICS[r].desc}`).join("\n"), choices);
}

// Altar rooms join the pool.
ROOM_TYPES.push({ type: "altar", w: 1 });
