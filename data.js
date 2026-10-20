// Data-driven definitions. Everything gameplay-relevant lives here.
const DATA = {};

DATA.species = {
  fox:     { name: "Fox",     color: "#d9702e", speed: 1.0, maxHp: 100, desc: "Agile fighter. Dodges are quick and cheap.", ability: "Trickster: dodge leaves a brief afterimage that confuses enemies." },
  rabbit:  { name: "Rabbit",  color: "#c9b8a6", speed: 1.2, maxHp: 90,  desc: "Fast and evasive. Gardens yield more.",        ability: "Swift Feet: sprint costs less stamina." },
  mouse:   { name: "Mouse",   color: "#9d9aa6", speed: 1.0, maxHp: 85,  desc: "Scavenger. Finds extra materials.",            ability: "Keen Nose: gathering yields bonus items." },
  squirrel:{ name: "Squirrel",color: "#a0643a", speed: 1.05,maxHp: 95,  desc: "Ranged seed-thrower.",                          ability: "Acorn Toss: strike at range." },
  hedgehog:{ name: "Hedgehog",color: "#7a6a5a", speed: 0.9, maxHp: 120, desc: "Defensive. Curls to block.",                    ability: "Curl: hold Dodge to brace and reduce damage." },
  badger:  { name: "Badger",  color: "#5b5a5e", speed: 0.95,maxHp: 115, desc: "Heavy melee and digging.",                       ability: "Bulwark: stronger strikes, slower dodge." },
  mole:    { name: "Mole",    color: "#6e4f3f", speed: 0.9, maxHp: 90,  desc: "Finds minerals and tunnels.",                    ability: "Burrow: tunnel shortcuts reveal hidden loot." }
};

DATA.items = {
  acorn:      { name: "Acorn",        icon: "●", color: "#b5833c", desc: "A plump acorn. Good for cooking." },
  berry:      { name: "Wild Berry",   icon: "◉", color: "#c23a6b", desc: "Sweet and tart." },
  moonpetal:  { name: "Moonpetal",    icon: "❀", color: "#b9d3ff", desc: "Glows faintly. Heals when eaten." },
  thorn:      { name: "Dark Thorn",   icon: "✶", color: "#3b2d4a", desc: "Cut from a blighted root." },
  wood:       { name: "Driftwood",    icon: "▬", color: "#8a6a4a", desc: "Light and strong." },
  willowleaf: { name: "Willow Leaf",  icon: "❦", color: "#8fd17a", desc: "Still carries a little magic." },
  mushroom:   { name: "Glowcap",      icon: "☁", color: "#7fe0d0", desc: "Faint blue light. Used in cooking." },
  // crafted
  acornBomb:  { name: "Acorn Bomb",   icon: "◍", color: "#8b5a2b", desc: "Thrown. Explodes on impact.", consumable: true, dmg: 40 },
  pollenDraught:{ name: "Pollen Draught", icon: "⚗", color: "#f2d46b", desc: "Restores health.", consumable: true, heal: 35 },
  thornMail:  { name: "Thorn Mail",   icon: "⛨", color: "#5f7a3a", desc: "Armor. Reflects a little damage.", equip: "armor", dmgTake: 0.75 },
  clawGlove:  { name: "Lightning Claws", icon: "⚡", color: "#e8d24a", desc: "Stronger strikes.", equip: "weapon", atk: 1.5 },
  lantern:    { name: "Willow Lantern", icon: "✧", color: "#ffd98a", desc: "Decor. Warms a home." },
  quartzLamp: { name: "Quartz Lamp", icon: "✦", color: "#cfd8e6", desc: "A lamp of cold quartz that never gutters." },
  lostPage:   { name: "Torn Page", icon: "❡", color: "#eee3c0", desc: "A page torn from a memory-book, written in the Willow's own hand." },
  springbell: { name: "Springbell",  icon: "✿", color: "#ffd1e8", desc: "A pink bell that rings only in spring." },
  sunnerhoney:{ name: "Sunner Honey",  icon: "◈", color: "#ffc247", desc: "Thick gold honey from summer blossoms." },
  amberleaf:  { name: "Amberleaf",     icon: "❧", color: "#e08a3a", desc: "A leaf that holds autumn's last warmth." },
  frostberry: { name: "Frostberry",    icon: "❄", color: "#bfe6ff", desc: "Cold to the touch, sweet inside. Grows only in the grove." },
  frostTonic: { name: "Frost Tonic",   icon: "⚗", color: "#9fd8ff", desc: "Warming and bright. Restores health.", consumable: true, heal: 50 },
  silverbell: { name: "Silverbell",   icon: "❃", color: "#dfe9ff", desc: "A pale bloom that chimes softly. Posy is searching for one." },
  quartz:     { name: "Quartz Shard", icon: "◆", color: "#cfd8e6", desc: "A cold, shimmering mineral found by moles in the deep stone." },
  // bounty / key
  emberTea:   { name: "Ember Tea", icon: "♨", color: "#f0a060", desc: "Warm, smoky and bright. Restores health.", consumable: true, heal: 45 },
  antlerSpear:{ name: "Antler Spear", icon: "Y", color: "#d8c8a0", desc: "Carved from the Ember Stag's shed antler. Strikes hit harder.", equip: "weapon", atk: 1.4 },
  ashbloom:   { name: "Ashbloom",     icon: "✹", color: "#e0905a", desc: "A grey-petalled flower that only opens on burned ground. Warm to the touch." },
  stagAntler: { name: "Stag Antler",  icon: "Y", color: "#d8c8a0", desc: "Shed by the Ember Stag. Still faintly warm, and it does not burn." },
  shrineCharm:{ name: "Shrine Charm", icon: "✺", color: "#e0c0ff", desc: "Points the way to a sealed root." },
  heartseed:  { name: "Heartseed",    icon: "❂", color: "#ff9fb5", desc: "A seed from the Willow itself. Key item." }
};

