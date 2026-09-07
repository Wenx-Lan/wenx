// 渲染管线：星空 / 行星 / 地形 / 实体 / 光晕 / 粒子 / 震屏
const Render = {
  ctx: null,

  init(){ this.ctx = document.getElementById('game').getContext('2d'); },

  glow(x, y, r, color, alpha){
    const ctx = this.ctx;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, Util.hexToRgba(color, alpha));
    g.addColorStop(1, Util.hexToRgba(color, 0));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  },

  draw(){
    const ctx = this.ctx;
    const hue = Galaxy.hue;

    // 背景
    const bg = ctx.createLinearGradient(0, 0, 0, CONFIG.HEIGHT);
    bg.addColorStop(0, CONFIG.colors.bgTop);
    bg.addColorStop(1, CONFIG.colors.bgBottom);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);

    // 星云
    let g = ctx.createRadialGradient(CONFIG.CX - 140, CONFIG.CY - 80, 0, CONFIG.CX - 140, CONFIG.CY - 80, 160);
    g.addColorStop(0, `hsla(${hue},60%,45%,0.10)`); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);
    g = ctx.createRadialGradient(CONFIG.CX + 150, CONFIG.CY + 70, 0, CONFIG.CX + 150, CONFIG.CY + 70, 180);
    g.addColorStop(0, `hsla(${(hue + 80) % 360},60%,45%,0.08)`); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);

    // 星空
    for (const s of State.stars){
      const tw = 0.5 + 0.5 * Math.sin(State.time * 2 + s.p);
      ctx.globalAlpha = 0.4 + 0.6 * tw;
      ctx.fillStyle = '#dfe8ff';
      ctx.fillRect(s.x, s.y, s.s, s.s);
    }
    ctx.globalAlpha = 1;

    // 震屏
    ctx.save();
    if (State.shake > 0){
      ctx.translate(Util.rand(-State.shake, State.shake), Util.rand(-State.shake, State.shake));
    }

    this.drawPlanet();
    this.drawStar();

    for (const eq of State.equipments) this.drawEquipment(eq);
    for (const r of State.resources) this.drawResource(r);
    for (const e of State.enemies) this.drawEnemy(e);
    if (State.boss) this.drawBoss(State.boss);
    if (State.player && !State.player.dead) this.drawPlayer(State.player);

    for (const p of State.projectiles) this.drawProjectile(p, CONFIG.colors.projPlayer);
    for (const b of State.ebullets) this.drawProjectile(b, CONFIG.colors.projEnemy);

    for (const p of State.particles){
      ctx.globalAlpha = Util.clamp(p.life / p.maxLife, 0, 1);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;

    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    for (const t of State.texts){
      ctx.globalAlpha = Util.clamp(t.life, 0, 1);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';

    ctx.restore();

    // 受击闪白
    if (State.flash > 0){
      ctx.fillStyle = `rgba(255,255,255,${Util.clamp(State.flash, 0, 1) * 0.5})`;
      ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);
    }
  },

  drawPlanet(){
    const ctx = this.ctx;
    const R = Galaxy.planetR, hue = Galaxy.hue;

    const g = ctx.createRadialGradient(CONFIG.CX - R * 0.35, CONFIG.CY - R * 0.35, R * 0.1, CONFIG.CX, CONFIG.CY, R);
    g.addColorStop(0, `hsl(${hue},65%,60%)`);
    g.addColorStop(1, `hsl(${hue},60%,34%)`);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(CONFIG.CX, CONFIG.CY, R, 0, Math.PI * 2); ctx.fill();

    // 地形边缘（起伏地表）
    ctx.beginPath();
    const steps = 120;
    for (let i = 0; i <= steps; i++){
      const th = i / steps * Math.PI * 2;
      const p = Util.polar(th, Galaxy.surfaceR(th));
      if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
    ctx.fillStyle = `hsl(${hue},50%,26%)`;
    ctx.fill();

    // 环形山
    const rng = Util.mulberry32(Galaxy.seed + 7);
    ctx.fillStyle = `hsla(${hue},50%,22%,0.5)`;
    for (let i = 0; i < 6; i++){
      const a = rng() * Math.PI * 2;
      const rr = rng() * R * 0.6 + R * 0.1;
      const px = CONFIG.CX + Math.cos(a) * rr;
      const py = CONFIG.CY + Math.sin(a) * rr;
      const cr = rng() * 5 + 2;
      ctx.beginPath(); ctx.arc(px, py, cr, 0, Math.PI * 2); ctx.fill();
    }

    // 大气辉光
    this.glow(CONFIG.CX, CONFIG.CY, R + 8, '#ffffff', 0.12);
  },

  drawStar(){
    const ctx = this.ctx;
    const p = Galaxy.starPos();
    this.glow(p.x, p.y, 26, CONFIG.colors.starGlow, 0.9);
    this.glow(p.x, p.y, 12, CONFIG.colors.star, 1);
    ctx.fillStyle = CONFIG.colors.star;
    ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, Math.PI * 2); ctx.fill();

    // 光柱
    const surf = Util.polar(0, Galaxy.surfaceR(0));
    const g = ctx.createLinearGradient(p.x, p.y, surf.x, surf.y);
    g.addColorStop(0, 'rgba(255,243,176,0.45)');
    g.addColorStop(1, 'rgba(255,243,176,0)');
    ctx.strokeStyle = g; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(surf.x, surf.y); ctx.stroke();
  },

  drawPlayer(p){
    const ctx = this.ctx;
    const blink = p.invuln > 0 && Math.floor(State.time * 20) % 2 === 0;

    ctx.save();
    if (blink) ctx.globalAlpha = 0.45;
    this.glow(p.x, p.y, 16, CONFIG.colors.playerGlow, 0.8);
    this.glow(p.x, p.y, 9, CONFIG.colors.player, 1);
    ctx.fillStyle = CONFIG.colors.player;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // 携带的资源环绕
    const n = p.carried;
    for (let i = 0; i < n; i++){
      const a = State.time * 3 + i / Math.max(1, n) * Math.PI * 2;
      ctx.fillStyle = CONFIG.colors.resource;
      ctx.fillRect(p.x + Math.cos(a) * 12 - 1.5, p.y + Math.sin(a) * 12 - 1.5, 3, 3);
    }
  },

  drawEnemy(e){
    const ctx = this.ctx;
    this.glow(e.x, e.y, 12, CONFIG.colors.enemyGlow, 0.5);
    ctx.fillStyle = e.flash > 0 ? '#ffffff' : CONFIG.colors.enemy;
    ctx.beginPath(); ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = CONFIG.colors.enemyEdge; ctx.lineWidth = 1.5; ctx.stroke();

    const a = Util.angleTo(e.x, e.y, State.player.x, State.player.y);
    ctx.fillStyle = '#ff2e4d';
    ctx.fillRect(e.x + Math.cos(a) * 3 - 1, e.y + Math.sin(a) * 3 - 1, 2, 2);

    if (e.hp < e.maxHp){
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.fillRect(e.x - 6, e.y - 9, 12, 2);
      ctx.fillStyle = '#ff5470';
      ctx.fillRect(e.x - 6, e.y - 9, 12 * Util.clamp(e.hp / e.maxHp, 0, 1), 2);
    }
  },

  drawBoss(b){
    const ctx = this.ctx;
    this.glow(b.x, b.y, 42, CONFIG.colors.enemyGlow, 0.7);
    ctx.fillStyle = b.flash > 0 ? '#ffffff' : '#05060a';
    ctx.beginPath(); ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ff5470'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#ff2e4d';
    ctx.beginPath(); ctx.arc(b.x, b.y, b.radius * 0.5, 0, Math.PI * 2); ctx.fill();
  },

  drawEquipment(eq){
    const ctx = this.ctx;
    const col = eq.kind === 'weapon' ? '#ffd23f' : CONFIG.colors.equip;
    this.glow(eq.x, eq.y, 10, col, 0.6);
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(eq.x, eq.y, eq.r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#05060a';
    ctx.font = 'bold 7px monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const icon = eq.kind === 'weapon' ? CONFIG.weapons[eq.id].icon : CONFIG.passives[eq.id].icon;
    ctx.fillText(icon, eq.x, eq.y);
    ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  },

  drawResource(r){
    const ctx = this.ctx;
    this.glow(r.x, r.y, 8, CONFIG.colors.resourceGlow, 0.7);
    ctx.fillStyle = CONFIG.colors.resource;
    ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2); ctx.fill();
  },

  drawProjectile(p, color){
    const ctx = this.ctx;
    const r = p.radius || p.r || 2.5;
    this.glow(p.x, p.y, 7, color, 0.7);
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
  },
};
