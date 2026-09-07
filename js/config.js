// 全局配置：所有可调参数、武器、被动、6 个星系的难度缩放表
const CONFIG = {
  WIDTH: 512,
  HEIGHT: 288,
  CX: 256,
  CY: 144,

  player: {
    radius: 6,
    maxHp: 100,
    maxMp: 100,
    angAccel: 12,        // 角加速度 rad/s^2
    maxAngVel: 2.2,      // 最大角速度 rad/s
    angFriction: 16,     // 角减速度
    jumpVel: 150,        // 跳跃径向速度 px/s
    gravity: 320,        // 径向重力 px/s^2（指向行星中心）
    flyAccel: 280,       // 飞行径向加速度
    maxRadialVel: 105,   // 飞行最大径向速度
    maxFall: 180,        // 最大下落速度
    minAir: 8,           // 距行星核心最小距离（飞行下限）
    maxAir: 150,         // 距行星核心最大距离（飞行上限）
    flyDrain: 13,        // 飞行 MP 消耗 /s
    mpRegen: 4.5,        // MP 回复 /s
    invuln: 1.0,         // 受击无敌帧
    pickupRadius: 20,
    carryCap: 10,
    autoAttackRange: 240, // 自动攻击：目标进入此距离才开火
  },

  enemy: {
    crawlerRadius: 6,
    flyerRadius: 5,
    baseHp: 14,
    baseSpeed: 34,       // 飞行者最大速度 px/s
    crawlerAngSpeed: 0.9,// 爬行者角速度 rad/s
    contactDamage: 13,
    dropChance: 0.35,
    flyerAccel: 150,
    spawnInterval: 2.0,   // 敌人生成间隔秒数（越大生成越慢）
  },

  boss: {
    radius: 18,
    shootInterval: 2.1,
    spawnInterval: 3.6,
    bulletSpeed: 110,
    bulletRadius: 4,
    bulletDamage: 14,
  },

  weapons: {
    pulse:  { name:'脉冲', icon:'◉', damage:9,  mp:5, cooldown:0.42, shots:1, spread:0,    speed:360, pierce:false, homing:false, radius:3,   life:1.4 },
    scatter:{ name:'散射', icon:'✳', damage:6,  mp:8, cooldown:0.55, shots:3, spread:0.42, speed:340, pierce:false, homing:false, radius:3,   life:1.2 },
    rapid:  { name:'连射', icon:'⚡', damage:4,  mp:3, cooldown:0.16, shots:1, spread:0,    speed:400, pierce:false, homing:false, radius:2.5, life:1.1 },
    pierce: { name:'穿透', icon:'➤', damage:7,  mp:7, cooldown:0.5,  shots:1, spread:0,    speed:330, pierce:true,  homing:false, radius:3,   life:1.5 },
    homing: { name:'追踪', icon:'◎', damage:8,  mp:7, cooldown:0.4,  shots:1, spread:0,    speed:250, pierce:false, homing:true,  radius:3,   life:1.6 },
  },

  passives: {
    shield:  { name:'护盾', icon:'⬡', dmgMul:0.6 },
    speed:   { name:'疾行', icon:'≫', speedMul:1.28 },
    mpreg:   { name:'回蓝', icon:'✧', mpRegenMul:2.0 },
    hpregen: { name:'回血', icon:'✚', hpRegen:3.0 },
    magnet:  { name:'引力', icon:'❖', magnetMul:1.8 },
  },

  resource: {
    radius: 4,
    count: 20,
    minD: 8,     // 距地表额外高度
    maxD: 30,
  },

  // 星系间升级（消耗资源购买永久强化）
  upgrades: {
    maxHp:  { name:'生命上限', icon:'♥', base:4, growth:2, add:20,   },
    maxMp:  { name:'魔法上限', icon:'◆', base:4, growth:2, add:20,   },
    shield: { name:'护盾量',   icon:'⬡', base:5, growth:2, add:25,   },
    equip:  { name:'装备等级', icon:'⚔', base:6, growth:3, add:0.10, },
  },

  // 6 个星系：难度逐级递增
  galaxies: [
    { name:'晨曦星域', planetR:84, hue:195, goal:20, enemyMax:6,  enemySpeed:1.00, enemyHp:1.0, bossHp:120, terrainAmp:8,  enemyDrop:0.35, bossBullets:8  },
    { name:'翡翠星域', planetR:88, hue:125, goal:26, enemyMax:7,  enemySpeed:1.15, enemyHp:1.35,bossHp:180, terrainAmp:10, enemyDrop:0.33, bossBullets:10 },
    { name:'熔岩星域', planetR:86, hue:10,  goal:32, enemyMax:8,  enemySpeed:1.30, enemyHp:1.7, bossHp:260, terrainAmp:12, enemyDrop:0.31, bossBullets:12 },
    { name:'冰封星域', planetR:92, hue:205, goal:38, enemyMax:9,  enemySpeed:1.45, enemyHp:2.1, bossHp:360, terrainAmp:11, enemyDrop:0.30, bossBullets:14 },
    { name:'紫晶星域', planetR:90, hue:275, goal:45, enemyMax:10, enemySpeed:1.6,  enemyHp:2.6, bossHp:500, terrainAmp:13, enemyDrop:0.28, bossBullets:16 },
    { name:'深渊星域', planetR:96, hue:300, goal:52, enemyMax:11, enemySpeed:1.8,  enemyHp:3.2, bossHp:680, terrainAmp:14, enemyDrop:0.26, bossBullets:18 },
  ],

  colors: {
    bgTop: '#0c0f1c',
    bgBottom: '#05060a',
    player: '#fff6d8',
    playerGlow: '#ffd54a',
    enemy: '#10131c',
    enemyEdge: '#05060a',
    enemyGlow: '#3a1020',
    resource: '#ffd23f',
    resourceGlow: '#ffb020',
    equip: '#ff6ad5',
    projPlayer: '#ffffff',
    projEnemy: '#ff5470',
    star: '#fff3b0',
    starGlow: '#ffe066',
  },
};
