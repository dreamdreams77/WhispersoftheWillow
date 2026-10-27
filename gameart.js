// Shared look for the village mini-games: a themed backdrop with a tree line, drifting motes
// and a vignette, and a readable header panel for the title and the controls.
const GAME_THEMES = {
  pond:   { top: "#0a1418", bottom: "#17332f", glow: "rgba(120,200,190,.18)", tree: "#0c1d1b", mote: "255,246,200" },
  dusk:   { top: "#1a1e34", bottom: "#2e4054", glow: "rgba(255,180,120,.22)", tree: "#0b1420", mote: "255,230,190" },
  forest: { top: "#101a10", bottom: "#243a1c", glow: "rgba(255,210,120,.16)", tree: "#0a1208", mote: "255,240,180" },
  grass:  { top: "#0f1d0f", bottom: "#2c4c24", glow: "rgba(200,240,140,.14)", tree: "#08120a", mote: "230,255,200" },
  ring:   { top: "#26384f", bottom: "#4b6a46", glow: "rgba(255,230,160,.25)", tree: "#18281f", mote: "255,240,200" },
};

// On a phone there is no keyboard, so the hints name the on-screen buttons instead.
const GAME_TOUCH = typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;
function touchText(str) {
  if (!GAME_TOUCH) return str;
  return str
    .replace(/ · Esc( or Z)? to finish early/g, "")
    .replace(/Z, Space or Act/g, "Act")
    .replace(/Z or Space/g, "Act")
    .replace(/Arrow keys, WASD or the d-pad/g, "D-pad")
    .replace(/Left and Right/g, "D-pad")
    .replace(/Left\/Right/g, "D-pad");
}

// Breaks text into lines that fit a width, using the font already set on the context.
function wrapLines(ctx, text, maxW) {
  const words = String(text).split(" "), lines = [];
  let line = "";
  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (line && ctx.measureText(test).width > maxW) { lines.push(line); line = w; }
    else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

// Where the header panel ends, so the rest of a game can lay itself out beneath it.
let GAME_HEADER_BOTTOM = 64;

// A dark rounded panel with a gold edge, holding the game title and the controls.
// The controls line wraps to fit narrow screens.
function gameHeader(ctx, title, sub) {
  ctx.save();
  const screenW = typeof CAM !== "undefined" ? CAM.vw : 800;
  const maxW = Math.min(screenW - 20, 640);
  sub = touchText(sub);
  ctx.font = "bold 16px Georgia";
  const tw = ctx.measureText(title).width;
  ctx.font = "12px Georgia";
  const lines = wrapLines(ctx, sub, maxW - 26);
  const sw = Math.max(0, ...lines.map(l => ctx.measureText(l).width));
  const pw = Math.min(maxW, Math.max(tw, sw) + 26), ph = 28 + lines.length * 16;
  ctx.fillStyle = "rgba(10,16,14,.7)";
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(10, 12, pw, ph, 8);
  else ctx.rect(10, 12, pw, ph);
  ctx.fill();
  ctx.strokeStyle = "rgba(230,190,100,.55)"; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.textAlign = "left";
  ctx.fillStyle = "#fff6dc"; ctx.font = "bold 16px Georgia";
  ctx.fillText(title, 22, 33);
  ctx.fillStyle = "#e6d9b8"; ctx.font = "12px Georgia";
  lines.forEach((l, i) => ctx.fillText(l, 22, 52 + i * 16));
  ctx.restore();
  GAME_HEADER_BOTTOM = 12 + ph;
  return GAME_HEADER_BOTTOM;
}

// A centred message that wraps to the screen width and stays on screen.
function gameMessage(ctx, text, cx, y, w) {
  if (!text) return;
  ctx.save();
  ctx.font = "18px Georgia"; ctx.textAlign = "center";
  const lines = wrapLines(ctx, touchText(text), w - 28);
  const maxY = (typeof CAM !== "undefined" ? CAM.vh : 9999) - 10;
  const y0 = Math.min(y, maxY - (lines.length - 1) * 22);
  ctx.shadowColor = "rgba(0,0,0,.75)"; ctx.shadowBlur = 4;
  ctx.fillStyle = "#fff6dc";
  lines.forEach((l, i) => ctx.fillText(l, cx, y0 + i * 22));
  ctx.restore();
}

function miniGameBusy() {
  return !!(MG.active || SK.active || AM.active || WM.active || RT.active || (typeof CV !== "undefined" && CV.active));
}
