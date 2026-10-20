// Deeds (a gentle list of things to try, each paying a little Willowlight once) and
// Marigold the peddler, who rolls her cart into the village every third day.

const DEED_BOSS_FLAGS = ["bramblemawDown", "heartwoodCleansed", "ashenCleansed", "starwardenDown", "matriarchDown"];
const DEED_GAME_FLAGS = ["fireflyBest", "skipBest", "acornBest", "whackBest", "ringBest", "cv_galleryBest", "cv_strikerBest", "cv_shellBest", "cv_duckBest", "cv_basketBest"];

function deedStat(k) { return G.flags[k] || 0; }
function deedCount(list) { return list.filter(k => (G.flags[k] || 0) > 0).length; }
function deedRegionCount() { return Object.keys(DATA.regions).filter(k => G.visitedRegions[k]).length; }
function deedVillagers() { return Object.keys(DATA.villagers); }
function deedLoreCount() { return DATA.lore.filter(l => { try { return l.unlock(); } catch (e) { return false; } }).length; }

const DEEDS = [
  { id: "firstSteps",  title: "First Paw Prints",       text: "Step beyond the Willow's roots for the first time.",       reward: 5,  prog: () => [Math.min(1, deedRegionCount()), 1] },
  { id: "wayfarer",    title: "Wayfarer",               text: "Visit four different regions.",                            reward: 10, prog: () => [Math.min(4, deedRegionCount()), 4] },
  { id: "cartographer",title: "Cartographer",           text: "Visit every region the Willow has a name for.",            reward: 25, prog: () => [deedRegionCount(), Object.keys(DATA.regions).length] },
  { id: "seasoned",    title: "Seasoned Explorer",      text: "Set out on ten expeditions.",                              reward: 10, prog: () => [Math.min(10, deedStat("stat_runs")), 10] },
  { id: "thorn",       title: "A Thorn in Their Side",  text: "Defeat 25 blighted creatures.",                            reward: 8,  prog: () => [Math.min(25, deedStat("stat_kills")), 25] },
  { id: "guardian",    title: "Forest Guardian",        text: "Defeat 100 blighted creatures.",                           reward: 20, prog: () => [Math.min(100, deedStat("stat_kills")), 100] },
  { id: "firstWarden", title: "Warden's Bane",          text: "Defeat your first great guardian.",                        reward: 10, prog: () => [Math.min(1, deedCount(DEED_BOSS_FLAGS)), 1] },
  { id: "allWardens",  title: "Peace in the Wild",      text: "Settle every great guardian of the forest.",               reward: 30, prog: () => [deedCount(DEED_BOSS_FLAGS), DEED_BOSS_FLAGS.length] },
  { id: "neighbour",   title: "Good Neighbour",         text: "Reach friendship 3 with any villager.",                    reward: 6,  prog: () => [Math.min(3, Math.max(0, ...deedVillagers().map(v => G.relations[v] || 0))), 3] },
  { id: "everyone",    title: "Everyone's Friend",      text: "Befriend every villager.",                                 reward: 15, prog: () => [deedVillagers().filter(v => (G.relations[v] || 0) >= 1).length, deedVillagers().length] },
  { id: "wishful",     title: "Wishful Thinking",       text: "Make ten wishes at the Wishing Well.",                     reward: 8,  prog: () => [Math.min(10, deedStat("wishes")), 10] },
  { id: "week",        title: "A Week at the Willow",   text: "Reach the eighth day.",                                    reward: 5,  prog: () => [Math.min(8, G.day), 8] },
  { id: "year",        title: "A Year and a Day",       text: "Live through all four seasons and begin another.",         reward: 25, prog: () => [Math.min(29, G.day), 29] },
  { id: "tender",      title: "Tender of the Willow",   text: "Awaken three of the Willow's gifts.",                      reward: 12, prog: () => [Math.min(3, Object.values(G.willow).filter(Boolean).length), 3] },
  { id: "crafter",     title: "Handy Paws",             text: "Craft ten things.",                                        reward: 10, prog: () => [Math.min(10, deedStat("stat_crafts")), 10] },
  { id: "follower",    title: "A Friend to Follow",     text: "Be followed home by a companion.",                         reward: 6,  prog: () => [Math.min(1, (G.pets || []).length), 1] },
  { id: "lorekeeper",  title: "Keeper of Memories",     text: "Fill ten pages of the Journal.",                           reward: 15, prog: () => [Math.min(10, deedLoreCount()), 10] },
  { id: "fairgoer",    title: "Fairgoer",               text: "Set a score in five different mini-games.",                reward: 12, prog: () => [Math.min(5, deedCount(DEED_GAME_FLAGS)), 5] },
  { id: "gamemaster",  title: "Game Master",            text: "Set a score in every mini-game.",                          reward: 30, prog: () => [deedCount(DEED_GAME_FLAGS), DEED_GAME_FLAGS.length] },
  { id: "bargain",     title: "A Good Bargain",         text: "Trade with the peddler five times.",                       reward: 8,  prog: () => [Math.min(5, deedStat("stat_trades")), 5] },
  { id: "errands",    title: "Errand Runner",          text: "Finish five errands from the Notice Board.",               reward: 8,  prog: () => [Math.min(5, deedStat("stat_errands")), 5] },
  { id: "reliable",   title: "Reliable Paws",          text: "Finish fifteen errands from the Notice Board.",            reward: 20, prog: () => [Math.min(15, deedStat("stat_errands")), 15] },
  { id: "heap",        title: "A Heap of Light",        text: "Hold 150 Willowlight at once.",                            reward: 10, prog: () => [Math.min(150, G.wl), 150] },
];

