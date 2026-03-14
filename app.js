const canvas = document.getElementById('artboard');
const ctx = canvas.getContext('2d');

const controls = {
  particleCount: document.getElementById('particleCount'),
  warpAmount: document.getElementById('warpAmount'),
  glow: document.getElementById('glow'),
  shuffle: document.getElementById('shuffle'),
  imageInput: document.getElementById('imageInput'),
  asciiWidth: document.getElementById('asciiWidth'),
  convertAscii: document.getElementById('convertAscii'),
  copyAscii: document.getElementById('copyAscii'),
  asciiOutput: document.getElementById('asciiOutput'),
  asciiStatus: document.getElementById('asciiStatus')
};

const palettes = [
  ['#ff0075', '#00f5ff', '#f5ff00', '#8cff00'],
  ['#f72585', '#7209b7', '#3a0ca3', '#4cc9f0'],
  ['#f94144', '#f8961e', '#f9c74f', '#43aa8b'],
  ['#e63946', '#f1fa8c', '#a8dadc', '#457b9d'],
  ['#fb5607', '#ff006e', '#8338ec', '#3a86ff']
];

const densityRamp = ' .,:;i1tfLCG08@';

let activePalette = palettes[Math.floor(Math.random() * palettes.length)];
let particles = [];
let frame = 0;
let loadedImage = null;

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

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Unable to load image.'));
    };

    img.src = objectUrl;
  });
}

function imageToAscii(image, targetWidth) {
  const sampleWidth = Math.max(20, targetWidth);
  const scale = image.height / image.width;
  const sampleHeight = Math.max(20, Math.floor(sampleWidth * scale * 0.52));
  const buffer = document.createElement('canvas');
  const bufferCtx = buffer.getContext('2d', { willReadFrequently: true });

  buffer.width = sampleWidth;
  buffer.height = sampleHeight;
  bufferCtx.drawImage(image, 0, 0, sampleWidth, sampleHeight);

  const imageData = bufferCtx.getImageData(0, 0, sampleWidth, sampleHeight);
  let asciiText = '';

  for (let y = 0; y < sampleHeight; y += 1) {
    for (let x = 0; x < sampleWidth; x += 1) {
      const offset = (y * sampleWidth + x) * 4;
      const r = imageData.data[offset];
      const g = imageData.data[offset + 1];
      const b = imageData.data[offset + 2];
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      const index = Math.min(
        densityRamp.length - 1,
        Math.floor((1 - luminance) * densityRamp.length)
      );
      asciiText += densityRamp[index];
    }
    asciiText += '\n';
  }

  return asciiText;
}

controls.imageInput.addEventListener('change', async () => {
  const [file] = controls.imageInput.files;

  if (!file) {
    loadedImage = null;
    controls.asciiStatus.textContent = 'Upload an image, then click Convert to ASCII.';
    return;
  }

  controls.asciiStatus.textContent = `Loaded ${file.name}. Click Convert to ASCII.`;

  try {
    loadedImage = await loadImageFromFile(file);
  } catch (error) {
    loadedImage = null;
    controls.asciiStatus.textContent = error.message;
  }
});

controls.convertAscii.addEventListener('click', () => {
  if (!loadedImage) {
    controls.asciiStatus.textContent = 'Choose an image file first.';
    return;
  }

  const detail = Number(controls.asciiWidth.value);
  const ascii = imageToAscii(loadedImage, detail);
  controls.asciiOutput.textContent = ascii;
  controls.asciiStatus.textContent = `ASCII generated at width ${detail} characters.`;
});

controls.copyAscii.addEventListener('click', async () => {
  const text = controls.asciiOutput.textContent;

  if (!text) {
    controls.asciiStatus.textContent = 'Nothing to copy yet. Convert an image first.';
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    controls.asciiStatus.textContent = 'ASCII copied to clipboard.';
  } catch {
    controls.asciiStatus.textContent = 'Clipboard copy failed. Select and copy manually.';
  }
});

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
