// 程序化 WebAudio 音效
const AudioFX = {
  ctx: null,
  muted: false,

  init(){
    if (this.ctx) return;
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}
  },

  toggle(){
    this.muted = !this.muted;
    this.init();
  },

  play(freq, dur = 0.12, type = 'square', vol = 0.15, slide = 0){
    if (this.muted) return;
    if (!this.ctx) this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.ctx.destination);
    o.start(t); o.stop(t + dur);
  },

  sfx(name){
    switch (name){
      case 'shoot':    this.play(620, 0.08, 'square',   0.08, -220); break;
      case 'hit':      this.play(140, 0.18, 'sawtooth', 0.14, -60);  break;
      case 'enemyDie': this.play(90,  0.22, 'square',   0.16, -40);  break;
      case 'collect':  this.play(880, 0.08, 'square',   0.10, 160);  break;
      case 'deposit':  this.play(520, 0.14, 'triangle', 0.14, 220);  break;
      case 'pickup':   this.play(660, 0.12, 'square',   0.12, 200);  break;
      case 'jump':     this.play(300, 0.10, 'square',   0.07, 120);  break;
      case 'bossHit':  this.play(200, 0.08, 'square',   0.10, -40);  break;
      case 'bossDie':  this.play(70,  0.70, 'sawtooth', 0.20, -30);  break;
      case 'warp':     this.play(440, 0.50, 'triangle', 0.14, 520);  break;
      case 'win':      this.play(523, 0.60, 'triangle', 0.16, 523);  break;
      case 'lose':     this.play(220, 0.50, 'sawtooth', 0.16, -160); break;
    }
  },
};
