import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const getReducedMotion = () => {
  if (typeof window === 'undefined') return true;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

function FireClusters({ reducedMotion }) {
  const clusters = useMemo(
    () => [
      { position: [-3.5, 0.9, -0.8], scale: [2.1, 1.4, 2.1] },
      { position: [-0.6, 1.2, 1.7], scale: [2.8, 1.8, 2.8] },
      { position: [3.4, 1.1, -2.2], scale: [2.2, 1.5, 2.2] },
      { position: [1.6, 0.8, 3.1], scale: [1.8, 1.3, 1.8] },
    ],
    []
  );

  const emberRefs = useRef([]);

  const emberData = useMemo(() => {
    const points = [];
    for (let i = 0; i < 160; i += 1) {
      points.push({
        x: (Math.random() - 0.5) * 15,
        y: 0.8 + Math.random() * 2.6,
        z: (Math.random() - 0.5) * 11,
        radius: 0.04 + Math.random() * 0.12,
        speed: 0.4 + Math.random() * 0.8,
      });
    }
    return points;
  }, []);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    emberRefs.current.forEach((mesh, index) => {
      if (!mesh) return;
      const point = emberData[index];
      const drift = t * point.speed + index;
      mesh.position.x = point.x + Math.sin(drift * 1.4) * 0.2;
      mesh.position.y = point.y + (Math.sin(drift * 2.1) * 0.4 + Math.cos(drift * 1.8) * 0.2);
      mesh.position.z = point.z + Math.cos(drift * 1.3) * 0.35;
      mesh.material.emissiveIntensity = 2.2 + Math.sin(drift * 3) * 0.8;
    });
  });

  return (
    <group>
      {clusters.map((cluster, index) => (
        <group key={index} position={cluster.position} scale={cluster.scale}>
          <mesh>
            <icosahedronGeometry args={[1.2, 1]} />
            <meshStandardMaterial
              color="#ff8a3d"
              emissive="#ff6b00"
              emissiveIntensity={2.6}
              metalness={0.2}
              roughness={0.4}
            />
          </mesh>
          <mesh scale={[1.5, 0.85, 1.5]}>
            <sphereGeometry args={[1, 18, 18]} />
            <meshStandardMaterial color="#ffc857" emissive="#ffb347" emissiveIntensity={1.3} transparent opacity={0.35} />
          </mesh>
        </group>
      ))}

      {emberData.map((point, index) => (
        <mesh
          key={index}
          ref={(node) => {
            emberRefs.current[index] = node;
          }}
          position={[point.x, point.y, point.z]}
          scale={point.radius}
        >
          <sphereGeometry args={[1, 10, 10]} />
          <meshStandardMaterial color="#ffb347" emissive="#ff7a32" emissiveIntensity={2.8} />
        </mesh>
      ))}
    </group>
  );
}

