// UI: dialogue, menus, title screen.
const UI = { dlgSel: 0, menuTab: "satchel", station: null, title: { species: "fox", origin: "hedgerow" } };

// ---------- Dialogue ----------
function openDialogue(name, text, choices) {
  G.dialogue = true;
  document.body.classList.add("dlg-open"); // hides touch controls so they don't cover the text
  const box = document.getElementById("dialogue");
  document.getElementById("dlgName").textContent = name;
  document.getElementById("dlgText").textContent = text;
  const wrap = document.getElementById("dlgChoices");
  wrap.innerHTML = "";
  const closeBtn = document.getElementById("dlgClose");
  if (choices && choices.length) {
    closeBtn.classList.add("hidden");
    for (const c of choices) {
      const b = document.createElement("button");
      b.textContent = c.label;
      b.className = "ghost";
      b.onclick = () => { closeDialogue(); c.fn(); };
      wrap.appendChild(b);
    }
    highlightChoice(0);
    const hint = document.createElement("div");
    hint.className = "hint";
    hint.textContent = "Keys: 1-" + choices.length + " or Up/Down, then Z";
    wrap.appendChild(hint);
  } else {
    closeBtn.classList.remove("hidden");
  }
  box.classList.remove("hidden");
}

// Keyboard focus among dialogue choices.
function highlightChoice(i) {
  const btns = [...document.querySelectorAll("#dlgChoices button")];
  if (!btns.length) return;
  UI.dlgSel = (i + btns.length) % btns.length;
  btns.forEach((b, k) => b.classList.toggle("sel", k === UI.dlgSel));
}

function closeDialogue() {
  G.dialogue = null;
  document.body.classList.remove("dlg-open");
  document.getElementById("dialogue").classList.add("hidden");
}

// ---------- Menu ----------
const MENU_TABS = [
  { id: "satchel", label: "Satchel" },
  { id: "craft",   label: "Craft" },
  { id: "willow",  label: "Willow" },
  { id: "friends", label: "Friends" },
  { id: "quest",   label: "Quest" },
  { id: "journal", label: "Journal" },
  { id: "deeds",   label: "Deeds" },
  { id: "guide",   label: "Guide" },
  { id: "options", label: "Options" },
];

function openMenu(tab, station) {
  if (G.scene !== "village" && G.scene !== "expedition") return;
  if (G.scene === "expedition") return; // no menus mid-expedition
  UI.menuTab = tab || "satchel";
  UI.station = station || null;
  G.menu = true;
  document.getElementById("menu").classList.remove("hidden");
  renderMenu();
}

function closeMenu() {
  G.menu = null;
  document.getElementById("menu").classList.add("hidden");
}

function renderMenu() {
  const tabs = document.getElementById("menuTabs");
  tabs.innerHTML = "";
  for (const t of MENU_TABS) {
    const b = document.createElement("button");
    b.textContent = t.label;
    b.className = t.id === UI.menuTab ? "" : "ghost";
    b.onclick = () => { UI.menuTab = t.id; renderMenu(); };
    tabs.appendChild(b);
  }
  const body = document.getElementById("menuBody");
  body.innerHTML = "";
  if (UI.menuTab === "satchel") { renderSatchel(body); renderCompanions(body); }
  if (UI.menuTab === "craft") renderCraft(body);
  if (UI.menuTab === "willow") renderWillow(body);
  if (UI.menuTab === "friends") renderFriends(body);
  if (UI.menuTab === "quest") renderQuest(body);
  if (UI.menuTab === "journal") renderJournal(body);
  if (UI.menuTab === "deeds") renderDeeds(body);
  if (UI.menuTab === "guide") renderGuide(body);
  if (UI.menuTab === "options") renderOptions(body);
}

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

function renderSatchel(body) {
  body.appendChild(el("h3", null, `${G.name} the ${DATA.species[G.species].name}`));
  body.appendChild(el("p", null, `Origin: ${(DATA.origins[G.origin] || {}).name || "Unknown"}`));
  body.appendChild(el("p", null, DATA.species[G.species].desc + " " + DATA.species[G.species].ability));
  body.appendChild(el("p", null, `Health ${Math.round(G.hp)}/${G.maxHp}  ·  Willowlight ${G.wl}`));
  const list = el("div", "list");
  const keys = Object.keys(G.inv);
  if (!keys.length) list.appendChild(el("div", "slot", "Your satchel is empty."));
  for (const k of keys) {
    const d = DATA.items[k];
    const s = el("div", "slot");
    const head = el("b", null, "");
    const gi = typeof gearIcon === "function" ? gearIcon(k, 34) : null;
    if (gi) head.appendChild(gi);
    head.appendChild(document.createTextNode(`${gi ? "" : d.icon + " "}${d.name} × ${G.inv[k]}`));
    s.appendChild(head);
    s.appendChild(el("small", null, d.desc));
    if (d.consumable && d.heal) {
      const b = el("button", "ghost", "Use");
      b.style.marginTop = "4px";
      b.onclick = () => { if (takeItem(k, 1)) { healPlayer(d.heal); toast(`Healed ${d.heal}`); renderMenu(); } };
      s.appendChild(b);
    }
    if (d.equip) {
      const b = el("button", "ghost", G.equip[d.equip] === k ? "Unequip" : "Equip");
      b.style.marginTop = "4px";
      b.onclick = () => { G.equip[d.equip] = G.equip[d.equip] === k ? null : k; renderMenu(); };
      s.appendChild(b);
    }
    list.appendChild(s);
  }
  body.appendChild(list);
  body.appendChild(el("p", null, `Equipped: weapon ${G.equip.weapon ? DATA.items[G.equip.weapon].name : "none"}, armor ${G.equip.armor ? DATA.items[G.equip.armor].name : "none"}`));
}