function deedDone(d) { return !!G.flags["deed_" + d.id]; }

let deedClock = 0;
function deedTick(dt) {
  deedClock += dt;
  if (deedClock < 1.5) return;
  deedClock = 0;
  checkDeeds();
}

function checkDeeds() {
  const won = [];
  for (const d of DEEDS) {
    if (deedDone(d)) continue;
    let p; try { p = d.prog(); } catch (e) { continue; }
    if (p[0] >= p[1]) { G.flags["deed_" + d.id] = true; G.wl += d.reward; won.push(d); }
  }
  if (!won.length) return;
  const total = won.reduce((a, d) => a + d.reward, 0);
  toast(`Deed earned: ${won.map(d => d.title).join(", ")} (+${total} Willowlight)`, 5500);
  if (typeof SFX !== "undefined" && SFX.play) { try { SFX.play("pickup"); } catch (e) {} }
  saveGame();
}

function renderDeeds(body) {
  const done = DEEDS.filter(deedDone).length;
  const rk = willowRank();
  body.appendChild(el("h3", null, "Deeds"));
  body.appendChild(el("p", null, `Rank: ${rk.title}. ${done} of ${DEEDS.length} deeds earned. Each pays a little Willowlight, once.`));
  body.appendChild(el("p", null, rk.next ? `Next rank at ${rk.next} deeds. ${rk.perk}` : rk.perk));
  const list = el("div", "list");
  const ordered = DEEDS.filter(d => !deedDone(d)).concat(DEEDS.filter(deedDone));
  for (const d of ordered) {
    const s = el("div", "slot");
    const ok = deedDone(d);
    s.appendChild(el("b", null, `${ok ? "✓ " : ""}${d.title}`));
    s.appendChild(el("small", null, d.text));
    const p = d.prog();
    const line = ok ? `Earned (+${d.reward} Willowlight)` : `${Math.min(p[0], p[1])} / ${p[1]}  ·  Reward: +${d.reward} Willowlight`;
    const bar = el("div", null, "");
    bar.style.cssText = "height:5px;background:rgba(0,0,0,.25);border-radius:3px;margin:5px 0 2px;overflow:hidden";
    const fill = el("div", null, "");
    fill.style.cssText = `height:100%;width:${ok ? 100 : Math.round(100 * Math.min(1, p[0] / p[1]))}%;background:${ok ? "#8fd17a" : "#e3b24a"}`;
    bar.appendChild(fill);
    s.appendChild(bar);
    s.appendChild(el("small", null, line));
    if (ok) s.style.opacity = "0.7";
    list.appendChild(s);
  }
  body.appendChild(list);
}

