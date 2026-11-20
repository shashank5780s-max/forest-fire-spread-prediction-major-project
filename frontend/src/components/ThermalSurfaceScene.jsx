import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { RasterCanvas } from '../utils/resultsRaster';

const scoreColor = (score) => {
  const value = Math.min(1, Math.max(0, score));
  const stops = [
    [0, [14, 25, 45]], [0.25, [51, 48, 126]], [0.5, [111, 77, 181]],
    [0.72, [29, 175, 193]], [0.88, [244, 169, 71]], [1, [239, 81, 64]],
  ];
  const upperIndex = stops.findIndex(([position]) => position >= value);
  const lower = stops[Math.max(0, upperIndex - 1)];
  const upper = stops[Math.max(0, upperIndex)];
  const amount = upper[0] === lower[0] ? 0 : (value - lower[0]) / (upper[0] - lower[0]);
  return lower[1].map((channel, index) => channel + (upper[1][index] - channel) * amount);
};

const isMaskEdge = (mask, index, width, height) => {
  if (!mask[index]) return false;
  const x = index % width;
  const y = Math.floor(index / width);
  return x === 0 || x === width - 1 || y === 0 || y === height - 1
    || !mask[index - 1] || !mask[index + 1] || !mask[index - width] || !mask[index + width];
};

function buildSurfaceGeometry(layers) {
  const segments = Math.min(255, layers.width - 1, layers.height - 1);
  const side = segments + 1;
  const positions = new Float32Array(side * side * 3);
  const colors = new Float32Array(side * side * 3);
  const indices = [];

  for (let row = 0; row <= segments; row += 1) {
    for (let column = 0; column <= segments; column += 1) {
      const u = column / segments;
      const v = row / segments;
      const sourceX = u * (layers.width - 1);
      const sourceY = v * (layers.height - 1);
      const pixelX = Math.round(sourceX);
      const pixelY = Math.round(sourceY);
      const pixelIndex = pixelY * layers.width + pixelX;
      const vertexIndex = row * side + column;
      const x0 = Math.floor(sourceX);
      const y0 = Math.floor(sourceY);
      const x1 = Math.min(layers.width - 1, x0 + 1);
      const y1 = Math.min(layers.height - 1, y0 + 1);
      const xBlend = sourceX - x0;
      const yBlend = sourceY - y0;
      const topScore = layers.scores[y0 * layers.width + x0] * (1 - xBlend) + layers.scores[y0 * layers.width + x1] * xBlend;
      const bottomScore = layers.scores[y1 * layers.width + x0] * (1 - xBlend) + layers.scores[y1 * layers.width + x1] * xBlend;
      const score = Math.min(1, Math.max(0, topScore * (1 - yBlend) + bottomScore * yBlend));
      let reliefScore = 0;
      let reliefSamples = 0;
      for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
        for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
          const sampleX = Math.max(0, Math.min(layers.width - 1, pixelX + offsetX));
          const sampleY = Math.max(0, Math.min(layers.height - 1, pixelY + offsetY));
          reliefScore += layers.scores[sampleY * layers.width + sampleX];
          reliefSamples += 1;
        }
      }
      reliefScore /= reliefSamples;
      const current = Boolean(layers.currentMask[pixelIndex]);
      const future = Boolean(layers.futureMask[pixelIndex]);
      const currentEdge = current && isMaskEdge(layers.currentMask, pixelIndex, layers.width, layers.height);
      const futureEdge = future && isMaskEdge(layers.futureMask, pixelIndex, layers.width, layers.height);
      const color = currentEdge && futureEdge
        ? [0.92, 0.78, 0.48]
        : currentEdge
          ? [0.2, 1, 0.96]
          : futureEdge
            ? [1, 0.76, 0.42]
            : current && future
              ? [0.91, 0.78, 0.48]
              : current
                ? [0.04, 0.84, 0.82]
                : future
                  ? [1, 0.46, 0.13]
                  : scoreColor(score).map((channel) => channel / 255);
      const positionOffset = vertexIndex * 3;
      const colorOffset = vertexIndex * 3;
      positions[positionOffset] = (u - 0.5) * 6.2;
      positions[positionOffset + 1] = reliefScore * 0.24;
      positions[positionOffset + 2] = (v - 0.5) * 6.2;
      colors[colorOffset] = color[0];
      colors[colorOffset + 1] = color[1];
      colors[colorOffset + 2] = color[2];

      if (column < segments && row < segments) {
        const nextRow = vertexIndex + side;
        indices.push(vertexIndex, nextRow, vertexIndex + 1, vertexIndex + 1, nextRow, nextRow + 1);
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function Terrain({ layers, controlsRef }) {
  const geometry = useMemo(() => buildSurfaceGeometry(layers), [layers]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.16, 0]}>
        <planeGeometry args={[8.5, 8.5]} />
        <meshStandardMaterial color="#101a2a" roughness={1} />
      </mesh>
      <gridHelper args={[7.2, 18, '#4b667e', '#26384e']} position={[0, -0.145, 0]} />
      <mesh geometry={geometry}>
        <meshStandardMaterial vertexColors roughness={0.58} metalness={0.08} side={THREE.DoubleSide} />
      </mesh>
      <OrbitControls
        ref={controlsRef}
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={4.2}
        maxDistance={11}
        maxPolarAngle={Math.PI * 0.48}
        target={[0, 0.22, 0]}
      />
    </group>
  );
}

