// 游戏状态机与主循环
const State = {
  mode: 'title',   // title | playing | paused | galaxycomplete | gameover | victory
  player: null,
  enemies: [], resources: [], equipments: [], projectiles: [], ebullets: [], particles: [], texts: [],
  boss: null,
  resourcesBanked: 0,
  prevTheta: 0,
  time: 0,
  shake: 0,
  flash: 0,
  warpT: 0,
  msg: '', msgT: 0,
  stars: [],

  addShake(m){ this.shake = Math.max(this.shake, m); },
  toast(text, dur){ this.msg = text; this.msgT = dur || 1.6; },
  spawnParticles(x, y, color, n, spread, life){
    for (let i = 0; i < n; i++){
      const a = Math.random() * Math.PI * 2;
      const s = Util.rand(20, spread);
      this.particles.push(new Particle(x, y, Math.cos(a) * s, Math.sin(a) * s, Util.rand(life * 0.5, life), color, Util.randInt(1, 3)));
    }
  },
};

// 跨星系持久升级（元进度）
const Meta = {
  resources: 0,
  levels: { maxHp: 0, maxMp: 0, shield: 0, equip: 0 },
  cost(id){ const u = CONFIG.upgrades[id]; return u.base + u.growth * this.levels[id]; },
  maxHp(){ return CONFIG.player.maxHp + this.levels.maxHp * CONFIG.upgrades.maxHp.add; },
  maxMp(){ return CONFIG.player.maxMp + this.levels.maxMp * CONFIG.upgrades.maxMp.add; },
  maxShield(){ return this.levels.shield * CONFIG.upgrades.shield.add; },
  dmgMul(){ return 1 + this.levels.equip * CONFIG.upgrades.equip.add; },
};

let last = 0;
let enemyTimer = 0, resTimer = 0, eqTimer = 0;

function boot(){
  Render.init();
  Input.init();
  for (let i = 0; i < 90; i++){
    State.stars.push({ x: Util.rand(0, CONFIG.WIDTH), y: Util.rand(0, CONFIG.HEIGHT), s: Util.randInt(1, 2), p: Math.random() * Math.PI * 2 });
  }
  setupUI();
  Galaxy.start(0);   // 预初始化，使标题画面能渲染行星
  showScreen('title');
  requestAnimationFrame(loop);
}

function loop(ts){
  requestAnimationFrame(loop);
  if (!last) last = ts;
  let dt = (ts - last) / 1000;
  last = ts;
  dt = Math.min(dt, 0.05);

  Input.update();
  update(dt);
  Input.endFrame();

  Render.draw();
  updateHUD();
}

