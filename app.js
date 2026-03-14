const canvas = document.getElementById('artboard');
const ctx = canvas.getContext('2d');

const controls = {
  imageInput: document.getElementById('imageInput'),
  algorithm: document.getElementById('algorithm'),
  bitmapWidth: document.getElementById('bitmapWidth'),
  contrast: document.getElementById('contrast'),
  brightness: document.getElementById('brightness'),
  threshold: document.getElementById('threshold'),
  noise: document.getElementById('noise'),
  inkColor: document.getElementById('inkColor'),
  paperColor: document.getElementById('paperColor'),
  render: document.getElementById('render'),
  downloadPng: document.getElementById('downloadPng'),
  status: document.getElementById('status')
};

const bayer4x4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5]
];

let loadedImage = null;
let outputFilename = 'dithered-bitmap';

function fitCanvas() {
  const ratio = window.devicePixelRatio || 1;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;

  canvas.width = width * ratio;
  canvas.height = height * ratio;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
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

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
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

function preprocessLuminance(imageData, contrast, brightness, noiseAmount) {
  const values = new Float32Array(imageData.width * imageData.height);

  for (let i = 0; i < values.length; i += 1) {
    const offset = i * 4;
    const r = imageData.data[offset];
    const g = imageData.data[offset + 1];
    const b = imageData.data[offset + 2];
    let lum = 0.299 * r + 0.587 * g + 0.114 * b;

    lum = (lum - 128) * contrast + 128 + brightness;

    if (noiseAmount > 0) {
      lum += (Math.random() * 2 - 1) * noiseAmount;
    }

    values[i] = clamp(lum, 0, 255);
  }

  return values;
}

function ditherThreshold(values, width, height, threshold) {
  const out = new Uint8Array(width * height);

  for (let i = 0; i < out.length; i += 1) {
    out[i] = values[i] >= threshold ? 1 : 0;
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
      out[i] = values[i] >= localThreshold ? 1 : 0;
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
      const newPixel = oldPixel >= threshold ? 255 : 0;
      out[i] = newPixel === 255 ? 1 : 0;
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
    const on = binaryPixels[i] === 1;
    const c = on ? ink : paper;
    const offset = i * 4;

    image.data[offset] = c.r;
    image.data[offset + 1] = c.g;
    image.data[offset + 2] = c.b;
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
  const algorithm = controls.algorithm.value;

  const luminance = preprocessLuminance(source, contrast, brightness, noise);

  let binary;
  if (algorithm === 'ordered') {
    binary = ditherOrdered(luminance, targetWidth, targetHeight, threshold);
  } else if (algorithm === 'threshold') {
    binary = ditherThreshold(luminance, targetWidth, targetHeight, threshold);
  } else {
    binary = ditherFloydSteinberg(luminance, targetWidth, targetHeight, threshold);
  }

  const ink = hexToRgb(controls.inkColor.value);
  const paper = hexToRgb(controls.paperColor.value);
  const bitmapData = buildBitmapData(binary, targetWidth, targetHeight, ink, paper);

  const bitmapCanvas = document.createElement('canvas');
  bitmapCanvas.width = targetWidth;
  bitmapCanvas.height = targetHeight;
  bitmapCanvas.getContext('2d').putImageData(bitmapData, 0, 0);

  drawBitmapToMainCanvas(bitmapCanvas);
  controls.status.textContent = `Rendered ${algorithm} dithering • ${targetWidth}×${targetHeight}px.`;
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

controls.render.addEventListener('click', renderDitheredBitmap);

[
  controls.algorithm,
  controls.bitmapWidth,
  controls.contrast,
  controls.brightness,
  controls.threshold,
  controls.noise,
  controls.inkColor,
  controls.paperColor
].forEach((control) => {
  control.addEventListener('input', () => {
    if (loadedImage) {
      renderDitheredBitmap();
    }
  });
});

controls.downloadPng.addEventListener('click', () => {
  const link = document.createElement('a');
  link.href = canvas.toDataURL('image/png');
  link.download = `${outputFilename}-dithered.png`;
  link.click();
});

window.addEventListener('resize', () => {
  fitCanvas();

  if (loadedImage) {
    renderDitheredBitmap();
  } else {
    ctx.fillStyle = '#090613';
    ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
  }
});

fitCanvas();
ctx.fillStyle = '#090613';
ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