function ForestTrees({ reducedMotion }) {
  const treeData = useMemo(() => {
    const items = [];
    for (let i = 0; i < 52; i += 1) {
      const angle = (i / 52) * Math.PI * 2;
      const radius = 4.8 + (i % 7) * 0.9 + Math.random() * 2.4;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius * 1.1;
      const y = -0.3 + (Math.sin(x * 1.8 + z * 1.3) * 0.2 + 0.35);
      const scale = 0.8 + Math.random() * 0.9;
      items.push({ x, y, z, scale, hue: i % 3 === 0 ? '#143d2f' : '#1d4d3d' });
    }
    return items;
  }, []);

  return (
    <group>
      {treeData.map((tree, index) => (
        <group key={index} position={[tree.x, tree.y, tree.z]} scale={tree.scale} rotation-y={index * 0.6}>
          <mesh castShadow receiveShadow position={[0, 1.1, 0]}>
            <cylinderGeometry args={[0.12, 0.18, 1.4, 8]} />
            <meshStandardMaterial color="#3d2c1c" roughness={1} />
          </mesh>
          <mesh position={[0, 2.3, 0]}>
            <coneGeometry args={[0.8, 1.8, 8]} />
            <meshStandardMaterial color={tree.hue} emissive="#0b2118" emissiveIntensity={0.4} />
          </mesh>
          <mesh position={[0.15, 2.9, 0.12]}>
            <coneGeometry args={[0.62, 1.3, 8]} />
            <meshStandardMaterial color="#1e563d" emissive="#0a2317" emissiveIntensity={0.35} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Terrain() {
  const terrainBase = useRef();
  const ridgeGroup = useRef();

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (terrainBase.current) {
      terrainBase.current.rotation.y = t * 0.06;
    }
    if (ridgeGroup.current) {
      ridgeGroup.current.rotation.y = -t * 0.04;
    }
  });

  return (
    <group position={[0, -2.2, 0]}>
      <mesh ref={terrainBase} receiveShadow>
        <cylinderGeometry args={[9.4, 11.8, 4.8, 48]} />
        <meshStandardMaterial color="#112d2e" roughness={1} metalness={0.05} />
      </mesh>

      <group ref={ridgeGroup}>
        <mesh position={[-5.2, 0.8, -1.4]} scale={[2.4, 1.1, 2]}>
          <sphereGeometry args={[2.2, 30, 30]} />
          <meshStandardMaterial color="#183b38" roughness={1} />
        </mesh>
        <mesh position={[0.4, 1.2, 1.8]} scale={[2.8, 1.25, 2.5]}>
          <sphereGeometry args={[2.4, 30, 30]} />
          <meshStandardMaterial color="#1a403d" roughness={0.96} />
        </mesh>
        <mesh position={[4.8, 0.7, -3.1]} scale={[2.3, 1.05, 1.7]}>
          <sphereGeometry args={[2.1, 30, 30]} />
          <meshStandardMaterial color="#173c39" roughness={0.98} />
        </mesh>
      </group>

      <mesh rotation-x={-Math.PI / 2} position={[0, 0.1, 0]} receiveShadow>
        <planeGeometry args={[22, 20, 32, 32]} />
        <meshStandardMaterial color="#0b211d" roughness={1} metalness={0.1} />
      </mesh>
    </group>
  );
}

function SmokeAndGlow({ reducedMotion }) {
  const smokeRef = useRef();
  const glowRef = useRef();

  const smokePositions = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 90; i += 1) {
      arr.push({
        x: (Math.random() - 0.5) * 10,
        y: 1.8 + Math.random() * 2.8,
        z: (Math.random() - 0.5) * 11,
        scale: 0.4 + Math.random() * 1.6,
      });
    }
    return arr;
  }, []);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (smokeRef.current) {
      smokeRef.current.rotation.y = t * 0.12;
      smokeRef.current.rotation.x = Math.sin(t * 0.5) * 0.08;
    }
    if (glowRef.current) {
      glowRef.current.material.opacity = 0.22 + Math.sin(t * 2) * 0.08;
    }
  });

  return (
    <group>
      <mesh ref={glowRef} position={[0, 0.7, 0]} scale={[7.5, 1.8, 7.5]}>
        <sphereGeometry args={[1.8, 28, 28]} />
        <meshStandardMaterial color="#ff8a3d" emissive="#ff7a32" emissiveIntensity={1.2} transparent opacity={0.22} />
      </mesh>

      <group ref={smokeRef}>
        {smokePositions.map((particle, index) => (
          <mesh key={index} position={[particle.x, particle.y, particle.z]} scale={particle.scale}>
            <sphereGeometry args={[1, 16, 16]} />
            <meshStandardMaterial color="#dfe8ff" transparent opacity={0.08 + (index % 5) * 0.015} emissive="#8cc8ff" emissiveIntensity={0.4} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function SceneContents() {
  const reducedMotion = getReducedMotion();
  const groupRef = useRef();

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.getElapsedTime();
    const targetX = state.pointer.x * 1.4;
    const targetY = 1.4 + state.pointer.y * 1.2;
    const targetZ = 11.4 + state.pointer.x * 0.7;

    if (!reducedMotion) {
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetX * 0.65, 0.04);
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, -0.18 + targetY * 0.18, 0.04);
      groupRef.current.position.y = Math.sin(t * 0.9) * 0.16;
    }

    state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, targetX * 2.2, 0.05);
    state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, 4.8 + targetY * 2.1, 0.05);
    state.camera.position.z = THREE.MathUtils.lerp(state.camera.position.z, targetZ, 0.06);
    state.camera.lookAt(0, 0.8, 0);
  });

  const grid = useMemo(() => new THREE.GridHelper(26, 18, '#5dd9ff', '#1b2a41'), []);
  const glow = useRef();

  useEffect(() => {
    return () => {
      grid.geometry.dispose();
      if (grid.material) {
        if (Array.isArray(grid.material)) {
          grid.material.forEach((material) => material.dispose());
        } else {
          grid.material.dispose();
        }
      }
    };
  }, [grid]);

  return (
    <group ref={groupRef}>
      <primitive object={grid} position={[0, -0.5, 0]} />
      <Terrain />
      <ForestTrees reducedMotion={reducedMotion} />
      <FireClusters reducedMotion={reducedMotion} />
      <SmokeAndGlow reducedMotion={reducedMotion} />
      <mesh ref={glow} position={[0, 0, 0]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[8.5, 12, 80]} />
        <meshBasicMaterial color="#5dd9ff" transparent opacity={0.15} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

export default function ForestScene() {
  if (typeof window === 'undefined' || !window.WebGLRenderingContext) {
    return (
      <div className="flex h-[420px] w-full items-center justify-center rounded-[24px] border border-[#2B3B53] bg-[#0B1020] text-sm text-[#A7B4C8]">
        3D forest preview unavailable in this browser.
      </div>
    );
  }

  return (
    <div className="h-[420px] w-full overflow-hidden rounded-[24px] border border-[#2B3B53] bg-[#0B1020]">
      <Canvas shadows dpr={[1, 1.75]} gl={{ antialias: true }} camera={{ position: [0, 4.8, 11], fov: 48 }}>
        <color attach="background" args={['#0B1020']} />
        <fog attach="fog" args={['#0B1020', 10, 28]} />
        <ambientLight intensity={0.9} color="#b7d8ff" />
        <directionalLight
          castShadow
          position={[7, 10, 4]}
          intensity={1.5}
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          color="#fff4da"
        />
        <pointLight position={[0, 3.5, 2]} intensity={2.5} color="#ff7a32" />
        <pointLight position={[-4, 3, -5]} intensity={1.6} color="#5dd9ff" />
        <SceneContents />
      </Canvas>
    </div>
  );
}