function recipeUnlocked(r) {
  if (r.unlockFlag && !flag(r.unlockFlag)) return false;
  if (!r.unlockedBy) return true;
  if (willowOwned("wisdom")) return true;
  return (G.relations[r.unlockedBy] || 0) >= 1;
}

function renderCraft(body) {
  const st = UI.station || "workshop";
  body.appendChild(el("h3", null, st === "kitchen" ? "Communal Kitchen" : "Workshop"));
  const list = el("div", "list");
  for (const r of DATA.recipes.filter(x => x.station === st)) {
    const out = DATA.items[r.out];
    const s = el("div", "slot");
    s.appendChild(el("b", null, `${out.icon} ${out.name}${r.n > 1 ? " ×" + r.n : ""}`));
    if (!recipeUnlocked(r)) {
      s.appendChild(el("small", null, r.unlockFlag ? "Locked: a deeper secret still sleeps below." : "Locked: befriend the villager to learn this recipe."));
    } else {
      const need = Object.entries(r.needs).map(([k, v]) => `${DATA.items[k].name} ${G.inv[k] || 0}/${v}`).join(", ");
      s.appendChild(el("small", null, need));
      const can = Object.entries(r.needs).every(([k, v]) => hasItem(k, v));
      const b = el("button", "ghost", "Craft");
      b.style.marginTop = "4px";
      b.disabled = !can;
      b.onclick = () => {
        for (const [k, v] of Object.entries(r.needs)) takeItem(k, v);
        addItem(r.out, r.n);
        G.flags.stat_crafts = (G.flags.stat_crafts || 0) + 1;
        toast(`Crafted ${out.name}`);
        renderMenu();
      };
      s.appendChild(b);
    }
    list.appendChild(s);
  }
  body.appendChild(list);
}

function renderWillow(body) {
  body.appendChild(el("h3", null, "The Great Willow"));
  body.appendChild(el("p", null, `Willowlight: ✦ ${G.wl}. Spend it to awaken the Willow.`));
  const list = el("div", "list");
  for (const [id, u] of Object.entries(DATA.willow)) {
    const s = el("div", "slot");
    s.appendChild(el("b", null, u.name));
    s.appendChild(el("small", null, u.desc));
    if (willowOwned(id)) {
      s.appendChild(el("small", null, "Awakened ✓"));
    } else {
      const b = el("button", "ghost", `Awaken (${u.cost} ✦)`);
      b.style.marginTop = "4px";
      b.disabled = G.wl < u.cost || (u.needs && !willowOwned(u.needs));
      b.onclick = () => { if (buyWillow(id)) renderMenu(); };
      s.appendChild(b);
      if (u.needs && !willowOwned(u.needs)) s.appendChild(el("small", null, `Needs ${DATA.willow[u.needs].name}`));
    }
    list.appendChild(s);
  }
  body.appendChild(list);
}

function renderFriends(body) {
  body.appendChild(el("h3", null, "Woodland Friends"));
  const list = el("div", "list");
  for (const [id, v] of Object.entries(DATA.villagers)) {
    const s = el("div", "slot");
    s.appendChild(el("b", null, `${v.name} · ${v.role}`));
    s.appendChild(el("small", null, `${v.species}. ${v.personality}`));
    s.appendChild(el("small", null, `Friendship ${G.relations[id] || 0}`));
    list.appendChild(s);
  }
  body.appendChild(list);
}

function renderQuest(body) {
  const q = DATA.quests[G.quest];
  body.appendChild(el("h3", null, q.title));
  const ul = el("ul");
  for (const st of q.steps) {
    const done = flag(st.check.split(":")[1]);
    ul.appendChild(el("li", null, `${done ? "✓" : "○"} ${st.text}`));
  }
  body.appendChild(ul);
  const er = G.flags.errand;
  if (er && er.day === G.day) {
    body.appendChild(el("h3", null, "Today's Errand"));
    const nm = DATA.items[er.item].name, vv = DATA.villagers[er.who];
    body.appendChild(el("p", null, er.done ? `Done. ${vv.name} says thank you.` : `Bring ${er.n} ${nm} to ${vv.name} (you have ${G.inv[er.item] || 0}). Reward: ${er.wl} Willowlight.`));
  }
  body.appendChild(el("h3", null, "Friends' Tasks"));
  const ul2 = el("ul");
  for (const [id, pq] of Object.entries(DATA.personal)) {
    const v = DATA.villagers[id];
    let status;
    if (flag(pqKey(id, "done"))) status = "✓ done";
    else if (flag(pqKey(id, "start"))) status = `○ ${DATA.items[pq.need.item].name} ${Math.min(G.inv[pq.need.item] || 0, pq.need.n)}/${pq.need.n}`;
    else status = `befriend ${v.name} to receive it (${G.relations[id] || 0}/${pq.giveAt})`;
    ul2.appendChild(el("li", null, `${pq.title}: ${status}`));
  }
  body.appendChild(ul2);
}