DATA.recipes = [
  { id: "frostTonic", out: "frostTonic", n: 1, needs: { frostberry: 2, berry: 1 }, station: "kitchen", unlockedBy: null },
  { id: "quartzLamp", out: "quartzLamp", n: 1, needs: { quartz: 2, mushroom: 1 }, station: "workshop", unlockedBy: null, unlockFlag: "matriarchDown" },
  { id: "pollenDraught", out: "pollenDraught", n: 1, needs: { berry: 2, moonpetal: 1 }, station: "kitchen", unlockedBy: null },
  { id: "acornBomb",     out: "acornBomb",     n: 2, needs: { acorn: 2, wood: 1 },      station: "workshop", unlockedBy: null },
  { id: "thornMail",     out: "thornMail",     n: 1, needs: { thorn: 3, wood: 2 },      station: "workshop", unlockedBy: "villager_ash" },
  { id: "clawGlove",     out: "clawGlove",     n: 1, needs: { thorn: 1, mushroom: 2 },  station: "workshop", unlockedBy: "villager_ash" },
  { id: "emberTea",      out: "emberTea",      n: 1, needs: { ashbloom: 2, mushroom: 1 }, station: "kitchen", unlockedBy: null, unlockFlag: "ashenEntered" },
  { id: "antlerSpear",   out: "antlerSpear",   n: 1, needs: { stagAntler: 1, wood: 2 },   station: "workshop", unlockedBy: null, unlockFlag: "ashenCleansed" },
  { id: "lantern",       out: "lantern",       n: 1, needs: { mushroom: 2, wood: 1 },   station: "workshop", unlockedBy: null }
];

// Willow upgrades, each costs Willowlight. Effects applied in core.js.
DATA.willow = {
  vitality:   { name: "Vitality",     desc: "Restores the forest. Opens the Bramblewild Thicket.", cost: 3, needs: null },
  abundance:  { name: "Abundance",    desc: "Gathering yields more materials.",                    cost: 2, needs: null },
  protection: { name: "Protection",   desc: "+20 maximum health.",                                 cost: 4, needs: "vitality" },
  wisdom:     { name: "Wisdom",       desc: "Learn village recipes without first befriending their makers.", cost: 4, needs: "vitality" },
  spiritbond: { name: "Spirit Bond",  desc: "A spirit wisp joins every expedition and strikes foes.", cost: 6, needs: "wisdom" }
};

