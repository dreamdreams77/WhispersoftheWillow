// Boss fights get three phases (full health, below two thirds, below one third). Phase two adds
// telegraphed ground slams and thorn volleys. Phase three adds faster attacks and summons.
// Also here: the boss health bar and the title cards shown on entering a region, a floor or a boss room.

const REGION_SUBS = {
  heartwood: "Where the blight began", marsh: "The water remembers", grove: "Winter never left",
  fernwood: "Soft light between the ferns", thicket: "Thorns that watch", hollows: "Light below the roots",
  ashen: "Still warm underfoot", catacombs: "The roots go deeper still", starfall: "Where the sky touched the grass",
};

function showCard(title, sub) { EX.card = { title, sub: sub || "", t: 0, dur: 3.2 }; }

function bossPhase(e) {
  const r = e.hp / e.maxHp;
  return r > 0.66 ? 1 : r > 0.33 ? 2 : 3;
}

function bossUpdate(e, dt) {
  const ph = bossPhase(e);
  if (e.phase !== ph) {
    if (e.phase) {
      fxRing(e.x, e.y, e.r + 90, "rgba(255,120,90,.95)", 0.8);
      fxBurst(e.x, e.y, e.def.color, 30, 300, { size: 1.5 });
      fxShake(12); fxFreeze(0.16);
      e.windup = 0; e.charge = 0; e.volleyT = 0; e.sCd = 1.6;
      toast(ph === 2 ? `${e.def.name} snarls. The ground begins to shake.` : `${e.def.name} is enraged and calls for help.`, 3500);
    }
    e.phase = ph;
  }
  if (ph === 1 || e.charge > 0 || e.windup > 0) return;

  // a volley winds up with a glowing ring, then fires
  if (e.volleyT > 0) {
    e.volleyT -= dt;
    if (e.volleyT <= 0) {
      const n = ph === 3 ? 14 : 9, off = Math.random() * 6.28;
      for (let i = 0; i < n; i++) {
        const a = off + i * (6.2832 / n);
        EX.eproj.push({ x: e.x, y: e.y, vx: Math.cos(a) * 190, vy: Math.sin(a) * 190, t: 4, dmg: Math.round(e.dmg * 0.5), color: e.def.color });
      }
      fxBurst(e.x, e.y, e.def.color, 12, 200);
    }
    return;
  }

  e.sCd = (e.sCd == null ? 2 : e.sCd) - dt;
  if (e.sCd <= 0) {
    e.sCd = ph === 2 ? 4.2 : 3.0;
    if (Math.random() < 0.5) {
      const n = ph === 3 ? 3 : 2;
      for (let i = 0; i < n; i++) {
        const ox = i ? rand(-90, 90) : 0, oy = i ? rand(-90, 90) : 0;
        EX.slams.push({ x: clamp(EX.px + ox, 60, ROOM_W - 60), y: clamp(EX.py + oy, 60, ROOM_H - 60), t: 1.0 + i * 0.25, max: 1.0 + i * 0.25, r: 70, dmg: e.dmg, color: e.def.color });
      }
    } else {
      e.volleyT = 0.7;
    }
  }

  if (ph === 3) {
    e.sumCd = (e.sumCd == null ? 4 : e.sumCd) - dt;
    const room = EX.rooms[EX.cur];
    if (e.sumCd <= 0 && room.enemies.filter(o => !o.dead && o.minion).length < 4) {
      e.sumCd = 14;
      const pool = DATA.regions[EX.region].enemies;
      for (let k = 0; k < 2; k++) {
        const kind = pick(pool), m = spawnEnemy(kind, DATA.enemies[kind], 0);
        m.x = clamp(e.x + (k ? 70 : -70), 50, ROOM_W - 50); m.y = clamp(e.y + rand(-30, 30), 50, ROOM_H - 50);
        m.minion = true; m.noLoot = true; m.name = "Summoned " + m.def.name;
        room.enemies.push(m);
        fxRing(m.x, m.y, 40, "rgba(255,150,120,.9)", 0.4); fxBurst(m.x, m.y, m.def.color, 8, 150);
      }
    }
  }
}

function stepBossFx(dt) {
  for (const s of EX.slams) {
    s.t -= dt;
    if (s.t > 0) continue;
    s.done = true;
    fxRing(s.x, s.y, s.r + 24, "rgba(255,120,80,.95)", 0.45);
    fxBurst(s.x, s.y, s.color, 18, 260, { size: 1.3, grav: 200 });
    fxShake(10);
    if (dist(s, { x: EX.px, y: EX.py }) < s.r) damagePlayer(s.dmg);
  }
  EX.slams = EX.slams.filter(s => !s.done);
  for (const p of EX.eproj) {
    p.x += p.vx * dt; p.y += p.vy * dt; p.t -= dt;
    if (p.x < EDGE || p.x > ROOM_W - EDGE || p.y < EDGE || p.y > ROOM_H - EDGE) p.t = 0;
    if (p.t > 0 && EX.invuln <= 0 && dist(p, { x: EX.px, y: EX.py }) < 18) { damagePlayer(p.dmg); p.t = 0; fxBurst(p.x, p.y, p.color, 6, 140); }
  }
  EX.eproj = EX.eproj.filter(p => p.t > 0);
}