// ---------------- ranks and errands ----------------
const WILLOW_RANKS = [
  { at: 0,  title: "Sproutling",           perk: "Errands pay their base Willowlight." },
  { at: 3,  title: "Seedling",             perk: "Errands pay 1 extra Willowlight." },
  { at: 6,  title: "Greenpaw",             perk: "Errands pay 2 extra Willowlight." },
  { at: 10, title: "Moss Warden",          perk: "Errands pay 3 extra, and Marigold takes a tenth off her prices." },
  { at: 15, title: "Willow Keeper",        perk: "Errands pay 4 extra, and Marigold takes a tenth off her prices." },
  { at: 21, title: "Friend of the Willow", perk: "Errands pay 5 extra, and Marigold takes a tenth off her prices." },
];
function willowRank() {
  const n = DEEDS.filter(deedDone).length;
  let idx = 0;
  WILLOW_RANKS.forEach((r, i) => { if (n >= r.at) idx = i; });
  const r = WILLOW_RANKS[idx], nx = WILLOW_RANKS[idx + 1];
  return { idx, title: r.title, perk: r.perk, next: nx ? nx.at : null };
}

const ERRAND_THANKS = [
  "Thank you, truly. You have made a small day a good one.",
  "Just what I needed! The village is lucky to have you.",
  "Wonderful. I will tell the others you are as reliable as the tide.",
  "Oh, bless your paws. Here, a little light for your trouble.",
];
function makeErrand() {
  const who = pick(Object.keys(DATA.villagers));
  const pool = ["acorn", "berry", "wood"];
  if (G.visitedRegions.fernwood) pool.push("moonpetal");
  if (G.visitedRegions.hollows || G.visitedRegions.fernwood) pool.push("mushroom");
  if (G.visitedRegions.thicket) pool.push("thorn");
  const item = pick(pool), n = randInt(2, 4);
  return { day: G.day, who, item, n, wl: 4 + n, done: false };
}

// ---------------- Marigold the peddler ----------------
function peddlerHere() { return G.day % 3 === 0; }

const PEDDLER_BUY = [
  { item: "berry", n: 3, cost: 4 }, { item: "moonpetal", n: 2, cost: 8 }, { item: "mushroom", n: 2, cost: 6 },
  { item: "quartz", n: 1, cost: 10 }, { item: "thorn", n: 3, cost: 6 }, { item: "wood", n: 3, cost: 4 },
  { item: "pollenDraught", n: 1, cost: 12 }, { item: "acornBomb", n: 2, cost: 10 }, { item: "willowleaf", n: 2, cost: 8 },
];
const PEDDLER_SELL = [
  { item: "acorn", n: 5, wl: 5 }, { item: "mushroom", n: 3, wl: 6 }, { item: "wood", n: 4, wl: 5 },
  { item: "berry", n: 4, wl: 5 }, { item: "willowleaf", n: 1, wl: 5 }, { item: "thorn", n: 4, wl: 7 },
];
const PEDDLER_TALK = [
  "Mind the wheels, dearie. Every one of them has been to the far side of the marsh and back.",
  "I only trade in honest goods and slightly dubious stories. Today, mostly the goods.",
  "The Midway tent folk lend me their lanterns. In return I do not mention the hedgehog costume.",
  "Business is brisk! Well, brisk for a hedgehog. Everything is brisk for a hedgehog, in the end.",
  "A tip from the road: acorns keep, berries do not, and moonpetals sulk if you squash them.",
];

function peddlerOffers() {
  const k = Math.floor(G.day / 3);
  const buys = [0, 1, 2].map(i => PEDDLER_BUY[(k * 2 + i * 3) % PEDDLER_BUY.length]);
  const sells = [0, 1].map(i => PEDDLER_SELL[(k + i * 3) % PEDDLER_SELL.length]);
  return { buys, sells };
}

function peddlerBought() {
  const b = G.flags.pedBought;
  return b && b.day === G.day ? b.ids : [];
}
function peddlerMark(id) {
  const ids = peddlerBought().slice(); ids.push(id);
  G.flags.pedBought = { day: G.day, ids };
}

function peddlerCost(o) { return willowRank().idx >= 3 ? Math.max(1, o.cost - Math.max(1, Math.round(o.cost * 0.1))) : o.cost; }

