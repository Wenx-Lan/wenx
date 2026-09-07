// 实体：光球(玩家)、黑球敌人、Boss、资源、装备、子弹、粒子、飘字

class Player {
  constructor(){
    this.radius = CONFIG.player.radius;
    this.maxHp = Meta.maxHp();
    this.maxMp = Meta.maxMp();
    this.maxShield = Meta.maxShield();
    this.weapon = 'pulse';   // 初始武器
    this.passives = [];
    this.reset();
  }

  reset(){
    this.theta = 0;                          // 恒星(行星正上方)出发
    this.d = Galaxy.surfaceR(0) + this.radius;
    this.dtheta = 0;
    this.dd = 0;
    this.hp = this.maxHp;
    this.mp = this.maxMp;
    this.shield = this.maxShield;
    this.flying = false;
    this.grounded = true;
    this.facing = 1;
    this.invuln = 0;
    this.carried = 0;
    this.attackCooldown = 0;
    this.dead = false;
    this.syncXY();
  }

  syncXY(){ const p = Util.polar(this.theta, this.d); this.x = p.x; this.y = p.y; }

  hasPassive(id){ return this.passives.includes(id); }
  speedMul(){ return this.hasPassive('speed') ? CONFIG.passives.speed.speedMul : 1; }
  dmgMul(){ return this.hasPassive('shield') ? CONFIG.passives.shield.dmgMul : 1; }
  mpRegenMul(){ return this.hasPassive('mpreg') ? CONFIG.passives.mpreg.mpRegenMul : 1; }
  hpRegen(){ return this.hasPassive('hpregen') ? CONFIG.passives.hpregen.hpRegen : 0; }
  pickupRadius(){ return CONFIG.player.pickupRadius * (this.hasPassive('magnet') ? CONFIG.passives.magnet.magnetMul : 1); }

  update(dt){
    const c = CONFIG.player;

    // —— 角向移动 ——
    let dir = 0;
    if (Input.left) dir -= 1;
    if (Input.right) dir += 1;
    const angAccel = c.angAccel * this.speedMul();
    if (dir !== 0){
      this.dtheta += dir * angAccel * dt;
      this.dtheta = Util.clamp(this.dtheta, -c.maxAngVel, c.maxAngVel);
      this.facing = dir;
    } else {
      const f = c.angFriction * dt;
      if (Math.abs(this.dtheta) <= f) this.dtheta = 0;
      else this.dtheta -= Math.sign(this.dtheta) * f;
    }
    this.theta = Util.wrapAngle(this.theta + this.dtheta * dt);

    const surfR = Galaxy.surfaceR(this.theta) + this.radius;

    // —— 径向移动 ——
    if (this.flying){
      let rdir = 0;
      if (Input.up) rdir += 1;
      if (Input.down) rdir -= 1;
      this.dd += rdir * c.flyAccel * dt;
      this.dd -= c.gravity * dt;
      this.dd = Util.clamp(this.dd, -c.maxFall, c.maxRadialVel);
      this.d += this.dd * dt;
      this.d = Util.clamp(this.d, Galaxy.planetR + c.minAir, c.maxAir);
      this.mp -= c.flyDrain * dt;
      if (this.mp <= 0){ this.mp = 0; this.flying = false; }
      this.grounded = false;
      if (this.d <= surfR && this.dd <= 0){
        this.d = surfR; this.dd = 0; this.grounded = true;
      }
      // 飞行拖尾粒子
      if (Math.random() < 0.5){
        const a = Math.atan2(CONFIG.CY - this.y, CONFIG.CX - this.x);
        State.particles.push(new Particle(
          this.x + Math.cos(a) * this.radius * -1,
          this.y + Math.sin(a) * this.radius * -1,
          Math.cos(a) * 30, Math.sin(a) * 30, 0.35, CONFIG.colors.playerGlow, 2
        ));
      }
    } else {
      if (this.grounded){
        this.d = surfR;
        if (Input.jump){
          this.dd = c.jumpVel;
          this.grounded = false;
          AudioFX.sfx('jump');
        }
      } else {
        this.dd -= c.gravity * dt;
        this.d += this.dd * dt;
        if (this.d <= surfR){ this.d = surfR; this.dd = 0; this.grounded = true; }
      }
    }

    // —— 回复 ——
    this.mp = Math.min(this.maxMp, this.mp + c.mpRegen * this.mpRegenMul() * dt);
    const hr = this.hpRegen();
    if (hr > 0) this.hp = Math.min(this.maxHp, this.hp + hr * dt);
    this.shield = Math.min(this.maxShield, this.shield + 1.5 * dt);

    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    this.invuln = Math.max(0, this.invuln - dt);
    this.syncXY();
  }

