const canvas = document.getElementById('artboard');
const ctx = canvas.getContext('2d');

const controls = {
  mode: document.getElementById('mode'),
  ditherControls: document.getElementById('ditherControls'),
  animationControls: document.getElementById('animationControls'),
  imageInput: document.getElementById('imageInput'),
  algorithm: document.getElementById('algorithm'),
  bitmapWidth: document.getElementById('bitmapWidth'),
  contrast: document.getElementById('contrast'),
  brightness: document.getElementById('brightness'),
  threshold: document.getElementById('threshold'),
  noise: document.getElementById('noise'),
  invertTone: document.getElementById('invertTone'),
  inkColor: document.getElementById('inkColor'),
  paperColor: document.getElementById('paperColor'),
  render: document.getElementById('render'),
  downloadPng: document.getElementById('downloadPng'),
  particleCount: document.getElementById('particleCount'),
  speed: document.getElementById('speed'),
  warp: document.getElementById('warp'),
  trail: document.getElementById('trail'),
  glow: document.getElementById('glow'),
  shufflePalette: document.getElementById('shufflePalette'),
  toggleAnimation: document.getElementById('toggleAnimation'),
  status: document.getElementById('status')
};

const bayer4x4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5]
];

const animationState = {
  particles: [],
  running: true,
  rafId: 0,
  tick: 0,
  palette: ['#c678ff', '#44e8ff', '#ffe66b', '#ff5db1']
};

let loadedImage = null;
let outputFilename = 'arty-farty';
let latestBitmapCanvas = null;

function fitCanvas() {
  const ratio = window.devicePixelRatio || 1;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;

  canvas.width = width * ratio;
  canvas.height = height * ratio;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function hexToRgb(hex) {
  const normalized = hex.replace('#', '');
  const int = Number.parseInt(normalized, 16);

  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255
  };
}