function openPeddler() {
  const { buys, sells } = peddlerOffers();
  const done = peddlerBought();
  const choices = [];
  buys.forEach((o, i) => {
    const id = "b" + i, nm = DATA.items[o.item].name;
    choices.push({
      label: done.includes(id) ? `${nm} x${o.n} (sold out)` : `Buy ${nm} x${o.n} for ${peddlerCost(o)} Willowlight`,
      fn: () => {
        if (done.includes(id)) { toast("That one is sold out for today."); return openPeddler(); }
        if (G.wl < peddlerCost(o)) { toast("Not enough Willowlight for that."); return openPeddler(); }
        G.wl -= peddlerCost(o); addItem(o.item, o.n); peddlerMark(id); G.flags.stat_trades = deedStat("stat_trades") + 1;
        toast(`Bought ${nm} x${o.n}`); saveGame(); openPeddler();
      },
    });
  });
  sells.forEach((o, i) => {
    const id = "s" + i, nm = DATA.items[o.item].name;
    choices.push({
      label: done.includes(id) ? `${nm} x${o.n} (already traded)` : `Sell ${nm} x${o.n} for ${o.wl} Willowlight`,
      fn: () => {
        if (done.includes(id)) { toast("She has all of those she needs today."); return openPeddler(); }
        if (!hasItem(o.item, o.n)) { toast(`You need ${o.n} ${nm} for that.`); return openPeddler(); }
        takeItem(o.item, o.n); G.wl += o.wl; peddlerMark(id); G.flags.stat_trades = deedStat("stat_trades") + 1;
        toast(`Sold ${nm} x${o.n} (+${o.wl} Willowlight)`); saveGame(); openPeddler();
      },
    });
  });
  const surprise = "surprise";
  choices.push({
    label: done.includes(surprise) ? "Peddler's Surprise (opened)" : "Peddler's Surprise for 10 Willowlight",
    fn: () => {
      if (done.includes(surprise)) { toast("You already opened today's surprise."); return openPeddler(); }
      if (G.wl < 10) { toast("Not enough Willowlight for that."); return openPeddler(); }
      const it = pick(["quartz", "moonpetal", "mushroom", "willowleaf", "pollenDraught"]);
      G.wl -= 10; addItem(it, 1); peddlerMark(surprise); G.flags.stat_trades = deedStat("stat_trades") + 1;
      toast(`The parcel holds: ${DATA.items[it].name}`); saveGame(); openPeddler();
    },
  });
  choices.push({ label: "Just looking, thank you", fn: () => {} });
  const trades = deedStat("stat_trades");
  const line = trades >= 5 && trades % 2 === 1
    ? "Back again, my best customer! The good stuff is under the blue cloth, as always."
    : PEDDLER_TALK[(G.day / 3 + trades) % PEDDLER_TALK.length | 0];
  openDialogue("Marigold Fennelwick", line + ` (You have ${G.wl} Willowlight.)`, choices);
}

