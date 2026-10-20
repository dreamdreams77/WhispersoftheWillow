// Visible equipment: armor and weapons are drawn on the player, and have small painted icons in the Satchel.
const GEAR_OUT = "rgba(24,14,10,.7)";

function gearThornMail(g, x, y, w, h, t) {
  // a vest of overlapping leaf scales that wraps the body, with a leafy collar and shoulder thorns
  g.save(); g.lineJoin = "round";
  const body = () => { g.beginPath(); g.ellipse(x, y, w / 2, h / 2, 0, 0, Math.PI * 2); };
  const grad = g.createLinearGradient(x, y - h / 2, x, y + h / 2);
  grad.addColorStop(0, "#86b24c"); grad.addColorStop(1, "#4a6a2c");
  body(); g.fillStyle = grad; g.fill();
  g.save(); body(); g.clip();
  g.strokeStyle = "rgba(24,44,12,.55)"; g.lineWidth = 0.9;
  const rows = 4;
  for (let r = 0; r < rows; r++) {
    const yy = y - h / 2 + (r + 0.6) * h / rows;
    for (let c = -2; c <= 2; c++) {
      const xx = x + c * w * 0.26 + (r % 2) * w * 0.13;
      g.fillStyle = (r + c) % 2 ? "rgba(190,230,110,.35)" : "rgba(40,80,20,.25)";
      g.beginPath(); g.arc(xx, yy, w * 0.15, 0, Math.PI); g.fill(); g.stroke();
    }
  }
  g.restore();
  body(); g.strokeStyle = GEAR_OUT; g.lineWidth = 1.3; g.stroke();
  // a belt of bark
  g.fillStyle = "#5e4124"; g.fillRect(x - w * 0.5 + 0.5, y + h * 0.18, w - 1, h * 0.14);
  // collar of three leaves and two thorns on the shoulder
  g.fillStyle = "#6fa040";
  for (let i = -1; i <= 1; i++) { g.beginPath(); g.ellipse(x + w * 0.38 + i * 1.2, y - h * 0.5 + 0.5 + i * 2.2, 3.4, 1.7, 0.9 + i * 0.5, 0, Math.PI * 2); g.fill(); g.stroke(); }
  g.fillStyle = "#3a2a1a"; g.lineWidth = 1;
  for (const s of [-0.1, 0.18]) { g.beginPath(); g.moveTo(x + w * s - 2.4, y - h * 0.46); g.lineTo(x + w * s - 1, y - h * 0.46 - 6); g.lineTo(x + w * s + 1.6, y - h * 0.45); g.closePath(); g.fill(); g.stroke(); }
  g.restore();
}

function gearClaws(g, x, y, s, t, live) {
  // a yellow glove with three bright blades and a spark
  g.save(); g.translate(x, y); g.scale(s, s); g.lineJoin = "round";
  if (live) {
    const gl = g.createRadialGradient(5, 0, 0, 5, 0, 14);
    gl.addColorStop(0, `rgba(255,236,110,${0.4 + 0.2 * Math.sin(t * 9)})`); gl.addColorStop(1, "rgba(255,236,110,0)");
    g.fillStyle = gl; g.fillRect(-10, -14, 28, 28);
  }
  g.fillStyle = "#c9a23a"; g.strokeStyle = GEAR_OUT; g.lineWidth = 1.1;
  g.beginPath(); g.ellipse(0, 0, 3.4, 2.6, 0, 0, Math.PI * 2); g.fill(); g.stroke();
  for (let i = -1; i <= 1; i++) {
    g.fillStyle = "#f4f0d0";
    g.beginPath(); g.moveTo(2, i * 1.5 - 0.7); g.lineTo(9.5, i * 2.4); g.lineTo(2, i * 1.5 + 0.8); g.closePath(); g.fill(); g.stroke();
  }
  if (live && Math.sin(t * 12) > 0.2) {
    g.strokeStyle = "#fff6a8"; g.lineWidth = 1;
    g.beginPath(); g.moveTo(9, -3); g.lineTo(11, -1); g.lineTo(9.5, 0.5); g.lineTo(12, 3); g.stroke();
  }
  g.restore();
}

function gearSpear(g, x0, y0, x1, y1) {
  // an antler-tipped spear: a pale shaft wrapped in red cord, with a branching tip
  g.save(); g.lineCap = "round"; g.lineJoin = "round";
  const a = Math.atan2(y1 - y0, x1 - x0);
  g.strokeStyle = GEAR_OUT; g.lineWidth = 4; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
  g.strokeStyle = "#9a7a50"; g.lineWidth = 2.4; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
  g.strokeStyle = "#c0503a"; g.lineWidth = 1.3;
  for (let i = 1; i <= 3; i++) { const u = 0.55 + i * 0.1, px = x0 + (x1 - x0) * u, py = y0 + (y1 - y0) * u; g.beginPath(); g.moveTo(px - Math.sin(a) * 2, py + Math.cos(a) * 2); g.lineTo(px + Math.sin(a) * 2, py - Math.cos(a) * 2); g.stroke(); }
  g.translate(x1, y1); g.rotate(a);
  g.fillStyle = "#ece2c6"; g.strokeStyle = GEAR_OUT; g.lineWidth = 1;
  g.beginPath(); g.moveTo(-1, -2); g.lineTo(9, 0); g.lineTo(-1, 2); g.closePath(); g.fill(); g.stroke();
  for (const s of [-1, 1]) { g.beginPath(); g.moveTo(1, s * 1.5); g.quadraticCurveTo(3, s * 5, 7, s * 6); g.lineTo(5, s * 3.2); g.lineTo(2, s * 1.6); g.closePath(); g.fill(); g.stroke(); }
  g.restore();
}

// worn on the player: drawn in the animal's own coordinates, facing right
function drawGear(ctx, species, facing, B, T, walk) {
  const bd = ANIMAL_BUILD[species];
  if (!bd || (!G.equip.armor && !G.equip.weapon)) return;
  ctx.save();
  ctx.scale(facing || 1, 1);
  const by = bd.by + B;
  if (G.equip.weapon === "antlerSpear") gearSpear(ctx, bd.bx - bd.brx * 0.9, by + bd.bry * 0.7, bd.bx + bd.brx * 0.5, by - bd.bry - 15);
  if (G.equip.armor === "thornMail") {
    const w = bd.upright ? bd.brx * 1.5 : bd.brx * 1.25, h = bd.upright ? bd.bry * 1.5 : bd.bry * 1.8;
    gearThornMail(ctx, bd.bx + (bd.upright ? 0.5 : bd.brx * 0.2), by + (bd.upright ? 2 : 0.3), w, h, T);
  }
  if (G.equip.weapon === "clawGlove") {
    const fxp = bd.fx && bd.fx[0] != null ? bd.fx[0] : bd.bx + bd.brx * 0.5;
    const sw = walk ? Math.sin(walk) * 2.4 : 0;
    gearClaws(ctx, fxp + sw + 1.5, 9.4 + B, 1, T, true);
  }
  ctx.restore();
}

// small painted icons for the Satchel
function gearIcon(id, size) {
  const c = document.createElement("canvas"); c.width = c.height = size || 34;
  c.style.cssText = "vertical-align:middle;margin-right:6px";
  const g = c.getContext("2d"), k = c.width / 34;
  g.scale(k, k);
  if (id === "thornMail") gearThornMail(g, 17, 19, 24, 24, 0);
  else if (id === "clawGlove") { g.translate(3, 0); gearClaws(g, 9, 17, 2.1, 0.4, true); }
  else if (id === "antlerSpear") gearSpear(g, 5, 29, 24, 9);
  else return null;
  return c;
}
