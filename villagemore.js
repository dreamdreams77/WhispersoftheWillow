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

// ---------- Village points ----------
VIL_POINTS.push(
  { id: "well", kind: "well", label: "Wishing Well", x: 610, y: 590, r: 46 },
  { id: "board", kind: "board", label: "Notice Board", x: 410, y: 380, r: 46 }
);
