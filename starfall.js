// The Starfall Meadow: a night region where the sky's pieces came down into the grass.
// Adds its items, enemies, region, gate, quest, depth lore, journal entries and a craft recipe.

DATA.items.starshard = { name: "Starshard", icon: "✧", color: "#c8d8ff", desc: "A cold shard that fell from the sky. It hums faintly when held." };
DATA.items.starLamp = { name: "Starlight Lantern", icon: "✦", color: "#dfe9ff", desc: "Catches a little starlight in a glass chimney. Decor." };

DATA.recipes.push(
  { id: "starLamp", out: "starLamp", n: 1, needs: { starshard: 2, wood: 1 }, station: "workshop", unlockedBy: "villager_ash" }
);

Object.assign(DATA.enemies, {
  starSprite: { name: "Star Sprite", color: "#b8c8ff", hp: 34, dmg: 10, speed: 72, size: 10, xp: 3, drops: { starshard: [0, 1], moonpetal: [1, 1] } },
  meteorBeetle: { name: "Meteor Beetle", color: "#5a5068", hp: 130, dmg: 14, speed: 24, size: 22, xp: 5, drops: { quartz: [1, 2], starshard: [0, 1] } },
  starwarden: { name: "Starwarden", color: "#7f9ee8", hp: 380, dmg: 17, speed: 26, size: 46, boss: true, drops: { starshard: [3, 4], quartz: [2, 3] }, wl: 12,
    intro: "The meadow goes dark as a moth of woven starlight unfolds above the grass. The Starwarden has guarded the fallen stars since the sky broke, and it lowers its wings toward you, slowly and unwillingly." },
});

DATA.regions.starfall = {
  name: "The Starfall Meadow", bg: ["#1c2656", "#070a1c"],
  enemies: ["starSprite", "moonWisp"], deepEnemies: ["meteorBeetle"], deepFrom: 2,
  gather: ["moonpetal", "silverbell", "quartz", "wood"], density: 6,
  boss: false, depth: true, maxDepth: 3, bossKind: "starwarden",
  hazards: { 2: "coldDraft", 3: "gloom" },
};

DATA.gates.starfall = {
  open: () => willowOwned("spiritbond"), short: "Needs Spirit Bond",
  msg: "A veil of starlight hangs over the meadow. Awaken the Spirit Bond at the Willow to see through it.",
};

DATA.quests.starfall = {
  title: "Where the Stars Fall",
  steps: [
    { text: "Walk into the Starfall Meadow", check: "flag:starfallEntered" },
    { text: "Defeat the Starwarden", check: "flag:starwardenDown" },
  ],
};

// Index 0 = depth 2, index 1 = depth 3.
DATA.depthLore.starfall = [
  "The grass is silver underfoot. Fallen stars lie in shallow craters, still warm, and they hum like sleeping bees.",
  "The cold deepens. Here the stars have sunk into the soil, and the roots around them glow faintly, as if they are learning to shine.",
];

DATA.lore.push(
  { title: "Where the Stars Fall", text: "Long ago the sky split, and its pieces landed in this meadow. The Willow caught the light that fell and kept it in the grass.", unlock: () => !!G.visitedRegions.starfall },
  { title: "The Starwarden's Vigil", text: "The moth of starlight never slept. It guarded the fallen stars because nobody else would, and at the end it was glad to be let go.", unlock: () => flag("starwardenDown") },
);

// Ground and sky for the Starfall Meadow rooms (called from main.js).
function drawStarfallGround(t) {
  ctx.strokeStyle = "rgba(160,190,255,.12)"; ctx.lineWidth = 1;
  for (let i = 0; i < 4; i++) {
    const x0 = (i * 233) % ROOM_W, y0 = (i * 157) % ROOM_H;
    const pts = [[0, 0], [120, 40], [200, -10], [260, 70]];
    ctx.beginPath(); ctx.moveTo(x0, y0);
    for (const [dx, dy] of pts.slice(1)) ctx.lineTo(x0 + dx, y0 + dy);
    ctx.stroke();
    ctx.fillStyle = "rgba(200,220,255,.3)";
    for (const [dx, dy] of pts) { ctx.beginPath(); ctx.arc(x0 + dx, y0 + dy, 2, 0, Math.PI * 2); ctx.fill(); }
  }
  for (let i = 0; i < 6; i++) {
    const x = (i * 197) % ROOM_W, y = (i * 113 + 60) % ROOM_H;
    const g = ctx.createRadialGradient(x, y, 2, x, y, 46);
    g.addColorStop(0, `rgba(190,210,255,${0.16 + 0.05 * Math.sin(t + i)})`);
    g.addColorStop(1, "rgba(190,210,255,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 46, 0, Math.PI * 2); ctx.fill();
  }
}

function drawStarfallAmbience(t, W, H) {
  for (let i = 0; i < 30; i++) {
    const x = (i * 97 + t * (8 + (i % 4) * 5)) % W, y = (i * 61) % H;
    const p = 0.5 + 0.5 * Math.sin(t * 2.5 + i);
    ctx.fillStyle = `rgba(230,238,255,${0.25 + 0.5 * p})`;
    ctx.beginPath(); ctx.arc(x, y, 1 + (i % 2) * 0.6, 0, Math.PI * 2); ctx.fill();
  }
  // an occasional shooting star
  const cycle = Math.floor(t * 0.2), k = (t * 0.2) % 1;
  if (k < 0.12) {
    const sx = W * (0.2 + (cycle % 3) * 0.25), sy = 60 + (cycle % 2) * 80;
    const f = k / 0.12;
    ctx.strokeStyle = `rgba(230,240,255,${0.8 * (1 - f)})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(sx + f * 120 - 40, sy + f * 40 - 20); ctx.lineTo(sx + f * 120, sy + f * 40); ctx.stroke();
  }
}
