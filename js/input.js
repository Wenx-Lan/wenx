// 键盘 / 鼠标输入
const Input = {
  keys: new Set(),     // 当前按住的键 (e.code)
  pressed: new Set(),  // 本帧刚按下的键
  mouseX: 0, mouseY: 0,
  mouseDown: false,

  left: false, right: false, up: false, down: false,
  attack: false, jump: false, toggleFly: false, pause: false, confirm: false,

  init(){
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space'].includes(e.code)) e.preventDefault();
      AudioFX.init();
      this.keys.add(e.code);
      this.pressed.add(e.code);
      if (e.code === 'KeyM') AudioFX.toggle();
    });
    window.addEventListener('keyup', (e) => { this.keys.delete(e.code); });
    window.addEventListener('blur', () => { this.keys.clear(); });

    const c = document.getElementById('game');
    const rect = () => c.getBoundingClientRect();
    c.addEventListener('mousemove', (e) => {
      const r = rect();
      this.mouseX = (e.clientX - r.left) / r.width * CONFIG.WIDTH;
      this.mouseY = (e.clientY - r.top) / r.height * CONFIG.HEIGHT;
    });
    c.addEventListener('mousedown', () => { AudioFX.init(); this.mouseDown = true; });
    window.addEventListener('mouseup', () => { this.mouseDown = false; });
  },

  // 每帧根据 keys/pressed 推导动作状态
  update(){
    this.left  = this.keys.has('ArrowLeft')  || this.keys.has('KeyA');
    this.right = this.keys.has('ArrowRight') || this.keys.has('KeyD');
    this.up    = this.keys.has('ArrowUp')    || this.keys.has('KeyW');
    this.down  = this.keys.has('ArrowDown')  || this.keys.has('KeyS');
    this.attack = this.keys.has('KeyJ') || this.keys.has('KeyZ') || this.mouseDown;
    this.jump = this.pressed.has('ArrowUp') || this.pressed.has('KeyW') || this.pressed.has('Space');
    this.toggleFly = this.pressed.has('ShiftLeft') || this.pressed.has('ShiftRight') || this.pressed.has('KeyF');
    this.pause = this.pressed.has('Escape') || this.pressed.has('KeyP');
    this.confirm = this.pressed.has('Enter') || this.pressed.has('Space');
  },

  endFrame(){ this.pressed.clear(); },
};