DATA.enemies = {
  blightheart: { name: "Blightheart", color: "#4a1f3a", hp: 420, dmg: 17, speed: 24, size: 46, boss: true, drops: { thorn: [4,6], heartseed: [1,1] }, wl: 14, intro: "The corruption beats like a heart. The Blightheart opens its roots and sings with the Willow's own voice." },
  bogLurker: { name: "Bog Lurker", color: "#3b5a3a", hp: 70, dmg: 10, speed: 20, size: 18, xp: 3, drops: { mushroom: [1,2], quartz: [0,1] } },
  frostWisp: { name: "Frost Wisp", color: "#a8dcff", hp: 35, dmg: 9, speed: 70, size: 10, xp: 2, drops: { frostberry: [1,2] } },
  icewyrm:   { name: "Icewyrm Elder", color: "#7fb8e0", hp: 320, dmg: 15, speed: 26, size: 44, boss: true, drops: { frostberry: [3,4], shrineCharm: [1,1] }, wl: 10, intro: "Frost cracks across the grove. The Icewyrm Elder uncoils, slow and enormous, and breathes winter at you." },
  blightSprite: { name: "Blight Sprite", color: "#5a2f6e", hp: 30, dmg: 8,  speed: 46, size: 12, xp: 2, drops: { thorn: [1,2] } },
  thornBeetle:  { name: "Thorn Beetle",  color: "#2e4a3a", hp: 45, dmg: 12, speed: 38, size: 15, xp: 3, drops: { thorn: [1,1], wood: [0,1], lostPage: [0,1] } },
  gloomcap:     { name: "Gloomcap", color: "#3f6a6a", hp: 50, dmg: 6, speed: 24, size: 17, xp: 3, poison: true, drops: { mushroom: [1,2] } },
  moonWisp:     { name: "Moon Wisp",     color: "#9bc2ff", hp: 25, dmg: 10, speed: 62, size: 10, xp: 2, drops: { mushroom: [1,2] } },
  // The Ashen Glade
  cinderMite: { name: "Cinder Mite", color: "#c0622e", hp: 22, dmg: 6, speed: 80, size: 8, xp: 1, drops: { ashbloom: [0,1] } },
  ashBeetle:  { name: "Ash Beetle",  color: "#4a3a32", hp: 110, dmg: 14, speed: 22, size: 22, xp: 5, drops: { quartz: [1,2], wood: [1,1] } },
  emberWisp:  { name: "Ember Wisp",  color: "#ffb347", hp: 40, dmg: 11, speed: 64, size: 10, xp: 3, drops: { ashbloom: [1,2] } },
  emberStag:  { name: "Ember Stag",  color: "#8a4a2a", hp: 380, dmg: 18, speed: 30, size: 46, boss: true, drops: { stagAntler: [1,1], ashbloom: [3,4] }, wl: 12, intro: "The Ember Stag steps out of the smoke, antlers still burning. It lowers its head toward you, as if it remembers you from before the fire." },
  // mini-boss for the vertical slice
  bramblemaw:   { name: "Bramblemaw",    color: "#3d5a22", hp: 260, dmg: 16, speed: 30, size: 40, boss: true, drops: { thorn: [4,6], shrineCharm: [1,1] }, wl: 6, intro: "Thorns uncoil from the ground. The Bramblemaw turns toward you." },
  sporeHulk: { name: "Spore Hulk", color: "#4f7a5c", hp: 120, dmg: 12, speed: 18, size: 26, xp: 6, drops: { mushroom: [2,3], quartz: [1,1] } },
  thornwraith: { name: "Thornwraith", color: "#6b2d5c", hp: 85, dmg: 13, speed: 42, size: 18, xp: 5, drops: { thorn: [2,3] } },
  frostHound: { name: "Frost Hound", color: "#cfeaff", hp: 90, dmg: 11, speed: 60, size: 16, xp: 5, drops: { frostberry: [2,3] } },
  gloomMatriarch: { name: "Gloomcap Matriarch", color: "#2a6a66", hp: 340, dmg: 15, speed: 28, size: 44, boss: true, drops: { quartz: [3,4], mushroom: [3,5], shrineCharm: [1,1] }, wl: 10, intro: "The Gloomcap Matriarch rises, her cap pulsing with cold light. She is guarding something behind her." }
};

