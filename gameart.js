// Shared look for the village mini-games: a themed backdrop with a tree line, drifting motes
// and a vignette, and a readable header panel for the title and the controls.
const GAME_THEMES = {
  pond:   { top: "#0a1418", bottom: "#17332f", glow: "rgba(120,200,190,.18)", tree: "#0c1d1b", mote: "255,246,200" },
  dusk:   { top: "#1a1e34", bottom: "#2e4054", glow: "rgba(255,180,120,.22)", tree: "#0b1420", mote: "255,230,190" },
  forest: { top: "#101a10", bottom: "#243a1c", glow: "rgba(255,210,120,.16)", tree: "#0a1208", mote: "255,240,180" },
  grass:  { top: "#0f1d0f", bottom: "#2c4c24", glow: "rgba(200,240,140,.14)", tree: "#08120a", mote: "230,255,200" },
  ring:   { top: "#26384f", bottom: "#4b6a46", glow: "rgba(255,230,160,.25)", tree: "#18281f", mote: "255,240,200" },
};

function drawGameBackdrop(ctx, w, h, t, theme) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, theme.top); g.addColorStop(1, theme.bottom);
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);

  // a soft light behind the middle of the screen
  const gl = ctx.createRadialGradient(w * 0.5, h * 0.4, 10, w * 0.5, h * 0.4, Math.max(w, h) * 0.6);
  gl.addColorStop(0, theme.glow); gl.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gl; ctx.fillRect(0, 0, w, h);

  // a distant tree line, gently uneven
  ctx.fillStyle = theme.tree;
  ctx.beginPath(); ctx.moveTo(0, h);
  for (let x = 0; x <= w; x += 18) {
    const y = h * 0.2 + Math.sin(x * 0.021) * h * 0.04 + Math.sin(x * 0.067 + 1.3) * h * 0.02;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(w, h); ctx.closePath(); ctx.fill();

  // motes drifting through the air
  for (let i = 0; i < 24; i++) {
    const x = (i * 97 + t * (8 + (i % 5) * 3)) % w;
    const y = h * 0.15 + ((i * 53) % (h * 0.7)) + Math.sin(t + i) * 6;
    ctx.fillStyle = `rgba(${theme.mote},${0.15 + 0.15 * Math.sin(t * 2 + i)})`;
    ctx.beginPath(); ctx.arc(x, y, 1.6, 0, Math.PI * 2); ctx.fill();
  }

  // darker corners, so the middle of the play area reads first
  const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
  v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,.55)");
  ctx.fillStyle = v; ctx.fillRect(0, 0, w, h);
}

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
