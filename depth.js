// Extra depth: more things for each villager to say as friendship grows, a village tea,
// and a few journal entries that come from the new mini-games and the Starfall Meadow.

// Friendship lines: each villager now has six, one for each rank of friendship (0 to 5).
DATA.villagers.villager_owl.lines.push(
  "Every owl in this village has read the same book at least twice. I am the only one who has read it three times.",
  "The Willow keeps its stories in the bark and in the roots. Come and sit with me, and I will show you which ones are yours.",
  "A forest forgets quickly. A library does not, and neither do the friends who come to it. That is why I keep so many shelves."
);
DATA.villagers.villager_mouse.lines.push(
  "I keep a little jar of dew from every morning this year. The jars are heavier than you would think.",
  "The silverbell only opens when someone is kind to it. I have been practicing being kind to it for a long time.",
  "I wrote a tiny song for the silverbell, but I am too shy to hum it where anyone can hear. Perhaps I will hum it to you one day."
);
DATA.villagers.villager_ash.lines.push(
  "Folk think a forge is loud because it is angry. It is loud because it is trying to be heard over the rain.",
  "If you ever want a bench, a shelf or a nice wooden spoon, just say so. Wood and I get along fine.",
  "My father said a good smith knows when to stop hammering. I have never been good at that, but I am learning, one quiet evening at a time."
);
DATA.villagers.villager_mole.lines.push(
  "Up top they count days. Down here we count the drips from the roof, and they are far more honest.",
  "I once found a stone that was warm when I picked it up. I kept it. I still think about it when the tunnels go quiet.",
  "Dig too fast and you miss what is under your feet. I have been digging slow for years, and I find more."
);

// Close friends have more to say, picked at random each time they are spoken to.
DATA.villagers.villager_owl.close.push(
  "I used to think the Willow was only a tree. Now I think it is a very patient friend who writes in roots."
);
DATA.villagers.villager_mouse.close.push(
  "Do you ever hear the leaves at night? I think they are telling each other which of us are kind.",
  "When you go off into the forest, leave a little sweetness on the stone for me. I will know it was you."
);
DATA.villagers.villager_ash.close.push(
  "Someday I will make a proper gate for the village. A good one, with hinges that do not complain."
);
DATA.villagers.villager_mole.close.push(
  "When the stone goes cold, I sit with my back against the wall and listen. You are welcome to sit there too.",
  "I hear you have been skipping stones at the creek. Mind the current. It is quicker than it looks."
);

// A village tea made from moonpetal and a berry. Mouse teaches it.
DATA.items.moonTea = {
  name: "Moon Tea", icon: "☕", color: "#c8d8ff",
  desc: "Soft, cool and sweet. Restores health.",
  consumable: true, heal: 40
};
DATA.recipes.push(
  { id: "moonTea", out: "moonTea", n: 1, needs: { moonpetal: 2, berry: 1 }, station: "kitchen", unlockedBy: "villager_mouse" }
);

// More journal entries for the new mini-games and the new meadow.
DATA.lore.push(
  { title: "Moles Keep Score", text: "The moles of the hills count their dormice in pebbles. Ten of them in one day is, to a mole, a very good morning.", unlock: () => (G.flags.whackBest || 0) >= 10 },
  { title: "Stones That Skip", text: "A stone that skips ten times has listened to the water. The creek keeps a tally of the best throws, though it never says so.", unlock: () => (G.flags.skipBest || 0) >= 10 },
  { title: "Stars Beneath the Grass", text: "The Starfall Meadow glows where the sky has touched it. The Willow hums quietly when it is near, as if remembering a song.", unlock: () => flag("depth_starfall_2") }
);