DATA.regions = {
  heartwood: { name: "The Corrupted Heartwood", bg: ["#2a1426","#10080f"], enemies: ["blightSprite","thornBeetle","gloomcap"], deepEnemies: ["thornwraith"], deepFrom: 2, gather: ["thorn","mushroom","quartz","wood"], density: 7, boss: false, depth: true, maxDepth: 4, bossKind: "blightheart", hazards: { 1: "gloom", 2: "warmStone", 3: "gloom", 4: "warmStone" } },
  marsh: { name: "The Whispering Marsh", bg: ["#1d3a36","#0c1d1b"], enemies: ["bogLurker","moonWisp","gloomcap"], gather: ["moonpetal","mushroom","quartz","wood"], density: 6, boss: false, depth: true, maxDepth: 2, hazards: { 1: "bogMire", 2: "bogMire" } },
  grove: { name: "The Frostfallen Grove", bg: ["#2a3f52","#121d28"], enemies: ["frostWisp","blightSprite"], deepEnemies: ["frostHound"], deepFrom: 2, gather: ["frostberry","wood","acorn","mushroom"], density: 6, boss: false, depth: true, maxDepth: 2, bossKind: "icewyrm", hazards: { 1: "frostBite" } },
  fernwood: { name: "Moonlit Fernwood", bg: ["#1f3b2a","#122319"], enemies: ["blightSprite","moonWisp"], gather: ["berry","moonpetal","acorn","wood","mushroom"], density: 6, boss: false },
  thicket:  { name: "Bramblewild Thicket", bg: ["#2e2a1a","#18150c"], enemies: ["thornBeetle","blightSprite"], gather: ["berry","thorn","wood","acorn"], density: 7, boss: true, bossKind: "bramblemaw" },
  hollows: { name: "The Sunken Mushroom Hollows", bg: ["#12302e","#081816"], enemies: ["gloomcap","moonWisp"], deepEnemies: ["sporeHulk"], deepFrom: 3, gather: ["mushroom","moonpetal","quartz","wood"], density: 6, boss: false, depth: true, maxDepth: 4, bossKind: "gloomMatriarch", hazards: { 2: "gloom", 3: "warmStone", 4: "coldDraft" } },
  ashen: { name: "The Ashen Glade", bg: ["#3a2420","#140c0a"], enemies: ["cinderMite","ashBeetle"], deepEnemies: ["emberWisp"], deepFrom: 2, gather: ["ashbloom","wood","thorn","quartz"], density: 6, boss: false, depth: true, maxDepth: 2, bossKind: "emberStag", hazards: { 1: "warmStone", 2: "coldDraft" } },
  catacombs: { name: "The Hollowroot Catacombs", bg: ["#241a2e","#0d0814"], enemies: ["gloomcap","thornBeetle"], gather: ["quartz","thorn","wood"], density: 6, boss: false, depth: true, maxDepth: 2, unlockFlag: "catacombsOpen", hazards: { 1: "coldDraft", 2: "warmStone" } }
};

DATA.villagers = {
  villager_owl: {
    name: "Elder Thistlemoon", species: "Owl", role: "Librarian",
    personality: "Patient, remembers the forest before the blight.",
    gift: "mushroom", giftLike: "Glowcap is a favorite of hers.",
    lines: [
      "Ah, a young one. The Willow has been quiet for a long time.",
      "Bring me what you find in the Fernwood, and I will read what it remembers.",
      "The roots beneath the Thicket are wrong. I have seen the same thorns before, long ago."
    ]
  },
  villager_mouse: {
    name: "Posy Pinwhistle", species: "Mouse", role: "Herbalist",
    personality: "Shy. Searching for a rare flower called Silverbell.",
    gift: "moonpetal", giftLike: "Moonpetal makes her blush.",
    lines: [
      "Oh! Sorry, I didn't see you there. I've been looking for silverbell...",
      "If you find one, I'd be ever so grateful. I could brew you something good.",
      "Thank you for the moonpetal! It's lovely. Here, take this draught I made."
    ]
  },
  villager_ash: {
    name: "Brindle Hammerburr", species: "Badger", role: "Blacksmith",
    personality: "Grumpy, with a surprisingly gentle heart.",
    gift: "wood", giftLike: "He appreciates good, solid wood.",
    lines: [
      "Hmph. You want something forged? Bring me thorn and I'll make it worth your time.",
      "Don't look at me like that. I'm not soft. I just don't like seeing critters get hurt.",
      "Lightning claws are my best work. Don't lose them in a bramble."
    ]
  }
};

DATA.villagers.villager_mole = {
  name: "Nubbins Delvewick", species: "Mole", role: "Miner",
  personality: "Gruff and quiet. Collects shiny stones and believes they remember the sun.",
  gift: "quartz", giftLike: "Quartz catches his eye.",
  lines: [
    "*grunts* Dirt is honest. Folks up top are not.",
    "The deep stone sings if you listen. The Hollows sing loudest.",
    "You have been past the mushroom doors. Good. Few come back the same, fewer come back talking."
  ]
};

DATA.quests = {
  heartwood: {
    title: "The Heart of the Forest",
    steps: [
      { text: "Break the Matriarch in the Hollows", check: "flag:matriarchDown" },
      { text: "Enter the Corrupted Heartwood", check: "flag:heartwoodEntered" },
      { text: "Destroy the Blightheart", check: "flag:heartwoodCleansed" }
    ]
  },
  ashen: {
    title: "The Ember Stag",
    steps: [
      { text: "Enter the Ashen Glade", check: "flag:ashenEntered" },
      { text: "Defeat the Ember Stag", check: "flag:ashenCleansed" }
    ]
  },
  silverbell: {
    title: "Silverbell for Posy",
    steps: [
      { text: "Find a Silverbell in the Fernwood", check: "flag:silverbell" },
      { text: "Bring it to Posy", check: "flag:silverbellDelivered" },
      { text: "Defeat the Bramblemaw in the Thicket", check: "flag:bramblemawDown" }
    ]
  }
};