// —— 主更新 ——
function update(dt){
  State.time += dt;
  State.shake = Math.max(0, State.shake - dt * 12);
  State.flash = Math.max(0, State.flash - dt * 3);
  State.msgT = Math.max(0, State.msgT - dt);

  if (State.mode === 'title'){
    if (Input.confirm) startRun();
    return;
  }
  if (State.mode === 'gameover'){
    if (Input.confirm) restartGalaxy();
    return;
  }
  if (State.mode === 'victory'){
    if (Input.confirm){ showScreen('title'); State.mode = 'title'; }
    return;
  }
  if (State.mode === 'galaxycomplete'){
    State.warpT -= dt;
    if (State.warpT <= 0){
      if (Galaxy.galaxyIndex + 1 >= CONFIG.galaxies.length){
        State.mode = 'victory';
        AudioFX.sfx('win');
        document.getElementById('winInfo').textContent = `你穿越了 ${CONFIG.galaxies.length} 个星系，抵达宇宙的尽头。`;
        showScreen('victory');
      } else {
        Galaxy.start(Galaxy.galaxyIndex + 1);
        showUpgrade();
      }
    }
    return;
  }
  if (State.mode === 'paused') return;
  if (State.mode === 'upgrade'){
    if (Input.confirm) enterGalaxy();
    return;
  }

  // —— playing ——
  if (Input.pause){ State.mode = 'paused'; showScreen('pause'); return; }

  const p = State.player;
  State.prevTheta = p.theta;

  if (Input.toggleFly){
    if (p.flying) p.flying = false;
    else if (p.mp > 1){ p.flying = true; AudioFX.sfx('jump'); }
  }

  p.update(dt);
  p.tryAttack();          // 自动攻击
  if (p.dead){ gameOver(); return; }

  spawnEnemies(dt);
  spawnPickups(dt);

  for (const e of State.enemies) e.update(dt);
  for (const r of State.resources) r.update(dt);
  for (const eq of State.equipments) eq.update(dt);

  updateProjectiles(dt);
  if (State.boss){
    State.boss.update(dt);
    updateBossBullets(dt);
    if (State.boss.dead){ galaxyComplete(); return; }
  }

  collectResources();
  depositAtStar();
  collectEquipment();
  enemyContact();

  for (const part of State.particles) part.update(dt);
  for (const t of State.texts) t.update(dt);

  State.enemies = State.enemies.filter(e => !e.dead);
  State.projectiles = State.projectiles.filter(pr => pr.life > 0);
  State.ebullets = State.ebullets.filter(b => b.life > 0);
  State.particles = State.particles.filter(part => part.life > 0);
  State.texts = State.texts.filter(t => t.life > 0);
}

// —— 流程 ——
function startRun(){
  Galaxy.start(0);
  AudioFX.init();
  showUpgrade();
}

function restartGalaxy(){
  Galaxy.start(Galaxy.galaxyIndex);
  setupGalaxy();
  State.mode = 'playing';
  showScreen(null);
}

function showUpgrade(){
  State.mode = 'upgrade';
  renderUpgradeScreen();
  showScreen('upgrade');
}

function enterGalaxy(){
  setupGalaxy();
  State.mode = 'playing';
  showScreen(null);
}

function buyUpgrade(id){
  const cost = Meta.cost(id);
  if (Meta.resources >= cost){
    Meta.resources -= cost;
    Meta.levels[id]++;
    AudioFX.sfx('pickup');
    renderUpgradeScreen();
  }
}

function upgEffectText(id, level){
  const u = CONFIG.upgrades[id];
  if (id === 'equip') return `伤害 +${Math.round(level * u.add * 100)}%`;
  return `+${level * u.add}`;
}

function renderUpgradeScreen(){
  document.getElementById('upgResource').textContent = `可用资源：${Meta.resources}`;
  document.getElementById('upgTitle').textContent = `准备进入第 ${Galaxy.galaxyIndex + 1} 星系 · ${Galaxy.diff.name}`;
  for (const id of Object.keys(CONFIG.upgrades)){
    const lvl = Meta.levels[id];
    const cost = Meta.cost(id);
    const info = document.getElementById('upgInfo-' + id);
    info.textContent = `Lv.${lvl} · ${upgEffectText(id, lvl)}`;
    const btn = document.getElementById('upgBtn-' + id);
    btn.textContent = `升级 ${cost}`;
    const afford = Meta.resources >= cost;
    btn.disabled = !afford;
    btn.classList.toggle('disabled', !afford);
  }
}

function setupGalaxy(){
  State.player = new Player();
  State.enemies = [];
  State.resources = [];
  State.equipments = [];
  State.projectiles = [];
  State.ebullets = [];
  State.particles = [];
  State.texts = [];
  State.boss = null;
  State.resourcesBanked = 0;
  State.prevTheta = 0;
  enemyTimer = resTimer = eqTimer = 0;

  for (let i = 0; i < CONFIG.resource.count; i++) State.resources.push(Galaxy.spawnResource());
  State.equipments.push(Galaxy.spawnEquipment());
  for (let i = 0; i < 2; i++) State.enemies.push(Galaxy.spawnEnemy());

  const d = Galaxy.diff;
  State.toast(`${d.name} · 收集 ${d.goal} 资源唤醒恒星守护者`, 2.6);
}