function renderJournal(body) {
  body.appendChild(el("h3", null, "Journal"));
  const list = el("div", "list");
  let n = 0;
  for (const entry of DATA.lore) {
    if (!entry.unlock()) continue;
    n++;
    const s = el("div", "slot");
    s.appendChild(el("b", null, entry.title));
    s.appendChild(el("small", null, entry.text));
    list.appendChild(s);
  }
  if (!n) body.appendChild(el("p", null, "Entries are written as you explore the forest."));
  body.appendChild(list);
}

// ---------- Title / new game ----------
function renderSpeciesPick() {
  const wrap = document.getElementById("speciesPick");
  wrap.innerHTML = "";
  for (const [id, s] of Object.entries(DATA.species)) {
    const b = el("button", UI.title.species === id ? "sel" : "", s.name);
    b.onclick = () => { UI.title.species = id; renderSpeciesPick(); };
    wrap.appendChild(b);
  }
  const desc = el("p", null, DATA.species[UI.title.species].desc);
  desc.style.fontSize = "13px";
  wrap.appendChild(desc);
}

function newGame() {
  const name = (document.getElementById("nameIn").value || "Pip").trim().slice(0, 14) || "Pip";
  const sp = DATA.species[UI.title.species];
  const og = DATA.origins[UI.title.origin] || DATA.origins.hedgerow;
  Object.assign(G, {
    species: UI.title.species, name, hp: sp.maxHp, maxHp: sp.maxHp, stamina: 100,
    inv: startingKit(UI.title.origin), equip: { weapon: null, armor: null },
    wl: 0, day: 1, season: 0, weather: "clear", flags: {}, willow: {}, relations: { [og.friend]: og.rel }, origin: UI.title.origin, pets: [], activePet: null, quest: "silverbell",
    visitedRegions: {},
  });
  G.scene = "village";
  resetVillageNodes();
  P.x = 700; P.y = 700;
  saveGame();
  showGame();
  toast(`Welcome to the Willow, ${name}.`);
}

function continueGame() {
  if (!loadGame()) { toast("No usable save found."); return; }
  const sp = DATA.species[G.species];
  G.maxHp = G.maxHp || sp.maxHp;
  G.weather = G.weather || "clear";
  G.scene = "village";
  resetVillageNodes();
  P.x = 700; P.y = 700;
  showGame();
  toast("Welcome back.");
}

// Touch buttons only appear on touch-capable devices, so desktop play has no overlay.
function showGame() {
  document.getElementById("title").classList.add("hidden");
  const touchCapable = navigator.maxTouchPoints > 0 || "ontouchstart" in window;
  if (touchCapable) document.getElementById("touch").classList.remove("hidden");
  updateHud();
}

function startingKit(originId) {
  const inv = { berry: 3, acorn: 2, wood: 1 };
  const extra = (DATA.origins[originId] || {}).items || {};
  for (const k of Object.keys(extra)) inv[k] = (inv[k] || 0) + extra[k];
  return inv;
}

function renderOriginPick() {
  const wrap = document.getElementById("originPick");
  wrap.innerHTML = "";
  for (const [id, o] of Object.entries(DATA.origins)) {
    const b = el("button", UI.title.origin === id ? "sel" : "", o.name);
    b.onclick = () => { UI.title.origin = id; renderOriginPick(); };
    wrap.appendChild(b);
  }
  const p = el("p", null, DATA.origins[UI.title.origin].desc);
  p.style.fontSize = "13px";
  wrap.appendChild(p);
}

function renderCompanions(body) {
  body.appendChild(el("h3", null, "Companions"));
  const pets = G.pets || [];
  if (!pets.length) {
    body.appendChild(el("p", null, "No companions yet. Rescue lost critters on expeditions to earn one."));
    return;
  }
  const list = el("div", "list");
  for (const id of pets) {
    const pet = DATA.pets[id];
    const s = el("div", "slot");
    s.appendChild(el("b", null, pet.name + (G.activePet === id ? " (walking with you)" : "")));
    s.appendChild(el("small", null, pet.desc));
    s.appendChild(el("small", null, "Passive: " + pet.passive));
    const b = el("button", "ghost", G.activePet === id ? "Walking" : "Walk with");
    b.style.marginTop = "4px";
    b.disabled = G.activePet === id;
    b.onclick = () => { G.activePet = id; renderMenu(); };
    s.appendChild(b);
    list.appendChild(s);
  }
  body.appendChild(list);
}