DATA.seasons = ["Spring", "Summer", "Autumn", "Winter"];

// Per-depth hazards. Keyed by floor number; a region lists which floors have one.
DATA.hazards = {
  bogMire:   { name: "Bog Mire",  desc: "Thick mud drags at your feet. Movement is slowed." },
  frostBite: { name: "Frostbite", desc: "Cold bites every few seconds. Small wounds add up." },
  gloom:     { name: "Gloom",      desc: "Thick spores swallow the light. You can only see foes close to you." },
  warmStone: { name: "Warm Stone", desc: "Hot patches flare beneath the moss after a short warning. Keep moving." },
  coldDraft: { name: "Cold Draft", desc: "A chill wind slows your stamina recovery to half." },
};

// Lore spoken when descending. Index 0 = depth 2, index 1 = depth 3.
DATA.depthLore = {
  ashen: [
    "Something glows beneath the ash. The mites gather where the heat is greatest, and the Ember Wisps drift up from the embers.",
  ],
  hollows: [
    "Glowcaps grow in rings here, each ring brighter than the last. The mushrooms seem to be watching the way down.",
    "The stone is warm. Something below breathes slowly, and the Glowcaps dim whenever it does.",
    "The lowest ring is dark and cold. Spore-swollen shapes shuffle between the roots, and the Matriarch's light reaches only so far.",
  ],
  heartwood: [
    "Thorns grow in the wrong direction here, pointing down. The corruption is thinner, but the Willow's heart is still far below.",
    "The bark is hot to the touch. Things with thorn-wrapped limbs move at the edge of your sight.",
    "A cold wind rises from the deepest root. The Blightheart is near, and it is waiting.",
  ],
  catacombs: [
    "Carved shelves line these halls, holding stones that were once names. Some of the names are yours, you think.",
  ],
};

// Weather changes each day and affects expeditions.
// chase: how far enemies notice the player; enemyDmg: damage multiplier taken.
DATA.weather = {
  clear: { label: "☀ Clear",   chase: 280, enemyDmg: 1,    gatherBonus: false, wlBonus: 0, rollWeight: 4 },
  rain:  { label: "🌧 Rain",    chase: 280, enemyDmg: 1,    gatherBonus: true,  wlBonus: 0, rollWeight: 2 },
  fog:   { label: "🌫 Fog",     chase: 130, enemyDmg: 1,    gatherBonus: false, wlBonus: 0, rollWeight: 2 },
  storm: { label: "⚡ Storm",   chase: 340, enemyDmg: 1.25, gatherBonus: false, wlBonus: 0, rollWeight: 1 },
  moon:  { label: "☾ Moonlit", chase: 280, enemyDmg: 1,    gatherBonus: false, wlBonus: 1, rollWeight: 1 },
};