function randomHexColor() {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue} 96% 66%)`;
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Unable to load image.'));
    };

    image.src = objectUrl;
  });
}

function preprocessLuminance(imageData, contrast, brightness, noiseAmount, invertTone) {
  const values = new Float32Array(imageData.width * imageData.height);

  for (let i = 0; i < values.length; i += 1) {
    const offset = i * 4;
    const r = imageData.data[offset];
    const g = imageData.data[offset + 1];
    const b = imageData.data[offset + 2];
    let lum = 0.299 * r + 0.587 * g + 0.114 * b;

    lum = (lum - 128) * contrast + 128 + brightness;

    if (invertTone) {
      lum = 255 - lum;
    }

    if (noiseAmount > 0) {
      lum += (Math.random() * 2 - 1) * noiseAmount;
    }

    values[i] = clamp(lum, 0, 255);
  }

  return values;
}

function ditherThreshold(values, width, threshold) {
  const out = new Uint8Array(width * (values.length / width));

  for (let i = 0; i < out.length; i += 1) {
    out[i] = values[i] <= threshold ? 1 : 0;
  }

  return out;
}

function ditherOrdered(values, width, height, threshold) {
  const out = new Uint8Array(width * height);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = y * width + x;
      const matrixValue = bayer4x4[y % 4][x % 4];
      const localThreshold = threshold + (matrixValue - 7.5) * 8;
      out[i] = values[i] <= localThreshold ? 1 : 0;
    }
  }

  return out;
}

function ditherFloydSteinberg(values, width, height, threshold) {
  const working = Float32Array.from(values);
  const out = new Uint8Array(width * height);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = y * width + x;
      const oldPixel = working[i];
      const newPixel = oldPixel <= threshold ? 0 : 255;
      out[i] = newPixel === 0 ? 1 : 0;
      const error = oldPixel - newPixel;

      if (x + 1 < width) working[i + 1] += error * (7 / 16);
      if (x - 1 >= 0 && y + 1 < height) working[i + width - 1] += error * (3 / 16);
      if (y + 1 < height) working[i + width] += error * (5 / 16);
      if (x + 1 < width && y + 1 < height) working[i + width + 1] += error * (1 / 16);
    }
  }

  return out;
}

function buildBitmapData(binaryPixels, width, height, ink, paper) {
  const image = new ImageData(width, height);

  for (let i = 0; i < binaryPixels.length; i += 1) {
    const color = binaryPixels[i] === 1 ? ink : paper;
    const offset = i * 4;
    image.data[offset] = color.r;
    image.data[offset + 1] = color.g;
    image.data[offset + 2] = color.b;
    image.data[offset + 3] = 255;
  }

  return image;
}

function drawBitmapToMainCanvas(bitmapCanvas) {
  const viewWidth = canvas.clientWidth;
  const viewHeight = canvas.clientHeight;

  ctx.fillStyle = '#090613';
  ctx.fillRect(0, 0, viewWidth, viewHeight);

  const scale = Math.min(viewWidth / bitmapCanvas.width, viewHeight / bitmapCanvas.height);
  const drawWidth = Math.max(1, Math.floor(bitmapCanvas.width * scale));
  const drawHeight = Math.max(1, Math.floor(bitmapCanvas.height * scale));
  const offsetX = Math.floor((viewWidth - drawWidth) / 2);
  const offsetY = Math.floor((viewHeight - drawHeight) / 2);

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(bitmapCanvas, offsetX, offsetY, drawWidth, drawHeight);
}

function renderDitheredBitmap() {
  if (!loadedImage) {
    controls.status.textContent = 'Choose an image first.';
    return;
  }

  const targetWidth = Number(controls.bitmapWidth.value);
  const aspect = loadedImage.height / loadedImage.width;
  const targetHeight = Math.max(1, Math.round(targetWidth * aspect));
  const workCanvas = document.createElement('canvas');
  const workCtx = workCanvas.getContext('2d', { willReadFrequently: true });
  workCanvas.width = targetWidth;
  workCanvas.height = targetHeight;
  workCtx.drawImage(loadedImage, 0, 0, targetWidth, targetHeight);

  const source = workCtx.getImageData(0, 0, targetWidth, targetHeight);
  const contrast = Number(controls.contrast.value);
  const brightness = Number(controls.brightness.value);
  const threshold = Number(controls.threshold.value);
  const noise = Number(controls.noise.value);
  const invertTone = controls.invertTone.checked;
  const algorithm = controls.algorithm.value;

  const luminance = preprocessLuminance(source, contrast, brightness, noise, invertTone);
  let binary;
  if (algorithm === 'ordered') {
    binary = ditherOrdered(luminance, targetWidth, targetHeight, threshold);
  } else if (algorithm === 'threshold') {
    binary = ditherThreshold(luminance, targetWidth, threshold);
  } else {
    binary = ditherFloydSteinberg(luminance, targetWidth, targetHeight, threshold);
  }

  const ink = hexToRgb(controls.inkColor.value);
  const paper = hexToRgb(controls.paperColor.value);
  const bitmapData = buildBitmapData(binary, targetWidth, targetHeight, ink, paper);

  latestBitmapCanvas = document.createElement('canvas');
  latestBitmapCanvas.width = targetWidth;
  latestBitmapCanvas.height = targetHeight;
  latestBitmapCanvas.getContext('2d').putImageData(bitmapData, 0, 0);

  drawBitmapToMainCanvas(latestBitmapCanvas);
  controls.status.textContent = `Rendered ${algorithm} dithering • ${targetWidth}×${targetHeight}px${invertTone ? ' • inverted tones' : ''}.`;
}

function createParticles() {
  const count = Number(controls.particleCount.value);
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  animationState.particles = Array.from({ length: count }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() * 2 - 1) * 0.9,
    vy: (Math.random() * 2 - 1) * 0.9,
    size: 1 + Math.random() * 3,
    hueOffset: Math.random() * animationState.palette.length
  }));
}

function drawAnimationFrame() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const speed = Number(controls.speed.value);
  const warp = Number(controls.warp.value);
  const trail = Number(controls.trail.value);
  const glow = Number(controls.glow.value);

  ctx.fillStyle = `rgba(9, 6, 19, ${trail})`;
  ctx.fillRect(0, 0, width, height);

  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < animationState.particles.length; i += 1) {
    const particle = animationState.particles[i];
    const angle = animationState.tick * 0.008 + (particle.x + particle.y) * 0.003;
    particle.vx += Math.cos(angle) * 0.01 * warp;
    particle.vy += Math.sin(angle + 1.2) * 0.01 * warp;

    particle.vx *= 0.985;
    particle.vy *= 0.985;
    particle.x += particle.vx * speed;
    particle.y += particle.vy * speed;

    if (particle.x < -10) particle.x = width + 10;
    if (particle.x > width + 10) particle.x = -10;
    if (particle.y < -10) particle.y = height + 10;
    if (particle.y > height + 10) particle.y = -10;

    const paletteIndex = Math.floor((i + animationState.tick * 0.03 + particle.hueOffset) % animationState.palette.length);
    const color = animationState.palette[paletteIndex];

    ctx.shadowBlur = glow;
    ctx.shadowColor = color;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalCompositeOperation = 'source-over';
  ctx.shadowBlur = 0;
  animationState.tick += 1;
}

function animate() {
  if (controls.mode.value === 'animation' && animationState.running) {
    drawAnimationFrame();
  }

  animationState.rafId = requestAnimationFrame(animate);
}

function setMode(mode) {
  const isDither = mode === 'dither';
  controls.ditherControls.classList.toggle('hidden', !isDither);
  controls.animationControls.classList.toggle('hidden', isDither);

  if (isDither) {
    if (latestBitmapCanvas) {
      drawBitmapToMainCanvas(latestBitmapCanvas);
      controls.status.textContent = 'Dithering mode active.';
    } else {
      ctx.fillStyle = '#090613';
      ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
      controls.status.textContent = 'Dithering mode active. Upload an image to begin.';
    }
  } else {
    createParticles();
    animationState.running = true;
    controls.toggleAnimation.textContent = 'Pause Animation';
    controls.status.textContent = 'Animation mode active. Tweak controls for different motion.';
    ctx.fillStyle = '#090613';
    ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
  }
}

controls.imageInput.addEventListener('change', async () => {
  const [file] = controls.imageInput.files;

  if (!file) {
    loadedImage = null;
    controls.status.textContent = 'No image selected.';
    return;
  }

  outputFilename = file.name.replace(/\.[^/.]+$/, '') || 'dithered-bitmap';

  try {
    loadedImage = await loadImage(file);
    controls.status.textContent = `Loaded image: ${file.name}. Click render.`;
  } catch (error) {
    loadedImage = null;
    controls.status.textContent = error.message;
  }
});

controls.mode.addEventListener('change', () => {
  setMode(controls.mode.value);
});

controls.render.addEventListener('click', () => {
  if (controls.mode.value === 'dither') {
    renderDitheredBitmap();
  }
});

[
  controls.algorithm,
  controls.bitmapWidth,
  controls.contrast,
  controls.brightness,
  controls.threshold,
  controls.noise,
  controls.invertTone,
  controls.inkColor,
  controls.paperColor
].forEach((control) => {
  control.addEventListener('input', () => {
    if (controls.mode.value === 'dither' && loadedImage) {
      renderDitheredBitmap();
    }
  });
});

[
  controls.particleCount,
  controls.speed,
  controls.warp,
  controls.trail,
  controls.glow
].forEach((control) => {
  control.addEventListener('input', () => {
    if (controls.mode.value === 'animation' && control === controls.particleCount) {
      createParticles();
    }
  });
});

controls.shufflePalette.addEventListener('click', () => {
  animationState.palette = Array.from({ length: 4 }, () => randomHexColor());
  controls.status.textContent = 'Animation palette shuffled.';
});

controls.toggleAnimation.addEventListener('click', () => {
  animationState.running = !animationState.running;
  controls.toggleAnimation.textContent = animationState.running ? 'Pause Animation' : 'Resume Animation';
  controls.status.textContent = animationState.running ? 'Animation resumed.' : 'Animation paused.';
});

controls.downloadPng.addEventListener('click', () => {
  const link = document.createElement('a');
  link.href = canvas.toDataURL('image/png');
  link.download = `${outputFilename}-${controls.mode.value}.png`;
  link.click();
});

window.addEventListener('resize', () => {
  fitCanvas();

  if (controls.mode.value === 'dither' && latestBitmapCanvas) {
    drawBitmapToMainCanvas(latestBitmapCanvas);
  }
});

fitCanvas();
controls.inkColor.value = '#111111';
controls.paperColor.value = '#f4f1e8';
controls.invertTone.checked = false;
setMode(controls.mode.value);
animate();