  damage(amount, fromX, fromY){
    if (this.invuln > 0 || this.dead) return;
    let dmg = amount * this.dmgMul();
    if (this.shield > 0){
      const absorbed = Math.min(this.shield, dmg);
      this.shield -= absorbed;
      dmg -= absorbed;
    }
    this.hp -= dmg;
    this.invuln = CONFIG.player.invuln;
    this.dd += 60;                       // 受击小幅度弹起
    State.addShake(4);
    State.flash = 0.6;
    AudioFX.sfx('hit');
    State.spawnParticles(this.x, this.y, '#ff5470', 8, 90, 0.4);
    if (this.hp <= 0){ this.hp = 0; this.dead = true; }
  }

  nearestTarget(){
    let best = null, bd = 1e9;
    for (const e of State.enemies){
      const d = Util.dist(this.x, this.y, e.x, e.y);
      if (d < bd){ bd = d; best = e; }
    }
    if (State.boss && !State.boss.dead){
      const d = Util.dist(this.x, this.y, State.boss.x, State.boss.y);
      if (d < bd){ bd = d; best = State.boss; }
    }
    return best;
  }

  tryAttack(){
    if (!this.weapon || this.attackCooldown > 0) return;
    const w = CONFIG.weapons[this.weapon];
    if (!w || this.mp < w.mp) return;
    const target = this.nearestTarget();
    if (!target) return;
    if (Util.dist(this.x, this.y, target.x, target.y) > CONFIG.player.autoAttackRange) return;
    this.mp -= w.mp;
    this.attackCooldown = w.cooldown;
    const base = Util.angleTo(this.x, this.y, target.x, target.y);
    const proj = { damage: w.damage * Meta.dmgMul(), pierce: w.pierce, homing: w.homing, radius: w.radius, life: w.life };
    for (let i = 0; i < w.shots; i++){
      const off = w.shots === 1 ? 0 : (i - (w.shots - 1) / 2) * w.spread;
      const a = base + off;
      State.projectiles.push(new Projectile(
        this.x, this.y, Math.cos(a) * w.speed, Math.sin(a) * w.speed, proj
      ));
    }
    AudioFX.sfx('shoot');
  }
}


class Projectile {
  constructor(x, y, vx, vy, w){
    this.x = x; this.y = y; this.vx = vx; this.vy = vy;
    this.damage = w.damage;
    this.pierce = w.pierce;
    this.homing = w.homing;
    this.radius = w.radius;
    this.life = w.life;
    this.hit = new Set();
  }
  update(dt){
    if (this.homing){
      let best = null, bd = 1e9;
      for (const e of State.enemies){
        const d = Util.dist(this.x, this.y, e.x, e.y);
        if (d < bd){ bd = d; best = e; }
      }
      if (State.boss && !State.boss.dead){
        const d = Util.dist(this.x, this.y, State.boss.x, State.boss.y);
        if (d < bd){ bd = d; best = State.boss; }
      }
      if (best){
        const sp = Math.hypot(this.vx, this.vy);
        const cur = Math.atan2(this.vy, this.vx);
        const want = Util.angleTo(this.x, this.y, best.x, best.y);
        const na = cur + Util.clamp(Util.angleDiff(cur, want), -6 * dt, 6 * dt);
        this.vx = Math.cos(na) * sp; this.vy = Math.sin(na) * sp;
      }
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
  }
}


class Enemy {
  constructor(type, theta, d){
    this.type = type;
    this.radius = type === 'crawler' ? CONFIG.enemy.crawlerRadius : CONFIG.enemy.flyerRadius;
    this.theta = theta;
    this.d = d;
    this.hp = CONFIG.enemy.baseHp * Galaxy.diff.enemyHp;
    this.maxHp = this.hp;
    this.vx = 0; this.vy = 0;
    this.dtheta = 0;
    this.flash = 0;
    this.dead = false;
    this.syncXY();
  }
  syncXY(){ const p = Util.polar(this.theta, this.d); this.x = p.x; this.y = p.y; }

  update(dt){
    this.flash = Math.max(0, this.flash - dt);
    const p = State.player;
    const speedMul = Galaxy.diff.enemySpeed;

    if (this.type === 'crawler'){
      // 沿地表角向追踪
      const diff = Util.angleDiff(this.theta, p.theta);
      const dir = Math.sign(diff);
      const target = dir * CONFIG.enemy.crawlerAngSpeed * speedMul;
      this.dtheta += (target - this.dtheta) * Math.min(1, dt * 6);
      this.theta = Util.wrapAngle(this.theta + this.dtheta * dt);
      this.d = Util.lerp(this.d, Galaxy.surfaceR(this.theta) + this.radius, Math.min(1, dt * 8));
      this.syncXY();
    } else {
      // 飞行者：2D 追踪
      const dx = p.x - this.x, dy = p.y - this.y;
      const dd = Math.hypot(dx, dy) || 1;
      const accel = CONFIG.enemy.flyerAccel * speedMul;
      this.vx += (dx / dd) * accel * dt;
      this.vy += (dy / dd) * accel * dt;
      const maxSp = CONFIG.enemy.baseSpeed * speedMul;
      const sp = Math.hypot(this.vx, this.vy);
      if (sp > maxSp){ this.vx *= maxSp / sp; this.vy *= maxSp / sp; }
      this.x += this.vx * dt; this.y += this.vy * dt;

      const a = Math.atan2(this.y - CONFIG.CY, this.x - CONFIG.CX);
      const rr = Util.dist(CONFIG.CX, CONFIG.CY, this.x, this.y);
      const minR = Galaxy.planetR + 6, maxR = Galaxy.planetR + 92;
      if (rr < minR || rr > maxR){
        const nr = Util.clamp(rr, minR, maxR);
        this.x = CONFIG.CX + Math.cos(a) * nr;
        this.y = CONFIG.CY + Math.sin(a) * nr;
      }
    }
  }