// Journal entries, unlocked by play. Written in the Willow's voice of memory.
DATA.lore = [
  { title: "Ash Remembers", text: "The glade burned once, long before the Heartwood fell silent. The ash still remembers which trees were green.", unlock: () => flag("ashenEntered") },
  { title: "The Burned Oath", text: "The Ember Stag kept the forest's oath to keep its fires in check. Freed of the corruption, it bows once, then walks into the smoke to rest.", unlock: () => flag("ashenCleansed") },
  { title: "Old Game", text: "Someone once pressed the same sequence of keys the Willow listens for. The roots remember it, and they hum a little brighter for it.", unlock: () => flag("egg_konami") },
  { title: "The Seventh Knock", text: "Nobody knocks on a tree seven times without meaning it. The Willow answered once, and it was not the first time it had been asked.", unlock: () => flag("egg_willow7") },
  { title: "The First Root", text: "The Fernwood remembers when the Willow's roots were white with blossom.", unlock: () => !!G.visitedRegions.fernwood },
  { title: "Thorns Beneath the Thicket", text: "Brambles here grow in rings, as if following a pattern older than the forest.", unlock: () => !!G.visitedRegions.thicket },
  { title: "Beneath the Mushroom Doors", text: "The Hollows are quiet, but the Glowcaps hum in a rhythm Nubbins says matches the Willow's pulse.", unlock: () => !!G.visitedRegions.hollows },
  { title: "Posy's Silverbell", text: "A flower that blooms only where a memory was kept safe.", unlock: () => flag("silverbellDelivered") },
  { title: "Thistlemoon's Warning", text: "The owl wrote that the blight did not come from outside the Willow, but from within it.", unlock: () => flag("owlTold") },
  { title: "The Bramblemaw's Fall", text: "What fell in the Thicket was once a guardian, and it seemed grateful to be released.", unlock: () => flag("bramblemawDown") },
  { title: "Awakened Roots", text: "With Vitality restored, the Willow's sap glows and its voice carries into the village.", unlock: () => willowOwned("vitality") },
  { title: "The Matriarch's Descent", text: "Beneath the Hollows, a mother of glowcaps guarded a door that the Willow had sealed long ago. Her fall has opened it.", unlock: () => flag("matriarchDown") },
  { title: "Glowcap Rings", text: "The Hollows descend in rings of light, and each ring is older than the last.", unlock: () => flag("depth_hollows_2") },
  { title: "Warm Stone", text: "Far below the Hollows, the stone is warm, and something beneath it still breathes.", unlock: () => flag("depth_hollows_3") },
  { title: "The Deepest Glow", text: "Past the warm stone, the Hollows grow cold again, and the Spore Hulks drift between the roots like slow lanterns.", unlock: () => flag("depth_hollows_4") },
  { title: "Thorns Below", text: "Under the Heartwood the thorns point downward, and the Thornwraiths creep up to meet anyone who comes too close.", unlock: () => flag("depth_heartwood_2") },
  { title: "Carved Names", text: "The Catacombs keep the names of creatures the forest chose to remember.", unlock: () => flag("depth_catacombs_2") },
  { title: "Reeds and Whispers", text: "The marsh whispers in voices that remember the Willow, and some of them are apologies.", unlock: () => !!G.visitedRegions.marsh },
  { title: "Frost on the Roots", text: "Winter reaches the grove first, and the Willow feels it in its deepest roots.", unlock: () => !!G.visitedRegions.grove },
  { title: "The Heart Beneath", text: "Under the corruption the Willow's heartwood was still green. It had been waiting to be heard.", unlock: () => flag("heartwoodCleansed") },
  { title: "Nubbins's Quartz", text: "Shards of quartz from the deep stone hold a cold light. Nubbins swears they remember the sun.", unlock: () => hasItem("quartz") || !!G.visitedRegions.hollows },
];

// ---- Character depth ----
// Stable key for a villager's personal-task flags.
function pqKey(id, stage) { return `pq_${id}_${stage}`; }

// Close-friend lines, spoken once friendship reaches 6.
DATA.villagers.villager_owl.close = [
  "Child, you have become one of the few who listen. The Willow notices that.",
  "When I was young this library had a hundred shelves. Now I keep forty, and I keep them well.",
];
DATA.villagers.villager_mouse.close = [
  "I once brought a silverbell to the Willow's roots and it rang back at me. Friends are like that, I think.",
  "Tea? I've been saving the good leaves for someone who would notice.",
];
DATA.villagers.villager_ash.close = [
  "Don't tell anyone I said this, but I'm glad you came by the forge.",
  "My hammer hasn't rung this happily in years. Keep coming around.",
];
DATA.villagers.villager_mole.close = [
  "The stone says you have good hands. I don't say that often.",
  "Stay close to the deep stone. It listens to people who listen to it.",
];

// One personal task per villager. Given at friendship giveAt; paid out on turn-in.
DATA.personal = {
  villager_owl: {
    title: "The Missing Page", giveAt: 3,
    need: { item: "lostPage", n: 1 },
    intro: "A page from the Willow's own memory-book was carried off by a thorn beetle in the Thicket. Bring it back to me, please.",
    remind: "The beetles in the Thicket carry odd things. Keep an eye out for paper.",
    done: "The page! Its ink is still faintly warm. Take this lantern. It never goes out, which is more than I can say for my tea.",
    reward: { wl: 3, items: { lantern: 1 } },
  },
  villager_ash: {
    title: "Repaying a Debt", giveAt: 3,
    need: { item: "thorn", n: 4 },
    intro: "I owe a mole a favor I never repaid. Four good thorns would be a start, and I'll forge you something decent in return.",
    remind: "Four thorns, critter. I don't work on air.",
    done: "Hmph. That'll do. Here, a finer set of claws. Don't go showing off.",
    reward: { wl: 2, items: { clawGlove: 1 } },
  },
  villager_mole: {
    title: "Quartz for the Deep", giveAt: 3,
    need: { item: "quartz", n: 5 },
    intro: "The deep stone hums louder whenever someone brings it shards. Five of them, and I'll show you something that matters.",
    remind: "Five shards, critter. The stone counts.",
    done: "*nods slowly* The stone is happier. Take this heartseed. It grew from the Willow itself.",
    reward: { wl: 4, items: { heartseed: 1 } },
  },
};