function gameOver(){
  State.mode = 'gameover';
  AudioFX.sfx('lose');
  document.getElementById('goInfo').textContent = `你在「${Galaxy.diff.name}」陨落。装备已丢失，重试本星系。`;
  showScreen('gameover');
}

function galaxyComplete(){
  State.mode = 'galaxycomplete';
  State.warpT = 2.6;
  AudioFX.sfx('warp');
  State.spawnParticles(State.boss.x, State.boss.y, '#ff5470', 30, 140, 1.0);
  State.boss = null;
  State.enemies = [];
  State.projectiles = [];
  State.ebullets = [];
  const next = Galaxy.galaxyIndex + 1;
  document.getElementById('gcInfo').textContent = next >= CONFIG.galaxies.length
    ? '所有星系已通关！'
    : `已征服「${Galaxy.diff.name}」，即将前往「${CONFIG.galaxies[next].name}」`;
  showScreen('galaxycomplete');
}

// —— 生成 ——
function spawnEnemies(dt){
  enemyTimer -= dt;
  if (State.enemies.length < Galaxy.diff.enemyMax && enemyTimer <= 0){
    State.enemies.push(Galaxy.spawnEnemy());
    enemyTimer = CONFIG.enemy.spawnInterval;
  }
}

function spawnPickups(dt){
  resTimer -= dt; eqTimer -= dt;
  if (State.resources.length < 14 && resTimer <= 0){
    State.resources.push(Galaxy.spawnResource());
    resTimer = 0.5;
  }
  if (State.equipments.length < 2 && eqTimer <= 0){
    State.equipments.push(Galaxy.spawnEquipment());
    eqTimer = 6;
  }
}

// —— 战斗 ——
function updateProjectiles(dt){
  for (const proj of State.projectiles){
    proj.update(dt);
    for (const e of State.enemies){
      if (e.dead || proj.hit.has(e)) continue;
      if (Util.dist(proj.x, proj.y, e.x, e.y) < proj.radius + e.radius){
        e.takeDamage(proj.damage);
        proj.hit.add(e);
        if (e.dead) enemyDie(e);
        if (!proj.pierce){ proj.life = 0; break; }
      }
    }
    if (proj.life <= 0) continue;
    if (State.boss && !State.boss.dead){
      if (Util.dist(proj.x, proj.y, State.boss.x, State.boss.y) < proj.radius + State.boss.radius){
        State.boss.takeDamage(proj.damage);
        if (!proj.pierce) proj.life = 0;
      }
    }
  }
  State.projectiles = State.projectiles.filter(pr => pr.life > 0);
}

function updateBossBullets(dt){
  const p = State.player;
  for (const b of State.ebullets){
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    if (p.invuln <= 0 && !p.dead && Util.dist(p.x, p.y, b.x, b.y) < p.radius + b.r){
      p.damage(CONFIG.boss.bulletDamage, b.x, b.y);
      b.life = 0;
    }
  }
  State.ebullets = State.ebullets.filter(b => b.life > 0);
}

function enemyDie(e){
  State.spawnParticles(e.x, e.y, '#ff5470', 10, 80, 0.5);
  AudioFX.sfx('enemyDie');
  if (Math.random() < Galaxy.diff.enemyDrop){
    if (Math.random() < 0.5){
      State.player.hp = Math.min(State.player.maxHp, State.player.hp + 15);
      State.texts.push(new FloatText(e.x, e.y, '+HP', '#4aff7a'));
    } else {
      State.player.mp = Math.min(State.player.maxMp, State.player.mp + 20);
      State.texts.push(new FloatText(e.x, e.y, '+MP', '#4a9dff'));
    }
    AudioFX.sfx('collect');
  }
}

