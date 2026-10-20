// Options (volume, saving, loading, resetting) and the optional How to Play guide.
const SETTINGS_KEY = "whispers_willow_settings";
const OPT = { vol: 62, muted: false };

function loadSettings() {
  try {
    const raw = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "null");
    if (raw && typeof raw === "object") {
      if (typeof raw.vol === "number") OPT.vol = Math.max(0, Math.min(100, Math.round(raw.vol)));
      OPT.muted = !!raw.muted;
    }
  } catch (e) { /* settings are optional */ }
  applySettings();
}
function saveSettings() {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(OPT)); } catch (e) { /* ignore */ }
}
function applySettings() {
  SFX.setVolume(OPT.vol / 100 * 1.6);
  SFX.setMuted(OPT.muted);
}
loadSettings();

// keep the N key (mute) in step with the saved setting
(function hookMute() {
  const orig = SFX.setMuted;
  SFX.setMuted = m => { orig(m); OPT.muted = !!m; saveSettings(); };
})();

// ---------------- saving, loading, resetting ----------------
function currentSaveText() {
  try { if (G.scene === "village" || G.scene === "expedition") saveGame(); } catch (e) { /* keep going */ }
  try { return localStorage.getItem(SAVE_KEY); } catch (e) { return null; }
}

function exportSave() {
  const text = currentSaveText();
  if (!text) { toast("There is no save to export yet."); return; }
  let name = "willow", day = 1;
  try { const s = JSON.parse(text); name = String(s.name || "willow").replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "willow"; day = s.day || 1; } catch (e) { /* use defaults */ }
  const blob = new Blob([text], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `willow-save-${name}-day${day}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  toast("Save exported. Keep the file somewhere safe.");
}

function importSaveFile(file, done) {
  if (!file) return;
  const rd = new FileReader();
  rd.onerror = () => toast("That file could not be read.");
  rd.onload = () => {
    let raw = null;
    try { raw = JSON.parse(String(rd.result)); } catch (e) { raw = null; }
    if (!raw || typeof raw !== "object" || !validateSave(raw)) { toast("That does not look like a Willow save file."); return; }
    window.__noSave = true;
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(raw)); } catch (e) { window.__noSave = false; toast("Your browser would not store the save."); return; }
    toast("Save imported. Loading it now.");
    setTimeout(() => location.reload(), 700);
    if (done) done();
  };
  rd.readAsText(file);
}

function resetSave() {
  window.__noSave = true;
  try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ }
  toast("Save erased. Starting fresh.");
  setTimeout(() => location.reload(), 600);
}

// ---------------- the panels ----------------
function optEl(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

function buildOptions(box) {
  box.appendChild(optEl("h3", null, "Sound"));
  const row = optEl("div", "optrow");
  const lbl = optEl("label", null, "Volume");
  const rng = document.createElement("input");
  rng.type = "range"; rng.min = "0"; rng.max = "100"; rng.step = "1"; rng.value = String(OPT.vol);
  rng.setAttribute("aria-label", "Volume");
  const pct = optEl("span", null, OPT.vol + "%");
  rng.oninput = () => { OPT.vol = Number(rng.value); pct.textContent = OPT.vol + "%"; applySettings(); saveSettings(); };
  rng.onchange = () => { try { SFX.unlock(); SFX.play("gather"); } catch (e) { /* ignore */ } };
  ["keydown", "keyup"].forEach(ev => rng.addEventListener(ev, e => e.stopPropagation()));
  row.append(lbl, rng, pct);
  box.appendChild(row);
  const mrow = optEl("div", "optrow");
  const mute = document.createElement("input"); mute.type = "checkbox"; mute.id = "optMute" + Math.floor(Math.random() * 1e6); mute.checked = OPT.muted;
  const ml = optEl("label", null, "Mute all sound"); ml.htmlFor = mute.id;
  mute.onchange = () => { OPT.muted = mute.checked; applySettings(); saveSettings(); };
  mrow.append(mute, ml);
  box.appendChild(mrow);

  box.appendChild(optEl("h3", null, "Your save"));
  box.appendChild(optEl("p", null, "The game saves itself when you rest and after most big moments. Your save lives in this browser only, so export a copy now and then."));
  const srow = optEl("div", "optrow");
  const bSave = optEl("button", "ghost", "Save now");
  bSave.onclick = () => { if (G.scene === "village" || G.scene === "expedition") { saveGame(); toast("Game saved."); } else toast("Start or continue a game first."); };
  const bExp = optEl("button", "ghost", "Export to file");
  bExp.onclick = exportSave;
  const file = document.createElement("input"); file.type = "file"; file.accept = ".json,application/json"; file.style.display = "none";
  file.onchange = () => importSaveFile(file.files && file.files[0]);
  const bImp = optEl("button", "ghost", "Import from file");
  bImp.onclick = () => file.click();
  srow.append(bSave, bExp, bImp, file);
  box.appendChild(srow);
  box.appendChild(optEl("p", null, "Importing replaces the saved game in this browser and reloads the page."));

  const rrow = optEl("div", "optrow");
  const bReset = optEl("button", "ghost", "Reset save");
  let armed = false, timer = null;
  bReset.onclick = () => {
    if (!armed) {
      armed = true; bReset.textContent = "Tap again to erase everything";
      bReset.style.background = "#e6a89a";
      timer = setTimeout(() => { armed = false; bReset.textContent = "Reset save"; bReset.style.background = ""; }, 5000);
    } else { clearTimeout(timer); resetSave(); }
  };
  rrow.appendChild(bReset);
  box.appendChild(rrow);
}

const GUIDE = [
  ["The idea", [
    "You are a small woodland creature who lives under the Great Willow. The forest is blighted, and the Willow is weak. Gather what the forest offers, help your neighbours, and awaken the Willow's gifts one by one.",
    "Willowlight is the currency of the game. You earn it from creatures you defeat, errands, deeds, mini-games and wishes, and spend it on the Willow's gifts.",
  ]],
  ["Controls", [
    "Phone: the d-pad moves you. Act talks, opens, reads and picks things up. Strike attacks. Dodge rolls out of danger. Menu opens your satchel and tabs.",
    "Keyboard: arrow keys or WASD move. Z, Space or Enter act. X or J strike. C or Shift dodge. M or Tab opens the menu. N mutes. Escape closes things and ends mini-games early.",
  ]],
  ["The village", [
    "Walk up to anything with a label and a prompt appears. Talk to villagers every day, because friendship unlocks recipes, tasks and gifts.",
    "Rest at the Great Willow to start a new day. Read the Notice Board for a daily errand. Make wishes at the well. Visit the Carnival Midway for five games, and watch for Marigold's cart every third day.",
  ]],
  ["Expeditions", [
    "Use the gates at the edge of the village to enter the wild. Each region is a string of rooms with creatures, plants to gather and sometimes a guardian at the end. Some regions only open in certain seasons or after you have grown stronger.",
    "Strike to fight and gather. Dodge costs stamina. Pollen Draughts and similar items heal you. If you fall, you wake back at the Willow.",
  ]],
  ["Growing stronger", [
    "Craft at the Kitchen, Workshop and other stations from what you gather. Equip armor and weapons from the Satchel tab. Spend Willowlight on the Willow tab.",
    "The Deeds tab lists goals that pay Willowlight and raise your rank. The Journal fills with stories as you explore.",
  ]],
  ["Good to know", [
    "There is no timer on the village. Take it slowly, and come back each day.",
    "Mini-games can be played once per game per day, and your best scores are kept.",
    "Use Options to change the volume, and to export or import your save so it is never lost.",
  ]],
];

function buildGuide(box) {
  const wrap = optEl("div", "guide");
  wrap.appendChild(optEl("h3", null, "How to Play"));
  for (const [title, lines] of GUIDE) {
    wrap.appendChild(optEl("h3", null, title));
    for (const l of lines) wrap.appendChild(optEl("p", null, l));
  }
  box.appendChild(wrap);
}

function renderOptions(body) { body.appendChild(optEl("h3", null, "Options")); buildOptions(body); }
function renderGuide(body) { buildGuide(body); }

// the title screen opens these as an overlay
function openTitlePanel(kind) {
  let p = document.getElementById("optPanel");
  if (!p) { p = optEl("div", "panel hidden"); p.id = "optPanel"; document.getElementById("game").appendChild(p); }
  p.innerHTML = "";
  p.appendChild(optEl("h3", null, kind === "guide" ? "How to Play" : "Options"));
  if (kind === "guide") { const g = optEl("div"); buildGuide(g); g.querySelector("h3").remove(); p.appendChild(g); } else buildOptions(p);
  const close = optEl("button", null, "Back");
  close.style.marginTop = "10px";
  close.onclick = () => p.classList.add("hidden");
  p.appendChild(close);
  p.classList.remove("hidden");
  p.scrollTop = 0;
}
document.getElementById("btnGuide").onclick = () => openTitlePanel("guide");
document.getElementById("btnOptions").onclick = () => openTitlePanel("options");