// Backgrounds chosen on the title screen. Each sets a starting kit and one early friend.
DATA.origins = {
  hedgerow:   { name: "Hedgerow Child",   desc: "Raised in the berry tangles. Starts with extra berries and a head start with Posy.", items: { berry: 2 }, friend: "villager_mouse", rel: 1 },
  scout:      { name: "Fernwood Scout",   desc: "Knows the old paths. Starts with a healing draught and a head start with Elder Thistlemoon.", items: { pollenDraught: 1 }, friend: "villager_owl", rel: 1 },
  apprentice: { name: "Forge Apprentice", desc: "Ran errands for Brindle. Starts with spare thorn and driftwood.", items: { thorn: 2, wood: 2 }, friend: "villager_ash", rel: 1 },
};

// The Willow speaks after each rest, cycling through these.
DATA.willowDreams = [
  "The Willow dreams of rain on its leaves, and of a small critter who once sheltered beneath them.",
  "Roots tangle in the dark. The Willow remembers when the Hollows were a meadow of silver grass.",
  "Somewhere a thorn is growing where a flower should be. The Willow feels it like a splinter.",
  "The Willow hums a song older than the forest. Some of the words are yours, though you have never heard them.",
  "It remembers a promise made under the moon, and it is not sure who made it, only that it was kept.",
  "The Willow watches you come and go, patient as stone, and wonders aloud whether you will stay.",
];
DATA.willowAwakened = "Every root hums at once. The Great Willow is awake, and for the first time in an age it speaks plainly: \"Thank you. Now help me remember the rest.\"";

// ---- Seasons ----
// Gatherables added to the village each season, and the spots they appear at.
DATA.seasonal = [
  { nodes: ["springbell", "springbell", "berry"] },
  { nodes: ["sunnerhoney", "sunnerhoney", "berry"] },
  { nodes: ["amberleaf", "amberleaf", "acorn"] },
  { nodes: ["frostberry", "frostberry", "wood"] },
];
const SEASON_SPOTS = [[520, 760], [880, 760], [160, 440], [1230, 160], [360, 140], [1150, 640]];

// Announced once when a new season begins. Festivals grant a gift and Willowlight.
DATA.festivals = [
  { name: "Blossom Fair",     text: "Blossom Fair! Villagers trade springbells for kindness. +2 Willowlight.", gift: { springbell: 2 }, wl: 2 },
  { name: "Sunmeet Supper",   text: "Sunmeet Supper! Honey and berries fill every table. +2 Willowlight.", gift: { sunnerhoney: 2, berry: 2 }, wl: 2 },
  { name: "Lantern Harvest",  text: "Lantern Harvest! Amberleaf drifts through the square. +3 Willowlight.", gift: { amberleaf: 2 }, wl: 3 },
  { name: "Frostlight Feast", text: "Frostlight Feast! The Willow glows against the snow. +3 Willowlight.", gift: { frostberry: 2 }, wl: 3 },
];

// ---- Pets ----
// Companions rescued from lost critters. One walks with you at a time.
DATA.pets = {
  sproutkin:  { name: "Sproutkin",  color: "#8fd17a", desc: "A walking sprout that hums to the Willow.", passive: "Heals 3 HP after each room you clear." },
  mothling:   { name: "Mothling",   color: "#cfe8ff", desc: "A glow-moth that drifts beside you.", passive: "+1 Willowlight for each foe slain." },
  hedgepup:   { name: "Hedgepup",   color: "#9c8a78", desc: "A round little hedgehog who snuffles at your heels.", passive: "Heals 1 HP every 5 seconds on expeditions." },
  emberfinch: { name: "Emberfinch", color: "#ff9a4a", desc: "A bright finch that sharpens your strikes.", passive: "Strikes deal 10% more damage." },
  cinderkit:  { name: "Cinder Kit", color: "#ffb36b", desc: "A small ember-furred kit the Ember Stag left behind. It follows you to the Willow.", passive: "Strikes have a 1-in-5 chance to set a foe burning.", story: true },
};

