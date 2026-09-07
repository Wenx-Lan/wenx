// 星系：行星/地形生成、刷怪、难度缩放
const Galaxy = {
  galaxyIndex: 0,
  diff: null,
  planetR: 74,
  hue: 195,
  seed: 0,
  terrainParams: null,
  starD: 0,

  start(index){
    this.galaxyIndex = index;
    this.diff = CONFIG.galaxies[index];
    this.planetR = this.diff.planetR;
    this.hue = this.diff.hue;
    this.seed = 1000 + index * 137;
    const rng = Util.mulberry32(this.seed);
    this.terrainParams = {
      p1: rng() * Math.PI * 2, p2: rng() * Math.PI * 2, p3: rng() * Math.PI * 2,
      f1: 2, f2: 3, f3: 5,
      a1: 0.5, a2: 0.3, a3: 0.2,
    };
    this.starD = this.planetR + 26;
  },

  terrain(theta){
    const tp = this.terrainParams;
    const amp = this.diff.terrainAmp;
    return amp * (
      tp.a1 * Math.sin(tp.f1 * theta + tp.p1) +
      tp.a2 * Math.sin(tp.f2 * theta + tp.p2) +
      tp.a3 * Math.sin(tp.f3 * theta + tp.p3)
    );
  },

  surfaceR(theta){ return this.planetR + this.terrain(theta); },
  starPos(){ return Util.polar(0, this.starD); },

  spawnResource(){
    const theta = Math.random() * Math.PI * 2;
    const d = this.surfaceR(theta) + Util.rand(CONFIG.resource.minD, CONFIG.resource.maxD);
    return new Resource(theta, d);
  },

  spawnEquipment(){
    const theta = Math.random() * Math.PI * 2;
    const d = this.surfaceR(theta) + Util.rand(10, 26);
    let kind, id;
    if (Math.random() < 0.5){
      kind = 'weapon'; id = Util.pick(Object.keys(CONFIG.weapons));
    } else {
      kind = 'passive'; id = Util.pick(Object.keys(CONFIG.passives));
    }
    return new EquipmentPickup(kind, id, theta, d);
  },

  spawnEnemy(){
    for (let tries = 0; tries < 12; tries++){
      const theta = Math.random() * Math.PI * 2;
      const type = Math.random() < 0.5 ? 'crawler' : 'flyer';
      const d = type === 'crawler'
        ? this.surfaceR(theta) + CONFIG.enemy.crawlerRadius
        : this.planetR + Util.rand(12, 60);
      const e = new Enemy(type, theta, d);
      if (!State.player || Util.dist(e.x, e.y, State.player.x, State.player.y) > 90) return e;
    }
    return new Enemy('flyer', Math.random() * Math.PI * 2, this.planetR + 40);
  },
};
