// More of the village: a Wishing Well, a Notice Board that reads your progress back to you,
// flower beds and a scarecrow. Loads after world.js, so it can add to the village points.

// ---------- Wishing Well: one wish per village day ----------
DATA.wishes = [
  { text: "You drop a moonpetal petal in. It sinks slowly, and the water hums for a moment. A little light rises back to you. +4 Willowlight.", wl: 4 },
  { text: "A cold coin of light floats up from the depths and settles in your palm. +6 Willowlight.", wl: 6 },
  { text: "Your reflection smiles back at you, and something warm settles in your chest. Health restored to full.", heal: true },
  { text: "A bundle of berries bobs up on the water, as if it were always meant for you. +2 berries.", item: ["berry", 2] },
  { text: "The water asks for nothing and gives you an acorn in return. +1 acorn.", item: ["acorn", 1] },
  { text: "You hear the Willow's roots whispering down in the dark. The wish is kept safe. +3 Willowlight.", wl: 3 },
];

function makeWish() {
  if (G.flags.wellDay === G.day) {
    toast("The well is still rippling from your last wish. Come back tomorrow.");
    return;
  }
  G.flags.wellDay = G.day;
  G.flags.wishes = (G.flags.wishes || 0) + 1;
  const w = DATA.wishes[(G.day - 1 + G.flags.wishes) % DATA.wishes.length];
  if (w.wl) addWillowlight(w.wl);
  if (w.item) addItem(w.item[0], w.item[1]);
  if (w.heal) G.hp = G.maxHp;
  openDialogue("Wishing Well", w.text, null);
  saveGame();
}

// ---------- Notice Board: posts that change as the village changes ----------
DATA.notices = [
  { text: "LOST: one silverbell, last seen near the creek. Please return it to Posy, who is very worried.", when: () => !flag("silverbellDelivered") },
  { text: "The forge is open again. Brindle asks that you bring thorns that are dry. Wet thorns, he says, are an insult to the fire.", when: () => true },
  { text: "Stone Skip Creek: the best throw so far is pinned to the bank in pebbles. Beat it if you can.", when: () => (G.flags.skipBest || 0) >= 1 },
  { text: "The Mole Hills are open. Please keep your paws out of the dormice's tunnels. The dormice have complained.", when: () => true },
  { text: "The squirrel's stash is hidden beneath the stump. Do not eat it. It is counted.", when: () => true },
  { text: "Reminder: the Great Willow rests in the evening. Please keep your voices low near the roots.", when: () => true },
  { text: "The Starfall Meadow is glowing again. Please bring back any shards you find, and do not step on the sleeping ones.", when: () => !!G.visitedRegions.starfall },
  { text: "WANTED: someone to tend the Willow's roots. Reward offered in Willowlight. Ask at the bench under the bell.", when: () => willowOwned("vitality") },
  { text: "The squirrel thanks whoever remembered her stash. She has hidden three extra acorns somewhere in the village for you to find.", when: () => (G.flags.acornBest || 0) >= 1 },
  { text: "Season festivals are coming. Bring a nice pebble for the lantern line, and the Willow will light the way.", when: () => true },
];

function readNotices() {
  const ok = DATA.notices.filter(n => n.when());
  const n = ok[(G.day - 1) % ok.length];
  const er = G.flags.errand;
  const choices = [];
  let text = n.text;
  if (er && er.day === G.day) {
    const v = DATA.villagers[er.who], nm = DATA.items[er.item].name;
    text += er.done ? `\n\nToday's errand for ${v.name} is done. Thank you!` : `\n\nTODAY'S ERRAND: ${v.name} would love ${er.n} ${nm}. Bring them over and say hello. Reward: ${er.wl} Willowlight.`;
  } else if (typeof makeErrand === "function") {
    const e = makeErrand();
    const v = DATA.villagers[e.who], nm = DATA.items[e.item].name;
    text += `\n\nA small card is pinned beneath it: ${v.name} needs ${e.n} ${nm} today.`;
    choices.push({ label: "Take the errand", fn: () => { G.flags.errand = e; toast(`Errand taken: bring ${e.n} ${nm} to ${v.name}.`); saveGame(); } });
    choices.push({ label: "Not today", fn: () => {} });
  }
  openDialogue("Village Notice Board", text, choices.length ? choices : null);
}