// ---- Gates ----
// Each expedition gate's requirement, and the short label shown on the village gate.
DATA.gates = {
  thicket:   { open: () => willowOwned("vitality"), short: "Needs Vitality", msg: "The thorns across the path won't part. Restore the Willow's Vitality first." },
  hollows:   { open: () => willowOwned("wisdom"), short: "Needs Wisdom", msg: "The mushroom doors stay sealed. Awaken Wisdom at the Willow first." },
  catacombs: { open: () => flag("catacombsOpen"), short: "Sealed", msg: "A sealed door hums beneath the Hollows. Its guardian must fall first." },
  marsh:     { open: () => willowOwned("vitality"), short: "Needs Vitality", msg: "Reeds knot across the marsh path. Restore the Willow's Vitality to part them." },
  heartwood: { open: () => flag("matriarchDown") && flag("bramblemawDown"), short: "Corrupted", msg: "The corruption coils thick around the Heartwood. Break the Bramblemaw and the Matriarch first." },
  ashen:     { open: () => flag("heartwoodCleansed"), short: "Scorched", msg: "Ash drifts from the north, and the glade still smoulders. Cleanse the Heartwood first, so the forest can spare its fire." },
  grove:     { open: () => G.season === 3 || !!G.visitedRegions.grove, short: "Winter only", msg: "Frost hangs over the grove and won't lift until winter." },
};

// The ending, spoken once after the Heartwood is cleansed and you return home.
DATA.heartwoodEnding = "The corruption drains out of the Heartwood like a long-held breath. Far below, a root that has slept for an age begins, slowly, to grow. The Willow is not healed. It is remembering how to heal, and you helped it remember.";

// ---- Spirit shrine ----
// Offer one of these items at the shrine; its blessing walks with you on the next expedition.
DATA.blessings = [
  { id: "moonStep",    item: "moonpetal",  name: "Moonlit Step",  desc: "Dodges recover twice as fast." },
  { id: "glowWard",    item: "mushroom",   name: "Glowcap Ward",  desc: "You take 15% less damage." },
  { id: "stoneHeart",  item: "quartz",     name: "Stone Heart",   desc: "Strikes deal 15% more damage." },
  { id: "winterBreath",item: "frostberry", name: "Winter's Breath", desc: "Stamina recovers half again as fast." },
];

// ---- Relationship events ----
// Each villager has one event, offered once their friendship reaches "at". Choices shape the bond.
DATA.events = {
  villager_owl: { at: 6, text: "I kept a book I never showed anyone. It is the Willow's first promise, written in my own hand, and I have never known whether to keep it or burn it.",
    choices: [
      { label: "Read it with her", rel: 1, wl: 3, note: "Thistlemoon reads aloud. You feel the promise settle into place." },
      { label: "Ask her to tell it instead", rel: 2, items: { acorn: 2 }, note: "Thistlemoon tells the story slowly, and gives you acorns for the road." },
    ] },
  villager_mouse: { at: 6, text: "I've been brewing a tea for someone who never came back. Will you stay and have a cup with me instead?",
    choices: [
      { label: "Stay and talk", rel: 2, items: { pollenDraught: 1 }, note: "Posy shares her tea and a pollen draught she brewed too strong." },
      { label: "Ask about her silverbell", rel: 1, wl: 2, note: "Posy smiles and tells you where silverbells grow in the Fernwood." },
    ] },
  villager_ash: { at: 6, text: "I was a guard for the Willow once. I failed it, and forging is how I've been trying to make amends ever since.",
    choices: [
      { label: "Tell him it wasn't his fault", rel: 2, items: { thornMail: 1 }, note: "Brindle grunts and hands you a thorn mail he has been saving." },
      { label: "Ask him to teach you", rel: 1, wl: 2, note: "Brindle agrees to teach you a little more about the forge." },
    ] },
  villager_mole: { at: 6, text: "The deep stone speaks to me. Sometimes it asks me questions I cannot answer. Do you hear it too?",
    choices: [
      { label: "Say yes, and mean it", rel: 2, items: { quartz: 3 }, note: "Nubbins nods, and taps a few shards of quartz into your satchel." },
      { label: "Say no, but ask him to teach you", rel: 1, wl: 2, note: "Nubbins grumbles, then shows you how to listen to the stone." },
    ] },
};

// Deeper dreams, mixed into the Willow's rotation once Spirit Bond is awakened.
DATA.deepDreams = [
  "Beneath the roots, the Willow remembers every critter who ever sheltered there, and it keeps all their names.",
  "A spirit steps out of the bark and asks the Willow whether it is still afraid. The Willow says it is no longer alone.",
  "The Willow dreams of a second Willow, far away, and wonders if it might one day grow a companion of its own.",
];
