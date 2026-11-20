import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';

const nodeSpecs = [
  { label: 'Thermal Frames', position: [-4.2, 1.6, 0], color: '#42E8E0' },
  { label: 'U-Net', position: [-1.1, 1.6, 0], color: '#A78BFA' },
  { label: 'Fire Masks', position: [2.2, 1.6, 0], color: '#FF7A32' },
  { label: 'ConvLSTM', position: [4.8, 1.6, 0], color: '#FFC857' },
  { label: 'Future Fire Map', position: [8.1, 1.6, 0], color: '#35D39A' },
];

function AnimatedNodes() {
  const groupRef = useRef();

  useFrame((state) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y = state.clock.getElapsedTime() * 0.12;
  });

  return (
    <group ref={groupRef}>
      {nodeSpecs.map((node, index) => (
        <group key={node.label} position={node.position}>
          <mesh scale={0.8 + (index % 2) * 0.1}>
            <icosahedronGeometry args={[0.38, 1]} />
            <meshStandardMaterial color={node.color} emissive={node.color} emissiveIntensity={1.5} />
          </mesh>
          <mesh position={[0, -0.7, 0]}>
            <planeGeometry args={[1.4, 0.34]} />
            <meshBasicMaterial color="#0F172A" transparent opacity={0.75} />
          </mesh>
          <sprite position={[0, -0.7, 0.05]}>
            <spriteMaterial color={node.color} transparent opacity={0.9} />
          </sprite>
        </group>
      ))}

      <Line
        points={[
          [-2.8, 1.6, 0],
          [-1.9, 1.6, 0],
        ]}
        color="#42E8E0"
        lineWidth={1.8}
      />
      <Line
        points={[
          [0.2, 1.6, 0],
          [1.3, 1.6, 0],
        ]}
        color="#A78BFA"
        lineWidth={1.8}
      />
      <Line
        points={[
          [3.5, 1.6, 0],
          [4.1, 1.6, 0],
        ]}
        color="#FF7A32"
        lineWidth={1.8}
      />
      <Line
        points={[
          [6.3, 1.6, 0],
          [7.2, 1.6, 0],
        ]}
        color="#FFC857"
        lineWidth={1.8}
      />
    </group>
  );
}

function PipelineSceneContent() {
  const ringRef = useRef();
  useFrame((state) => {
    if (ringRef.current) {
      ringRef.current.rotation.z = state.clock.getElapsedTime() * 0.4;
    }
  });

  return (
    <>
      <ambientLight intensity={0.9} />
      <directionalLight position={[4, 6, 3]} intensity={1.4} color="#fff5d6" />
      <mesh ref={ringRef} rotation-x={Math.PI / 2} position={[0, 0.3, 0]}>
        <torusGeometry args={[4.8, 0.03, 16, 120]} />
        <meshBasicMaterial color="#5dd9ff" transparent opacity={0.38} />
      </mesh>
      <AnimatedNodes />
    </>
  );
}

export default function PipelineScene() {
  if (typeof window === 'undefined' || !window.WebGLRenderingContext) {
    return (
      <div className="flex h-[280px] w-full items-center justify-center rounded-[24px] border border-[#2B3B53] bg-[#0B1020] text-sm text-[#A7B4C8]">
        3D workflow preview unavailable.
      </div>
    );
  }

  return (
    <div className="h-[280px] w-full overflow-hidden rounded-[24px] border border-[#2B3B53] bg-[#0B1020]">
      <Canvas camera={{ position: [0, 1.6, 10], fov: 36 }} dpr={[1, 1.5]}>
        <color attach="background" args={['#0B1020']} />
        <PipelineSceneContent />
      </Canvas>
    </div>
  );
}
