// 数学与随机工具
const Util = {
  clamp(v, a, b){ return v < a ? a : (v > b ? b : v); },
  lerp(a, b, t){ return a + (b - a) * t; },

  wrapAngle(a){
    const T = Math.PI * 2;
    a = a % T;
    return a < 0 ? a + T : a;
  },

  // 从 a 到 b 的最短有符号角差（弧度）
  angleDiff(a, b){
    let d = (b - a) % (Math.PI * 2);
    if (d > Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    return d;
  },

  rand(a = 1, b){
    if (b === undefined){ b = a; a = 0; }
    return a + Math.random() * (b - a);
  },
  randInt(a, b){ return Math.floor(this.rand(a, b + 1)); },
  pick(arr){ return arr[Math.floor(Math.random() * arr.length)]; },

  dist(ax, ay, bx, by){
    const dx = ax - bx, dy = ay - by;
    return Math.sqrt(dx * dx + dy * dy);
  },
  angleTo(ax, ay, bx, by){ return Math.atan2(by - ay, bx - ax); },

  // 极坐标转屏幕坐标：θ=0 为行星正上方，顺时针为正
  polar(theta, d){
    return { x: CONFIG.CX + Math.sin(theta) * d, y: CONFIG.CY - Math.cos(theta) * d };
  },

  // 可复现随机数生成器
  mulberry32(seed){
    let a = seed >>> 0;
    return function(){
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  },

  hexToRgba(hex, a){
    const h = hex.replace('#', '');
    const n = parseInt(h, 16);
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return `rgba(${r},${g},${b},${a})`;
  },
};