function enemyContact(){
  const p = State.player;
  if (p.invuln > 0 || p.dead) return;
  for (const e of State.enemies){
    if (Util.dist(p.x, p.y, e.x, e.y) < p.radius + e.radius){
      p.damage(CONFIG.enemy.contactDamage, e.x, e.y);
      break;
    }
  }
  if (State.boss && !State.boss.dead && p.invuln <= 0 && !p.dead){
    if (Util.dist(p.x, p.y, State.boss.x, State.boss.y) < p.radius + State.boss.radius){
      p.damage(CONFIG.boss.bulletDamage, State.boss.x, State.boss.y);
    }
  }
}

// —— 收集 / 上缴 ——
function bankResources(n){
  State.resourcesBanked += n;
  Meta.resources += n;
  if (State.resourcesBanked >= Galaxy.diff.goal && !State.boss) triggerBoss();
}

function collectResources(){
  const p = State.player;
  const pr = p.pickupRadius();
  for (const r of State.resources){
    if (r.taken) continue;
    if (Util.dist(p.x, p.y, r.x, r.y) < pr + r.r){
      r.taken = true;
      State.spawnParticles(r.x, r.y, CONFIG.colors.resource, 6, 60, 0.4);
      if (p.carried < CONFIG.player.carryCap){
        p.carried++;
        AudioFX.sfx('collect');
      } else {
        bankResources(1);
        State.texts.push(new FloatText(r.x, r.y, '+1', CONFIG.colors.resource));
      }
    }
  }
  State.resources = State.resources.filter(r => !r.taken);
}

function depositAtStar(){
  const p = State.player;
  const crossed = State.prevTheta - p.theta > Math.PI;   // 顺时针越过 θ=0
  if (crossed && p.carried > 0){
    const n = p.carried;
    bankResources(n);
    p.carried = 0;
    State.toast(`+${n} 资源已送达恒星`);
    AudioFX.sfx('deposit');
    const sp = Galaxy.starPos();
    State.spawnParticles(sp.x, sp.y, CONFIG.colors.resource, 14, 80, 0.7);
  }
}

function triggerBoss(){
  State.boss = new Boss();
  State.boss.activate();
  State.toast('资源已足够！恒星守护者出现！', 2.4);
  AudioFX.sfx('warp');
}

function collectEquipment(){
  const p = State.player;
  for (const eq of State.equipments){
    if (eq.taken) continue;
    if (Util.dist(p.x, p.y, eq.x, eq.y) < p.pickupRadius() + eq.r){
      eq.taken = true;
      applyEquipment(eq);
      AudioFX.sfx('pickup');
      State.spawnParticles(eq.x, eq.y, CONFIG.colors.equip, 10, 70, 0.5);
    }
  }
  State.equipments = State.equipments.filter(e => !e.taken);
}

function applyEquipment(eq){
  const p = State.player;
  if (eq.kind === 'weapon'){
    p.weapon = eq.id;
    State.toast(`获得武器：${CONFIG.weapons[eq.id].name}`);
  } else {
    if (p.passives.includes(eq.id)){
      State.toast(`被动已拥有：${CONFIG.passives[eq.id].name}`);
    } else if (p.passives.length < 2){
      p.passives.push(eq.id);
      State.toast(`获得被动：${CONFIG.passives[eq.id].name}`);
    } else {
      p.passives.shift();
      p.passives.push(eq.id);
      State.toast(`替换被动：${CONFIG.passives[eq.id].name}`);
    }
  }
}

// —— UI ——
function setupUI(){
  document.getElementById('startBtn').addEventListener('click', () => { AudioFX.init(); startRun(); });
  document.getElementById('retryBtn').addEventListener('click', restartGalaxy);
  document.getElementById('againBtn').addEventListener('click', () => { showScreen('title'); State.mode = 'title'; });
  buildUpgradeUI();
}