function drawPeddlerCart(ctx, x, y, t) {
  const sway = Math.sin(t * 1.4) * 0.6;
  // shadow and wheels
  ctx.fillStyle = "rgba(0,0,0,.28)"; ctx.beginPath(); ctx.ellipse(x, y + 30, 70, 11, 0, 0, Math.PI * 2); ctx.fill();
  for (const wx of [-42, 44]) {
    ctx.strokeStyle = "#3a2414"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(x + wx, y + 20, 14, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = "#6b4526"; ctx.lineWidth = 1.6;
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; ctx.beginPath(); ctx.moveTo(x + wx, y + 20); ctx.lineTo(x + wx + Math.cos(a) * 13, y + 20 + Math.sin(a) * 13); ctx.stroke(); }
  }
  // cart bed
  const g = ctx.createLinearGradient(0, y - 4, 0, y + 24);
  g.addColorStop(0, "#9a6a3c"); g.addColorStop(1, "#5e3b20");
  ctx.fillStyle = g; ctx.strokeStyle = "rgba(20,12,8,.6)"; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x - 62, y - 2, 124, 28, 5) : ctx.rect(x - 62, y - 2, 124, 28); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = "rgba(0,0,0,.25)"; ctx.lineWidth = 1;
  for (let i = 1; i < 5; i++) { ctx.beginPath(); ctx.moveTo(x - 62 + i * 25, y - 2); ctx.lineTo(x - 62 + i * 25, y + 26); ctx.stroke(); }
  // goods on the counter: crates, jars, a basket of berries
  ctx.fillStyle = "#c9a25a"; ctx.fillRect(x - 54, y - 14, 26, 13); ctx.strokeStyle = "rgba(20,12,8,.5)"; ctx.strokeRect(x - 54, y - 14, 26, 13);
  ctx.fillStyle = "#b02e5a"; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(x - 50 + i * 5, y - 16, 3, 0, Math.PI * 2); ctx.fill(); }
  for (const [jx, col] of [[x - 14, "#7fe0d0"], [x + 2, "#ffd98a"], [x + 18, "#f2a6c8"]]) {
    ctx.fillStyle = "rgba(230,240,240,.55)"; ctx.fillRect(jx - 5, y - 18, 10, 17);
    ctx.fillStyle = col; ctx.fillRect(jx - 4, y - 12, 8, 10);
    ctx.fillStyle = "#6b4526"; ctx.fillRect(jx - 5, y - 20, 10, 3);
  }
  ctx.fillStyle = "#5f7a3a"; ctx.beginPath(); ctx.ellipse(x + 44, y - 8, 13, 8, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "rgba(20,12,8,.5)"; ctx.stroke();
  // awning on two poles
  ctx.strokeStyle = "#5e3b20"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x - 58, y - 2); ctx.lineTo(x - 58, y - 58); ctx.moveTo(x + 58, y - 2); ctx.lineTo(x + 58, y - 58); ctx.stroke();
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = i % 2 ? "#f4ecd6" : "#4f8f9a";
    ctx.beginPath(); ctx.moveTo(x - 66 + i * 16.5, y - 60); ctx.lineTo(x - 66 + (i + 1) * 16.5, y - 60); ctx.lineTo(x - 66 + (i + 1) * 16.5 + 2, y - 44); ctx.lineTo(x - 66 + i * 16.5 - 2, y - 44); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.arc(x - 66 + i * 16.5 + 8.2, y - 44, 8.5, 0, Math.PI); ctx.fill();
  }
  ctx.strokeStyle = "rgba(20,12,8,.5)"; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(x - 66, y - 60); ctx.lineTo(x + 66, y - 60); ctx.stroke();
  // hanging pots and a lantern
  ctx.strokeStyle = "#3a2414"; ctx.lineWidth = 1;
  for (const [hx, col] of [[x - 40, "#b5833c"], [x - 30, "#8fd17a"], [x + 36, "#c23a6b"]]) {
    ctx.beginPath(); ctx.moveTo(hx, y - 44); ctx.lineTo(hx + sway, y - 34); ctx.stroke();
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(hx + sway, y - 30, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
  const lg = ctx.createRadialGradient(x + 14, y - 34, 0, x + 14, y - 34, 26);
  lg.addColorStop(0, "rgba(255,210,120,.55)"); lg.addColorStop(1, "rgba(255,210,120,0)");
  ctx.fillStyle = lg; ctx.fillRect(x - 12, y - 60, 52, 52);
  ctx.fillStyle = "#ffd98a"; ctx.fillRect(x + 11, y - 40, 6, 9); ctx.strokeStyle = "#3a2414"; ctx.strokeRect(x + 11, y - 40, 6, 9);
  // Marigold, standing behind the counter
  ctx.save(); ctx.translate(x - 6, y - 24); ctx.scale(1.1, 1.1);
  drawAnimalLocal(ctx, "hedgehog", "#9a7a5a", 1, Math.sin(t * 2.4) * 0.8, 0, { blink: (t % 5) < 0.12, t });
  ctx.restore();
  // a little sign
  ctx.fillStyle = "rgba(20,26,18,.62)"; ctx.fillRect(x - 46, y + 36, 92, 17);
  ctx.fillStyle = "#fff6dc"; ctx.font = "12px Georgia"; ctx.textAlign = "center"; ctx.fillText("Marigold's Cart", x, y + 49);
}

VIL_POINTS.push({ id: "peddler", kind: "peddler", label: "Marigold's Cart", x: 1130, y: 800, r: 56, when: peddlerHere });

DATA.notices.push(
  { text: "Marigold Fennelwick's cart rolls in every third day, with odds, ends and the occasional surprise parcel. Look for it at the southern edge of the village.", when: () => true },
  { text: "The Deeds page in your menu keeps a gentle list of things to try. Each pays a little Willowlight, once.", when: () => true }
);
