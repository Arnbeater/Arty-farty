const canvas = document.getElementById('artboard');
const ctx = canvas.getContext('2d');

const controls = {
  particleCount: document.getElementById('particleCount'),
  warpAmount: document.getElementById('warpAmount'),
  glow: document.getElementById('glow'),
  shuffle: document.getElementById('shuffle')
};

const palettes = [
  ['#ff0075', '#00f5ff', '#f5ff00', '#8cff00'],
  ['#f72585', '#7209b7', '#3a0ca3', '#4cc9f0'],
  ['#f94144', '#f8961e', '#f9c74f', '#43aa8b'],
  ['#e63946', '#f1fa8c', '#a8dadc', '#457b9d'],
  ['#fb5607', '#ff006e', '#8338ec', '#3a86ff']
];

let activePalette = palettes[Math.floor(Math.random() * palettes.length)];
let particles = [];
let frame = 0;

function fitCanvas() {
  const ratio = window.devicePixelRatio || 1;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;

  canvas.width = width * ratio;
  canvas.height = height * ratio;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function createParticles() {
  const count = Number(controls.particleCount.value);
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;

  particles = Array.from({ length: count }, (_, index) => ({
    x: Math.random() * width,
    y: Math.random() * height,
    baseX: Math.random() * width,
    baseY: Math.random() * height,
    speed: 0.002 + Math.random() * 0.008,
    spread: 10 + Math.random() * 35,
    size: 1 + Math.random() * 3,
    color: activePalette[index % activePalette.length]
  }));
}

function draw() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const warp = Number(controls.warpAmount.value);
  const glow = Number(controls.glow.value);

  ctx.fillStyle = 'rgba(7, 6, 15, 0.22)';
  ctx.fillRect(0, 0, width, height);

  particles.forEach((p, i) => {
    const angle = frame * p.speed + i * 0.02;
    const spiral = Math.sin(frame * 0.003 + i) * warp;
    p.x = p.baseX + Math.cos(angle * 2.1) * (p.spread + spiral);
    p.y = p.baseY + Math.sin(angle * 1.4) * (p.spread + spiral);

    if (p.x < -60 || p.x > width + 60 || p.y < -60 || p.y > height + 60) {
      p.baseX = Math.random() * width;
      p.baseY = Math.random() * height;
    }

    ctx.shadowBlur = glow;
    ctx.shadowColor = p.color;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.shadowBlur = 0;
  frame += 1;
  requestAnimationFrame(draw);
}

controls.shuffle.addEventListener('click', () => {
  activePalette = palettes[Math.floor(Math.random() * palettes.length)];
  createParticles();
  ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
});

controls.particleCount.addEventListener('input', createParticles);
window.addEventListener('resize', () => {
  fitCanvas();
  createParticles();
});

fitCanvas();
createParticles();
ctx.fillStyle = '#07060f';
ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
draw();