// ---------- Decor ----------
// Small helper: a rounded stone with a lit top edge and a shaded underside.
function drawStone(ctx, x, y, w, h, base) {
  const g = ctx.createLinearGradient(x, y - h / 2, x, y + h / 2);
  g.addColorStop(0, shadeHex(base, 1.25));
  g.addColorStop(0.55, base);
  g.addColorStop(1, shadeHex(base, 0.6));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(x, y, w / 2, h / 2, 0, 0, Math.PI * 2); ctx.fill();
}

// A wishing well in the style of an old stone well: a fieldstone base with a plaque, a green
// painted rim, a bed of water with leaves and petals drifting on it, iron scroll posts, and a
// small tiled canopy over the top.
function drawWishingWell(ctx, x, y, t) {
  // ground shadow
  ctx.fillStyle = "rgba(0,0,0,.3)";
  ctx.beginPath(); ctx.ellipse(x + 6, y + 14, 30, 10, 0, 0, Math.PI * 2); ctx.fill();

  // stone base: a cylinder of fieldstone, dark at the right edge
  const wallTop = y - 4, wallBot = y + 13;
  const stone = ctx.createLinearGradient(x - 24, 0, x + 24, 0);
  stone.addColorStop(0, "#77736c"); stone.addColorStop(0.45, "#9c978f"); stone.addColorStop(1, "#4e4b46");
  ctx.fillStyle = stone;
  ctx.beginPath();
  ctx.ellipse(x, wallTop, 24, 8.5, 0, Math.PI, 0);
  ctx.lineTo(x + 24, wallBot);
  ctx.ellipse(x, wallBot, 24, 8.5, 0, 0, Math.PI);
  ctx.closePath(); ctx.fill();
  // irregular stones in two courses
  for (let row = 0; row < 2; row++) {
    const yy = wallTop + 7 + row * 7;
    for (let i = -2; i <= 2; i++) {
      const sx = x + (i + (row % 2 ? 0.5 : 0)) * 10;
      if (Math.abs(sx - x) > 21) continue;
      drawStone(ctx, sx, yy, 9, 5.5, ((i * 5 + row * 3) & 1) ? "#8a857d" : "#a29d95");
    }
    ctx.strokeStyle = "rgba(30,28,26,.5)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x - 24, yy + 3.5); ctx.lineTo(x + 24, yy + 3.5); ctx.stroke();
  }
  // lichen and moss
  ctx.fillStyle = "rgba(190,200,140,.7)";
  ctx.beginPath(); ctx.ellipse(x - 15, wallTop + 12, 2.5, 1.6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#5f8a45";
  ctx.beginPath(); ctx.ellipse(x + 17, wallTop + 10, 2.5, 2, 0, 0, Math.PI * 2); ctx.fill();
  // a bronze-coloured plaque with engraved lines
  ctx.fillStyle = "#4a4640";
  ctx.fillRect(x - 12, wallTop + 8, 24, 10);
  ctx.strokeStyle = "rgba(200,180,120,.6)"; ctx.lineWidth = 0.8;
  for (let l = 0; l < 3; l++) { ctx.beginPath(); ctx.moveTo(x - 9, wallTop + 10 + l * 2.5); ctx.lineTo(x + 9, wallTop + 10 + l * 2.5); ctx.stroke(); }

  // green painted rim, with flakes showing the stone beneath
  ctx.fillStyle = "#2f6a40";
  ctx.beginPath(); ctx.ellipse(x, wallTop - 2, 27, 10, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#4c8c58";
  ctx.beginPath(); ctx.ellipse(x, wallTop - 4, 25, 8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(160,190,130,.5)";
  for (const [fx, fy, fw] of [[-18, -4, 3], [10, -6, 2.5], [20, -1, 2], [-6, 0, 2]]) {
    ctx.beginPath(); ctx.ellipse(x + fx, wallTop + fy, fw, 1.2, 0, 0, Math.PI * 2); ctx.fill();
  }
  // the dark water inside the rim
  const water = ctx.createRadialGradient(x - 4, wallTop - 5, 2, x, wallTop - 4, 19);
  water.addColorStop(0, "#3d6a52"); water.addColorStop(0.7, "#22443a"); water.addColorStop(1, "#142a24");
  ctx.fillStyle = water;
  ctx.beginPath(); ctx.ellipse(x, wallTop - 4, 19, 6.2, 0, 0, Math.PI * 2); ctx.fill();
  // leaves and petals drifting on the water
  ctx.save();
  ctx.beginPath(); ctx.ellipse(x, wallTop - 4, 19, 6.2, 0, 0, Math.PI * 2); ctx.clip();
  const drift = Math.sin(t * 0.7) * 3;
  ctx.fillStyle = "#c8702e";
  ctx.beginPath(); ctx.ellipse(x - 6 + drift, wallTop - 5, 4.5, 2.2, 0.4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#e0c040";
  ctx.beginPath(); ctx.ellipse(x + 5 - drift * 0.6, wallTop - 3, 3.6, 1.8, -0.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#e88aa8";
  for (const [px, py] of [[x - 1 + drift * 0.4, wallTop - 1], [x + 8, wallTop - 6], [x - 10, wallTop - 2]]) {
    ctx.beginPath(); ctx.ellipse(px, py, 1.8, 1, 0.6, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();

  // iron scroll posts rising from the rim, with curled tops
  const postTop = wallTop - 46;
  ctx.strokeStyle = "#dedad0"; ctx.lineWidth = 3;
  for (const side of [-1, 1]) {
    const px = x + side * 19;
    ctx.beginPath(); ctx.moveTo(px, wallTop - 4); ctx.lineTo(px, postTop); ctx.stroke();
    ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.arc(px + side * 5, postTop + 2, 5, side < 0 ? Math.PI : 0, side < 0 ? Math.PI * 2 : Math.PI, side < 0); ctx.stroke();
    ctx.lineWidth = 3;
    // rust spots
    ctx.fillStyle = "rgba(160,96,58,.7)";
    ctx.beginPath(); ctx.ellipse(px, wallTop - 14, 1.2, 2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(px, postTop + 14, 1, 1.6, 0, 0, Math.PI * 2); ctx.fill();
  }

  // canopy: a small tiled roof with a scalloped leafy edge, sitting on the posts
  const roofBase = postTop - 2, roofPeak = postTop - 22;
  const roof = ctx.createLinearGradient(0, roofPeak, 0, roofBase);
  roof.addColorStop(0, "#3e7a4e"); roof.addColorStop(1, "#24502f");
  ctx.fillStyle = roof;
  ctx.beginPath(); ctx.moveTo(x - 30, roofBase); ctx.lineTo(x, roofPeak); ctx.lineTo(x + 30, roofBase); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "rgba(10,30,18,.5)"; ctx.lineWidth = 1;
  for (let r = 0; r < 3; r++) {
    const ly = roofPeak + 6 + r * 5;
    const half = (ly - roofPeak) * 1.36;
    ctx.beginPath(); ctx.moveTo(x - half, ly); ctx.lineTo(x + half, ly); ctx.stroke();
  }
  // leafy scallops along the eaves
  ctx.fillStyle = "#4f9a5a";
  for (let k = -4; k <= 4; k++) {
    ctx.beginPath(); ctx.arc(x + k * 7, roofBase + 1, 4, 0, Math.PI); ctx.fill();
  }
  // a small lantern hanging from the roof centre
  const lanternY = roofBase + 6 + Math.sin(t * 1.5) * 0.5;
  const halo = ctx.createRadialGradient(x, lanternY, 2, x, lanternY, 20);
  halo.addColorStop(0, "rgba(255,210,130,.45)"); halo.addColorStop(1, "rgba(255,210,130,0)");
  ctx.fillStyle = halo;
  ctx.beginPath(); ctx.arc(x, lanternY, 20, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#ffd98a";
  ctx.beginPath(); ctx.ellipse(x, lanternY, 2.5, 3, 0, 0, Math.PI * 2); ctx.fill();
}

// A white lighthouse on the village rise, with a glowing lantern room and a beam that sweeps the ground.
function drawLighthouse(ctx, x, y, t) {
  const H = 170, bw = 24, tw = 14;
  // shadow
  ctx.fillStyle = "rgba(0,0,0,.28)";
  ctx.beginPath(); ctx.ellipse(x + 16, y + 3, 36, 9, 0, 0, Math.PI * 2); ctx.fill();
  // tapered white tower, lit from the left
  const body = ctx.createLinearGradient(x - bw, 0, x + bw, 0);
  body.addColorStop(0, "#c9c6bd"); body.addColorStop(0.35, "#ffffff"); body.addColorStop(0.8, "#d8d5cc"); body.addColorStop(1, "#8e8a82");
  ctx.fillStyle = body;
  ctx.beginPath(); ctx.moveTo(x - bw, y); ctx.lineTo(x - tw, y - H); ctx.lineTo(x + tw, y - H); ctx.lineTo(x + bw, y); ctx.closePath(); ctx.fill();
  // a painted band near the top, and a few weathered marks
  ctx.fillStyle = "rgba(170,60,50,.75)";
  ctx.beginPath(); ctx.moveTo(x - tw - 1.5, y - H + 26); ctx.lineTo(x + tw + 1.5, y - H + 26); ctx.lineTo(x + tw + 1, y - H + 32); ctx.lineTo(x - tw - 1, y - H + 32); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "rgba(120,115,105,.25)";
  for (let i = 0; i < 14; i++) ctx.fillRect(x - 16 + (i * 7) % 30, y - 20 - (i * 11) % 130, 2, 2);
  // windows, glowing faintly
  for (const wy of [40, 84, 124]) {
    const ratio = 1 - (wy / H) * 0.35;
    const wx = x - 3 * ratio, ww = 6 * ratio;
    ctx.fillStyle = "#4a5560";
    ctx.fillRect(wx, y - wy - 8, ww, 12);
    ctx.fillStyle = "rgba(255,220,140,.7)";
    ctx.fillRect(wx + 1, y - wy - 7, ww - 2, 10);
  }
  // the arched door at the base
  ctx.fillStyle = "#4a3a2a";
  ctx.beginPath(); ctx.moveTo(x - 6, y); ctx.lineTo(x - 6, y - 20); ctx.arc(x, y - 20, 6, Math.PI, 0); ctx.lineTo(x + 6, y); ctx.closePath(); ctx.fill();
  // gallery platform with a railing
  ctx.fillStyle = "#d9d6cc";
  ctx.beginPath(); ctx.ellipse(x, y - H, tw + 6, 3.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#f2f0ea"; ctx.lineWidth = 1.2;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const px = x + Math.cos(a) * (tw + 5), py = y - H + Math.sin(a) * 3.2;
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py - 7); ctx.stroke();
  }
  ctx.beginPath(); ctx.ellipse(x, y - H - 7, tw + 5, 3, 0, 0, Math.PI * 2); ctx.stroke();
  // lantern room: glass with a warm light inside, flickering slightly
  const flicker = 0.85 + 0.15 * Math.sin(t * 7);
  const glass = ctx.createLinearGradient(x - 9, 0, x + 9, 0);
  glass.addColorStop(0, "#9cc8d6"); glass.addColorStop(0.5, "#ffe9a8"); glass.addColorStop(1, "#7fa8b8");
  ctx.fillStyle = glass;
  ctx.fillRect(x - 9, y - H - 26, 18, 22);
  ctx.strokeStyle = "#5a6a72"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x, y - H - 26); ctx.lineTo(x, y - H - 4); ctx.moveTo(x - 9, y - H - 15); ctx.lineTo(x + 9, y - H - 15); ctx.stroke();
  // dome roof and a small finial
  ctx.fillStyle = "#3a4a52";
  ctx.beginPath(); ctx.ellipse(x, y - H - 26, 11, 8, 0, Math.PI, 0); ctx.fill();
  ctx.strokeStyle = "#3a4a52"; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(x, y - H - 34); ctx.lineTo(x, y - H - 42); ctx.stroke();
  // halo around the lantern
  const lightY = y - H - 15;
  const halo = ctx.createRadialGradient(x, lightY, 4, x, lightY, 60);
  halo.addColorStop(0, `rgba(255,236,170,${0.55 * flicker})`); halo.addColorStop(1, "rgba(255,236,170,0)");
  ctx.fillStyle = halo;
  ctx.beginPath(); ctx.arc(x, lightY, 60, 0, Math.PI * 2); ctx.fill();
  // a beam sweeping slowly across the village
  const a = t * 0.55;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const spread = 0.12, len = 420;
  const bx = x + Math.cos(a) * len, by = lightY + Math.sin(a) * len * 0.45;
  const beam = ctx.createLinearGradient(x, lightY, bx, by);
  beam.addColorStop(0, `rgba(255,240,190,${0.22 * flicker})`); beam.addColorStop(1, "rgba(255,240,190,0)");
  ctx.fillStyle = beam;
  ctx.beginPath(); ctx.moveTo(x, lightY);
  ctx.lineTo(x + Math.cos(a - spread) * len, lightY + Math.sin(a - spread) * len * 0.45);
  ctx.lineTo(x + Math.cos(a + spread) * len, lightY + Math.sin(a + spread) * len * 0.45);
  ctx.closePath(); ctx.fill();
  ctx.restore();
  ctx.fillStyle = `rgba(255,236,170,${flicker})`;
  ctx.beginPath(); ctx.arc(x, lightY, 5, 0, Math.PI * 2); ctx.fill();
}

// A wooden notice board: three planks, carved header, nails and pinned notices.
function drawNoticeBoard(ctx, x, y, t) {
  ctx.fillStyle = "rgba(0,0,0,.28)";
  ctx.beginPath(); ctx.ellipse(x + 5, y + 27, 22, 6, 0, 0, Math.PI * 2); ctx.fill();
  // posts with a little grain
  const post = ctx.createLinearGradient(x - 17, 0, x - 9, 0);
  post.addColorStop(0, "#3a2818"); post.addColorStop(0.5, "#6a4a2e"); post.addColorStop(1, "#3a2818");
  ctx.fillStyle = post;
  ctx.fillRect(x - 17, y + 2, 5, 25); ctx.fillRect(x + 12, y + 2, 5, 25);
  // board: three planks with seams
  const bx = x - 24, by = y - 28, bw = 48, bh = 32;
  const plank = ctx.createLinearGradient(0, by, 0, by + bh);
  plank.addColorStop(0, "#9b7548"); plank.addColorStop(1, "#6b4c2c");
  ctx.fillStyle = plank;
  ctx.fillRect(bx, by, bw, bh);
  ctx.strokeStyle = "rgba(40,24,12,.55)"; ctx.lineWidth = 1;
  for (let i = 1; i < 3; i++) { ctx.beginPath(); ctx.moveTo(bx + i * bw / 3, by); ctx.lineTo(bx + i * bw / 3, by + bh); ctx.stroke(); }
  ctx.strokeStyle = "rgba(255,230,180,.12)";
  ctx.beginPath(); ctx.moveTo(bx + 2, by + 3); ctx.lineTo(bx + bw - 2, by + 3); ctx.stroke();
  ctx.strokeStyle = "#4a3018"; ctx.lineWidth = 2;
  ctx.strokeRect(bx, by, bw, bh);
  // a carved header and corner nails
  ctx.fillStyle = "#d9b77c"; ctx.font = "bold 7px Georgia"; ctx.textAlign = "center";
  ctx.fillText("NOTICES", x, by + 7);
  ctx.textAlign = "left";
  ctx.fillStyle = "#2a1a0c";
  for (const [nx, ny] of [[bx + 3, by + 3], [bx + bw - 3, by + 3], [bx + 3, by + bh - 3], [bx + bw - 3, by + bh - 3]]) {
    ctx.beginPath(); ctx.arc(nx, ny, 1.1, 0, Math.PI * 2); ctx.fill();
  }
  // pinned paper with coloured tacks, each one fluttering a little
  const papers = [[-16, -12, 13, 11, "#f6efd9", "#c0392b"], [1, -14, 12, 10, "#f2ead0", "#3a7bc0"], [-10, 1, 14, 9, "#f8f1dc", "#d4a017"], [5, 2, 11, 10, "#efe6c8", "#6a9a3a"]];
  papers.forEach(([dx, dy, w, h, paper, tack], i) => {
    const flutter = Math.sin(t * 2 + i * 1.7) * 0.05;
    ctx.save();
    ctx.translate(x + dx + w / 2, y + dy + h / 2); ctx.rotate(flutter + (i % 2 ? 0.04 : -0.04));
    ctx.fillStyle = "rgba(0,0,0,.2)"; ctx.fillRect(-w / 2 + 1, -h / 2 + 1, w, h);
    ctx.fillStyle = paper; ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.strokeStyle = "rgba(90,70,40,.5)"; ctx.lineWidth = 0.8;
    for (let l = 0; l < 3; l++) { ctx.beginPath(); ctx.moveTo(-w / 2 + 2, -h / 2 + 3 + l * 2.5); ctx.lineTo(w / 2 - 2, -h / 2 + 3 + l * 2.5); ctx.stroke(); }
    ctx.fillStyle = tack;
    ctx.beginPath(); ctx.arc(0, -h / 2 + 1, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  });
}

// A low bed of flowers on a stone border, with leaves and blooms that sway.
function drawFlowerBed(ctx, x, y, t) {
  // soil with a lit edge
  const soil = ctx.createLinearGradient(0, y - 8, 0, y + 10);
  soil.addColorStop(0, "#6e4a2c"); soil.addColorStop(1, "#3e2814");
  ctx.fillStyle = soil;
  ctx.beginPath(); ctx.ellipse(x, y + 3, 34, 11, 0, 0, Math.PI * 2); ctx.fill();
  // stone border
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    drawStone(ctx, x + Math.cos(a) * 34, y + 3 + Math.sin(a) * 11, 6, 4, i % 2 ? "#8b8680" : "#78736d");
  }
  // leaves at the base
  ctx.fillStyle = "#2f6a2a";
  for (let i = 0; i < 10; i++) {
    const lx = x - 26 + (i * 13) % 52, ly = y + 1 + (i * 5) % 6;
    ctx.beginPath(); ctx.ellipse(lx, ly, 4, 2, (i % 3) - 1, 0, Math.PI * 2); ctx.fill();
  }
  // flowers: stems, leaves and five-petalled heads
  const colours = ["#f28fb0", "#ffd27a", "#b9d3ff", "#ffb4a2", "#e7a0ff"];
  for (let i = 0; i < 16; i++) {
    const fx = x - 24 + (i * 11) % 48, fy = y - 1 + (i * 7) % 7;
    const sway = Math.sin(t * 1.6 + i * 0.9) * 1.6;
    const h = 8 + (i % 4) * 2;
    ctx.strokeStyle = "#3f7a36"; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(fx, fy); ctx.quadraticCurveTo(fx + sway * 0.4, fy - h / 2, fx + sway, fy - h); ctx.stroke();
    const hx = fx + sway, hy = fy - h;
    ctx.fillStyle = colours[i % colours.length];
    for (let p = 0; p < 5; p++) {
      const pa = (p / 5) * Math.PI * 2 + t * 0.2;
      ctx.beginPath(); ctx.arc(hx + Math.cos(pa) * 2.4, hy + Math.sin(pa) * 2.4, 1.8, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = "#ffe9a0";
    ctx.beginPath(); ctx.arc(hx, hy, 1.2, 0, Math.PI * 2); ctx.fill();
  }
}

// A scarecrow in a straw patch: burlap body with stitching and buttons, a hat with a
// shaded brim, and straw poking out at the cuffs and the hat.
function drawScarecrow(ctx, x, y, t) {
  ctx.fillStyle = "rgba(0,0,0,.28)";
  ctx.beginPath(); ctx.ellipse(x + 5, y + 26, 20, 6, 0, 0, Math.PI * 2); ctx.fill();
  // straw bale base
  const straw = ctx.createRadialGradient(x, y + 18, 2, x, y + 18, 22);
  straw.addColorStop(0, "#e2c77c"); straw.addColorStop(1, "#8a6a2c");
  ctx.fillStyle = straw;
  ctx.beginPath(); ctx.ellipse(x, y + 20, 19, 6, 0, 0, Math.PI * 2); ctx.fill();
  // pole
  ctx.fillStyle = "#4a3122";
  ctx.fillRect(x - 2, y - 22, 4, 46);
  // crossbar arms
  ctx.fillRect(x - 17, y - 12, 34, 4);
  // burlap body with shading and stitching
  const body = ctx.createLinearGradient(x - 9, 0, x + 9, 0);
  body.addColorStop(0, "#9c7a4e"); body.addColorStop(0.5, "#bfa070"); body.addColorStop(1, "#7a5c36");
  ctx.fillStyle = body;
  ctx.beginPath(); ctx.moveTo(x - 9, y - 12); ctx.lineTo(x + 9, y - 12); ctx.lineTo(x + 10, y + 6); ctx.lineTo(x - 10, y + 6); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "rgba(60,40,20,.5)"; ctx.setLineDash([2, 2]); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x, y - 10); ctx.lineTo(x, y + 4); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = "#3a2a18";
  ctx.beginPath(); ctx.arc(x - 3, y - 4, 1, 0, Math.PI * 2); ctx.arc(x + 3, y - 4, 1, 0, Math.PI * 2); ctx.fill();
  // straw cuffs at the wrists
  ctx.fillStyle = "#d8b860";
  for (const sx of [x - 17, x + 17]) {
    for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(sx, y - 10); ctx.lineTo(sx + k * 1.5 + (sx < x ? -3 : 3), y - 14 + Math.sin(t * 2 + k) * 0.6); ctx.lineTo(sx + k * 1.5, y - 9); ctx.fill(); }
  }
  // head: burlap with a face, straw hair
  ctx.fillStyle = "#dcc48c";
  ctx.beginPath(); ctx.arc(x, y - 20, 7.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#2a1f12";
  ctx.beginPath(); ctx.arc(x - 2.5, y - 21, 1, 0, Math.PI * 2); ctx.arc(x + 2.5, y - 21, 1, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#2a1f12"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(x, y - 18, 2, 0.2, Math.PI - 0.2); ctx.stroke();
  // hat: a crown and a shaded brim that nods in the breeze
  const nod = Math.sin(t * 1.2) * 1.2;
  const brim = ctx.createLinearGradient(0, y - 32, 0, y - 26);
  brim.addColorStop(0, "#7a5a36"); brim.addColorStop(1, "#4a3420");
  ctx.fillStyle = brim;
  ctx.beginPath(); ctx.ellipse(x + nod, y - 28, 13, 3.4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#5a4128";
  ctx.fillRect(x - 6 + nod, y - 38, 12, 10);
  ctx.fillStyle = "#8a3a2a";
  ctx.fillRect(x - 6 + nod, y - 30, 12, 2);
}

// Two lamp posts along the village path, with a warm glow that flickers softly.
function drawLampPost(ctx, x, y, t) {
  ctx.fillStyle = "rgba(0,0,0,.25)";
  ctx.beginPath(); ctx.ellipse(x + 3, y + 3, 6, 2.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#2e2a26";
  ctx.fillRect(x - 2, y - 40, 4, 42);
  ctx.beginPath(); ctx.ellipse(x, y, 5, 2.5, 0, 0, Math.PI * 2); ctx.fill();
  const flicker = 0.85 + 0.15 * Math.sin(t * 9 + x);
  const glow = ctx.createRadialGradient(x, y - 44, 2, x, y - 44, 46);
  glow.addColorStop(0, `rgba(255,220,140,${0.5 * flicker})`); glow.addColorStop(1, "rgba(255,220,140,0)");
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(x, y - 44, 46, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#2e2a26";
  ctx.beginPath(); ctx.moveTo(x - 6, y - 40); ctx.lineTo(x + 6, y - 40); ctx.lineTo(x + 4, y - 48); ctx.lineTo(x - 4, y - 48); ctx.closePath(); ctx.fill();
  ctx.fillStyle = `rgba(255,236,170,${flicker})`;
  ctx.beginPath(); ctx.ellipse(x, y - 44, 3, 4, 0, 0, Math.PI * 2); ctx.fill();
}

// ---------- Village points ----------
VIL_POINTS.push(
  { id: "well", kind: "well", label: "Wishing Well", x: 610, y: 590, r: 46 },
  { id: "board", kind: "board", label: "Notice Board", x: 410, y: 380, r: 46 }
);
