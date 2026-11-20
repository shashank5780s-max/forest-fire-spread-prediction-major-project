import React, { useEffect, useRef } from 'react';

const clamp01 = (value) => Math.min(1, Math.max(0, value));

function readNpyFloat32(buffer) {
  const bytes = new Uint8Array(buffer);
  const magic = [0x93, 0x4e, 0x55, 0x4d, 0x50, 0x59];
  if (!magic.every((value, index) => bytes[index] === value)) {
    throw new Error('The model score file is not a valid NumPy array.');
  }

  const view = new DataView(buffer);
  const major = bytes[6];
  const headerLength = major === 1 ? view.getUint16(8, true) : view.getUint32(8, true);
  const headerOffset = major === 1 ? 10 : 12;
  const header = new TextDecoder().decode(bytes.subarray(headerOffset, headerOffset + headerLength));
  const descriptor = header.match(/['"]descr['"]\s*:\s*['"]([^'"]+)['"]/i)?.[1];
  const shapeText = header.match(/['"]shape['"]\s*:\s*\(([^)]*)\)/i)?.[1];
  const shape = shapeText?.split(',').map((value) => Number(value.trim())).filter(Number.isFinite);

  if (!descriptor?.includes('f4') || !shape || shape.length !== 2) {
    throw new Error('The model score array has an unsupported format.');
  }

  const dataOffset = headerOffset + headerLength;
  const count = shape[0] * shape[1];
  if (!count || dataOffset + count * 4 > buffer.byteLength) {
    throw new Error('The model score array is incomplete.');
  }

  const littleEndian = !descriptor.startsWith('>');
  const values = new Float32Array(count);
  for (let index = 0; index < count; index += 1) {
    values[index] = view.getFloat32(dataOffset + index * 4, littleEndian);
  }

  return { width: shape[1], height: shape[0], values };
}

async function loadMask(url, signal) {
  const response = await fetch(url, { signal, cache: 'no-store' });
  if (!response.ok) throw new Error(`Unable to load a fire mask (${response.status}).`);

  const image = new Image();
  const objectUrl = URL.createObjectURL(await response.blob());
  try {
    await new Promise((resolve, reject) => {
      const cleanup = () => {
        clearTimeout(timeoutId);
        signal?.removeEventListener('abort', onAbort);
        image.onload = null;
        image.onerror = null;
      };
      const onAbort = () => {
        cleanup();
        reject(new DOMException('Raster loading was cancelled.', 'AbortError'));
      };
      const timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error('Timed out decoding a fire mask.'));
      }, 10000);
      image.onload = () => {
        cleanup();
        resolve();
      };
      image.onerror = () => {
        cleanup();
        reject(new Error('A fire mask image could not be decoded.'));
      };
      signal?.addEventListener('abort', onAbort, { once: true });
      image.src = objectUrl;
      if (image.complete && image.naturalWidth > 0) {
        cleanup();
        resolve();
      }
    });
    if (!image.naturalWidth || !image.naturalHeight) throw new Error('A fire mask image has no pixel data.');
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.drawImage(image, 0, 0);
    const rgba = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const mask = new Uint8Array(canvas.width * canvas.height);
    for (let index = 0; index < mask.length; index += 1) {
      const offset = index * 4;
      mask[index] = (rgba[offset] + rgba[offset + 1] + rgba[offset + 2]) / 3 >= 128 ? 1 : 0;
    }
    return { width: canvas.width, height: canvas.height, values: mask };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function loadPredictionLayers({ scoreUrl, currentUrl, futureUrl }, signal) {
  const [scoreResponse, currentMask, futureMask] = await Promise.all([
    fetch(scoreUrl, { signal, cache: 'no-store' }).then((response) => {
      if (!response.ok) throw new Error(`Unable to load the raw model score (${response.status}).`);
      return response.arrayBuffer();
    }).then(readNpyFloat32),
    loadMask(currentUrl, signal),
    loadMask(futureUrl, signal),
  ]);

  const { width, height } = scoreResponse;
  if ([currentMask, futureMask].some((mask) => mask.width !== width || mask.height !== height)) {
    throw new Error('The current, predicted, and score maps do not share the same pixel grid.');
  }

  let currentArea = 0;
  let futureArea = 0;
  let expansionArea = 0;
  for (let index = 0; index < currentMask.values.length; index += 1) {
    const current = currentMask.values[index];
    const future = futureMask.values[index];
    currentArea += current;
    futureArea += future;
    expansionArea += future && !current ? 1 : 0;
  }

  return {
    width,
    height,
    scores: scoreResponse.values,
    currentMask: currentMask.values,
    futureMask: futureMask.values,
    currentArea,
    futureArea,
    expansionArea,
  };
}

function scoreColor(value) {
  const stops = [
    [0, [14, 25, 45]],
    [0.25, [51, 48, 126]],
    [0.5, [111, 77, 181]],
    [0.72, [29, 175, 193]],
    [0.88, [244, 169, 71]],
    [1, [239, 81, 64]],
  ];
  const normalized = clamp01(value);
  const upperIndex = stops.findIndex(([position]) => position >= normalized);
  const lower = stops[Math.max(0, upperIndex - 1)];
  const upper = stops[Math.max(0, upperIndex)];
  const amount = upper[0] === lower[0] ? 0 : (normalized - lower[0]) / (upper[0] - lower[0]);
  return lower[1].map((channel, index) => Math.round(channel + (upper[1][index] - channel) * amount));
}

function isBoundary(mask, index, width, height) {
  if (!mask[index]) return false;
  const x = index % width;
  const y = Math.floor(index / width);
  return x === 0 || x === width - 1 || y === 0 || y === height - 1
    || !mask[index - 1] || !mask[index + 1] || !mask[index - width] || !mask[index + width];
}

export function drawResultRaster(canvas, layers, mode, progress = 1) {
  if (!canvas || !layers) return;
  const { width, height, scores, currentMask, futureMask } = layers;
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  const frame = context.createImageData(width, height);

  for (let index = 0; index < width * height; index += 1) {
    const offset = index * 4;
    const current = Boolean(currentMask[index]);
    const future = Boolean(futureMask[index]);
    let color;
    let alpha = 255;

    if (mode === 'score') {
      color = scoreColor(scores[index]);
    } else if (mode === 'current') {
      color = current ? (isBoundary(currentMask, index, width, height) ? [154, 255, 246] : [0, 205, 205]) : [12, 23, 39];
    } else if (mode === 'future') {
      color = future ? (isBoundary(futureMask, index, width, height) ? [255, 225, 174] : [255, 137, 50]) : [12, 23, 39];
    } else if (mode === 'transition') {
      if (current && future) {
        color = [236, 226, 204];
      } else if (current) {
        color = [0, 205, 205];
        alpha = Math.round((1 - clamp01(progress)) * 255);
      } else if (future) {
        color = [255, 55, 55];
        alpha = Math.round(clamp01(progress) * 255);
      } else {
        color = [12, 23, 39];
      }
    } else if (current && future) {
      color = [236, 226, 204];
    } else if (current) {
      color = [0, 205, 205];
    } else if (future) {
      color = [255, 55, 55];
    } else {
      color = [12, 23, 39];
    }

    frame.data[offset] = color[0];
    frame.data[offset + 1] = color[1];
    frame.data[offset + 2] = color[2];
    frame.data[offset + 3] = alpha;
  }

  context.putImageData(frame, 0, 0);
}

export function RasterCanvas({ layers, mode, label, className = '', progress, style }) {
  const canvasRef = useRef(null);
  useEffect(() => drawResultRaster(canvasRef.current, layers, mode, progress), [layers, mode, progress]);
  return React.createElement('canvas', {
    ref: canvasRef,
    role: 'img',
    'aria-label': label,
    className,
    style,
  });
}