export default function ThermalSurfaceScene({ layers }) {
  const viewerRef = useRef(null);
  const controlsRef = useRef(null);
  const rendererRef = useRef(null);
  const [rendererReady, setRendererReady] = useState(false);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return undefined;

    const resize = () => {
      const renderer = rendererRef.current;
      if (!renderer) return;
      const { width, height } = viewer.getBoundingClientRect();
      if (!width || !height) return;
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      renderer.domElement.style.display = 'block';
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.setSize(width, height, false);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(viewer);
    const firstFrame = requestAnimationFrame(resize);
    const secondFrame = requestAnimationFrame(() => requestAnimationFrame(resize));
    return () => {
      observer.disconnect();
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
    };
  }, [layers, rendererReady]);

  if (typeof window === 'undefined' || !window.WebGLRenderingContext) {
    return (
      <div className="rounded-lg border border-[#2B3B53] bg-[#0B1020] p-4">
        <p className="mb-3 text-xs text-[#A7B4C8]">WebGL unavailable. Showing the 2D raw model-score map instead.</p>
        <RasterCanvas layers={layers} mode="score" label="Raw model score heatmap fallback" className="mx-auto block aspect-square max-h-[360px] w-full object-contain" />
      </div>
    );
  }

  return (
    <div ref={viewerRef} data-results-terrain className="relative h-[380px] overflow-hidden rounded-lg border border-[#2B3B53] bg-[#0B1020] sm:h-[440px]">
      <div className="absolute left-3 top-3 z-10 flex flex-wrap gap-2">
        <span className="rounded border border-white/10 bg-[#0B1020]/85 px-2 py-1 text-[10px] text-[#DDE7F5] backdrop-blur">2.5D sigmoid score surface</span>
        <span className="rounded border border-white/10 bg-[#0B1020]/85 px-2 py-1 text-[10px] text-[#A7B4C8] backdrop-blur">Pixel coordinates · not elevation</span>
      </div>
      <div className="pointer-events-none absolute bottom-3 left-3 z-10 flex gap-3 rounded border border-white/10 bg-[#0B1020]/85 px-2 py-1 text-[9px] text-[#A7B4C8] backdrop-blur">
        <span>row 0 at top</span><span>column 0 ← → {layers.width - 1}</span>
      </div>
      <div className="absolute right-3 top-3 z-10 flex gap-2">
        <button type="button" title="Reset camera" aria-label="Reset camera" onClick={() => controlsRef.current?.reset()} className="rounded border border-white/15 bg-[#0B1020]/85 px-2.5 py-1.5 text-xs text-[#DDE7F5] transition hover:border-[#42E8E0]/50 hover:text-white">Reset view</button>
      </div>
      <Canvas
        className="h-full w-full"
        style={{ display: 'block', height: '100%', width: '100%' }}
        resize={{ scroll: true, debounce: 0 }}
        dpr={[1, 1.5]}
        frameloop="demand"
        camera={{ position: [0, 4.6, 7.3], fov: 40 }}
        fallback={<div className="flex h-full items-center justify-center p-5 text-sm text-[#A7B4C8]">WebGL unavailable. Use the 2D mask and score panels below.</div>}
        onCreated={({ gl }) => {
          rendererRef.current = gl;
          setRendererReady(true);
        }}
      >
        <color attach="background" args={['#0B1020']} />
        <ambientLight intensity={0.72} color="#c6d5e8" />
        <directionalLight position={[-3, 7, 5]} intensity={1.35} color="#f1f5fb" />
        <pointLight position={[2, 3, -2]} intensity={0.4} color="#FF9A43" />
        <Terrain layers={layers} controlsRef={controlsRef} />
      </Canvas>
    </div>
  );
}