function buildUpgradeUI(){
  const list = document.getElementById('upgList');
  list.innerHTML = '';
  for (const id of Object.keys(CONFIG.upgrades)){
    const u = CONFIG.upgrades[id];
    const row = document.createElement('div');
    row.className = 'upg';
    row.innerHTML =
      `<span class="upg-name">${u.icon} ${u.name}</span>` +
      `<span class="upg-info" id="upgInfo-${id}"></span>` +
      `<button class="upg-btn" id="upgBtn-${id}"></button>`;
    list.appendChild(row);
    document.getElementById('upgBtn-' + id).addEventListener('click', (e) => { buyUpgrade(id); e.currentTarget.blur(); });
  }
  document.getElementById('departBtn').addEventListener('click', enterGalaxy);
}

function showScreen(name){
  const overlay = document.getElementById('overlay');
  const hud = document.getElementById('hud');
  const screens = ['title', 'pause', 'gameover', 'galaxycomplete', 'victory', 'upgrade'];
  if (!name){
    overlay.classList.add('hidden');
    hud.classList.remove('hidden');
  } else {
    overlay.classList.remove('hidden');
    if (name === 'title' || name === 'gameover' || name === 'victory' || name === 'upgrade') hud.classList.add('hidden');
    else hud.classList.remove('hidden');
    screens.forEach(s => document.getElementById(s).classList.toggle('hidden', s !== name));
  }
}

function showBossBar(show){ document.getElementById('bossbar').classList.toggle('hidden', !show); }

function updateHUD(){
  const p = State.player;
  if (p){
    document.getElementById('hpfill').style.width = (p.hp / p.maxHp * 100) + '%';
    document.getElementById('mpfill').style.width = (p.mp / p.maxMp * 100) + '%';
    document.getElementById('hplbl').textContent = Math.ceil(p.hp);
    document.getElementById('mplbl').textContent = Math.ceil(p.mp);
    const sb = document.getElementById('shieldbar');
    if (p.maxShield > 0){
      sb.classList.remove('hidden');
      document.getElementById('shieldfill').style.width = (p.shield / p.maxShield * 100) + '%';
      document.getElementById('shieldlbl').textContent = Math.ceil(p.shield);
    } else {
      sb.classList.add('hidden');
    }
  }
  document.getElementById('galaxyNum').textContent = Galaxy.galaxyIndex + 1;

  const goal = Galaxy.diff ? Galaxy.diff.goal : 0;
  document.getElementById('resfill').style.width = (goal > 0 ? Math.min(100, State.resourcesBanked / goal * 100) : 0) + '%';
  let resTxt = `资源 ${State.resourcesBanked}/${goal}`;
  if (p && p.carried > 0) resTxt += ` · 携带 ${p.carried}`;
  document.getElementById('resText').textContent = resTxt;

  const ws = document.getElementById('weaponSlot');
  if (p && p.weapon){
    const w = CONFIG.weapons[p.weapon];
    ws.textContent = w.icon + ' ' + w.name;
    ws.title = '武器：' + w.name;
    ws.classList.add('weapon');
  }
  const p0 = document.getElementById('passive0');
  const p1 = document.getElementById('passive1');
  p0.textContent = p && p.passives[0] ? CONFIG.passives[p.passives[0]].icon + ' ' + CONFIG.passives[p.passives[0]].name : '';
  p1.textContent = p && p.passives[1] ? CONFIG.passives[p.passives[1]].icon + ' ' + CONFIG.passives[p.passives[1]].name : '';

  if (State.boss){
    showBossBar(true);
    document.getElementById('bossfill').style.width = (State.boss.hp / State.boss.maxHp * 100) + '%';
  } else {
    showBossBar(false);
  }

  const toast = document.getElementById('toast');
  if (State.msgT > 0){ toast.textContent = State.msg; toast.style.opacity = 1; }
  else { toast.style.opacity = 0; }
}

boot();