function drawBossFx(ctx, t) {
  for (const s of EX.slams) {
    const k = 1 - s.t / s.max;
    ctx.fillStyle = `rgba(255,70,50,${0.08 + 0.2 * k})`;
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = `rgba(255,110,80,${0.5 + 0.4 * Math.sin(t * 24)})`; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = "rgba(255,200,160,.8)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r * Math.max(0, k), 0, Math.PI * 2); ctx.stroke();
  }
  for (const e of EX.rooms[EX.cur].enemies) {
    if (e.dead || !(e.volleyT > 0)) continue;
    ctx.strokeStyle = `rgba(255,140,100,${0.5 + 0.4 * Math.sin(t * 30)})`; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 14 + (0.7 - e.volleyT) * 24, 0, Math.PI * 2); ctx.stroke();
  }
  for (const p of EX.eproj) {
    ctx.fillStyle = "rgba(0,0,0,.25)";
    ctx.beginPath(); ctx.ellipse(p.x, p.y + 10, 6, 2.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ff8a6a";
    ctx.beginPath(); ctx.arc(p.x, p.y, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); ctx.fill();
  }
}

// Screen space: the boss bar along the bottom, and the title card high on the screen.
function drawBossBar(ctx, w, h) {
  const room = EX.rooms[EX.cur];
  const boss = room && room.enemies.find(e => e.boss && !e.dead);
  if (!boss) return;
  const bw = Math.min(480, w - 40), bx = (w - bw) / 2, by = h - 46;
  ctx.fillStyle = "rgba(10,10,14,.7)"; ctx.fillRect(bx - 4, by - 22, bw + 8, 40);
  ctx.strokeStyle = "rgba(230,190,100,.6)"; ctx.lineWidth = 1.2; ctx.strokeRect(bx - 4, by - 22, bw + 8, 40);
  ctx.fillStyle = "#fff6dc"; ctx.font = "bold 14px Georgia"; ctx.textAlign = "center";
  ctx.fillText(`${boss.def.name}${boss.phase > 1 ? " · phase " + boss.phase : ""}`, w / 2, by - 6);
  ctx.fillStyle = "rgba(255,255,255,.12)"; ctx.fillRect(bx, by, bw, 10);
  ctx.fillStyle = ["#7fd17a", "#e0a63a", "#e0503a"][(boss.phase || 1) - 1];
  ctx.fillRect(bx, by, bw * clamp(boss.hp / boss.maxHp, 0, 1), 10);
  ctx.fillStyle = "rgba(10,10,14,.8)";
  ctx.fillRect(bx + bw * 0.33 - 1, by - 1, 2, 12); ctx.fillRect(bx + bw * 0.66 - 1, by - 1, 2, 12);
  ctx.textAlign = "left";
}

function drawCard(ctx, w, h) {
  const c = EX.card;
  if (!c) return;
  const a = c.t < 0.5 ? c.t / 0.5 : c.t > c.dur - 0.9 ? Math.max(0, (c.dur - c.t) / 0.9) : 1;
  const y = h * 0.28, band = ctx.createLinearGradient(0, y - 60, 0, y + 60);
  band.addColorStop(0, "rgba(0,0,0,0)"); band.addColorStop(0.5, `rgba(0,0,0,${0.55 * a})`); band.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = band; ctx.fillRect(0, y - 60, w, 120);
  ctx.save(); ctx.globalAlpha = a; ctx.textAlign = "center";
  ctx.shadowColor = "rgba(0,0,0,.8)"; ctx.shadowBlur = 8;
  const big = Math.min(38, w / 14);
  ctx.font = `${big}px Georgia`; ctx.fillStyle = "#fff0c8";
  ctx.fillText(c.title, w / 2 + (1 - a) * 12, y + 4);
  ctx.font = `italic ${Math.max(13, big * 0.4)}px Georgia`; ctx.fillStyle = "#d8cfa8";
  ctx.fillText(c.sub, w / 2, y + 30);
  ctx.strokeStyle = "rgba(230,190,100,.7)"; ctx.lineWidth = 1.5; ctx.shadowBlur = 0;
  const lw = Math.min(w * 0.3, 220) * a;
  ctx.beginPath(); ctx.moveTo(w / 2 - lw, y - big * 0.95); ctx.lineTo(w / 2 + lw, y - big * 0.95); ctx.stroke();
  ctx.restore();
}