  takeDamage(d){ this.hp -= d; this.flash = 0.08; if (this.hp <= 0) this.dead = true; }
}


class Boss {
  constructor(){
    this.radius = CONFIG.boss.radius;
    this.hp = Galaxy.diff.bossHp;
    this.maxHp = this.hp;
    const p = Galaxy.starPos();
    this.x = p.x; this.y = p.y;
    this.t = 0;
    this.shootT = 1.2;
    this.spawnT = 2.5;
    this.flash = 0;
    this.active = false;
    this.dead = false;
  }
  activate(){ this.active = true; }
  update(dt){
    this.flash = Math.max(0, this.flash - dt);
    this.t += dt;
    const p = Galaxy.starPos();
    this.x = p.x + Math.cos(this.t * 0.5) * 6;
    this.y = p.y + Math.sin(this.t * 0.5) * 6;
    if (!this.active) return;
    this.shootT -= dt;
    this.spawnT -= dt;
    if (this.shootT <= 0){ this.shootT = CONFIG.boss.shootInterval; this.shoot(); }
    if (this.spawnT <= 0){ this.spawnT = CONFIG.boss.spawnInterval; this.spawnMinions(); }
  }
  shoot(){
    const n = Galaxy.diff.bossBullets;
    const base = Math.random() * Math.PI * 2;
    for (let i = 0; i < n; i++){
      const a = base + i / n * Math.PI * 2;
      const sp = CONFIG.boss.bulletSpeed;
      State.ebullets.push({ x: this.x, y: this.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: CONFIG.boss.bulletRadius, life: 4 });
    }
    AudioFX.sfx('bossHit');
  }
  spawnMinions(){
    const n = Math.min(3, 1 + Galaxy.galaxyIndex);
    for (let i = 0; i < n; i++){
      const a = Math.random() * Math.PI * 2;
      const d = Galaxy.planetR + Util.rand(10, 40);
      State.enemies.push(new Enemy('flyer', a, d));
    }
  }
  takeDamage(d){ this.hp -= d; this.flash = 0.08; AudioFX.sfx('bossHit'); if (this.hp <= 0) this.dead = true; }
}


class Resource {
  constructor(theta, d){
    this.theta = theta; this.d = d; this.baseD = d;
    this.phase = Math.random() * Math.PI * 2;
    this.r = CONFIG.resource.radius;
    this.taken = false;
    this.syncXY();
  }
  syncXY(){ const p = Util.polar(this.theta, this.d); this.x = p.x; this.y = p.y; }
  update(dt){ this.d = this.baseD + Math.sin(State.time * 2 + this.phase) * 2; this.syncXY(); }
}


class EquipmentPickup {
  constructor(kind, id, theta, d){
    this.kind = kind;   // 'weapon' | 'passive'
    this.id = id;
    this.theta = theta; this.d = d; this.baseD = d;
    this.phase = Math.random() * Math.PI * 2;
    this.r = 5;
    this.taken = false;
    this.syncXY();
  }
  syncXY(){ const p = Util.polar(this.theta, this.d); this.x = p.x; this.y = p.y; }
  update(dt){ this.d = this.baseD + Math.sin(State.time * 2 + this.phase) * 2; this.syncXY(); }
}


class Particle {
  constructor(x, y, vx, vy, life, color, size){
    this.x = x; this.y = y; this.vx = vx; this.vy = vy;
    this.life = life; this.maxLife = life;
    this.color = color; this.size = size;
  }
  update(dt){
    this.x += this.vx * dt; this.y += this.vy * dt;
    this.vx *= 0.98; this.vy *= 0.98;
    this.life -= dt;
  }
}


class FloatText {
  constructor(x, y, text, color){
    this.x = x; this.y = y; this.text = text;
    this.color = color || '#ffffff';
    this.life = 1.0; this.vy = -20;
  }
  update(dt){ this.y += this.vy * dt; this.life -= dt; }
}
