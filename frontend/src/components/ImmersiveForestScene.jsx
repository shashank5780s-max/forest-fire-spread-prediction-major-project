import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const makeTrees = () => {
  const trees = [];
  for (let index = 0; index < 148; index += 1) {
    const far = index < 76;
    const middle = index >= 76 && index < 126;
    const side = index % 2 === 0 ? -1 : 1;
    const x = far
      ? (Math.random() - 0.5) * 42
      : middle
        ? side * (5.8 + Math.random() * 12)
        : side * (9 + Math.random() * 15);
    const z = far
      ? -10 - Math.random() * 10
      : middle
        ? -3 - Math.random() * 8
        : 2 + Math.random() * 6;
    trees.push({
      x,
      z,
      size: (far ? 0.58 : middle ? 0.82 : 1.04) * (0.72 + Math.random() * 0.5),
      turn: Math.random() * Math.PI * 2,
      tint: ['#244a39', '#315d43', '#1d4034', '#3a6446'][index % 4],
    });
  }
  return trees;
};

function ForestInstances({ trees }) {
  const trunkRef = useRef();
  const canopyRef = useRef();
  const materialRef = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const foliageMaterial = useMemo(() => {
    const material = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.94,
      metalness: 0,
    });
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uWindTime = { value: 0 };
      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        '#include <common>\nuniform float uWindTime;'
      );
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        #ifdef USE_INSTANCING
          float windPhase = instanceMatrix[3].x * 0.19 + instanceMatrix[3].z * 0.13;
          float branchWeight = max(position.y + 0.45, 0.0);
          transformed.x += sin(uWindTime * 0.72 + windPhase + position.y * 1.7) * 0.055 * branchWeight;
          transformed.z += cos(uWindTime * 0.54 + windPhase + position.y) * 0.035 * branchWeight;
        #endif`
      );
      material.userData.windShader = shader;
    };
    material.customProgramCacheKey = () => 'forest-foliage-wind-v1';
    materialRef.current = material;
    return material;
  }, []);

  useLayoutEffect(() => {
    if (!trunkRef.current || !canopyRef.current) return;
    trees.forEach((tree, index) => {
      dummy.position.set(tree.x, -0.58 + tree.size * 0.75, tree.z);
      dummy.rotation.set(0, tree.turn, 0);
      dummy.scale.set(tree.size * 0.12, tree.size * 1.8, tree.size * 0.12);
      dummy.updateMatrix();
      trunkRef.current.setMatrixAt(index, dummy.matrix);

      for (let tier = 0; tier < 3; tier += 1) {
        const instance = index * 3 + tier;
        const tierScale = [0.8, 0.62, 0.44][tier] * tree.size;
        dummy.position.set(
          tree.x,
          -0.58 + tree.size * (1.05 + tier * 0.88),
          tree.z
        );
        dummy.rotation.set(0, tree.turn + tier * 0.22, 0);
        dummy.scale.set(tierScale, tierScale * 1.22, tierScale);
        dummy.updateMatrix();
        canopyRef.current.setMatrixAt(instance, dummy.matrix);
        canopyRef.current.setColorAt(instance, new THREE.Color(tree.tint));
      }
    });
    trunkRef.current.instanceMatrix.needsUpdate = true;
    canopyRef.current.instanceMatrix.needsUpdate = true;
    if (canopyRef.current.instanceColor) canopyRef.current.instanceColor.needsUpdate = true;
  }, [dummy, trees]);

  useFrame((state) => {
    const shader = materialRef.current?.userData.windShader;
    if (shader) shader.uniforms.uWindTime.value = state.clock.getElapsedTime();
  });

  return (
    <group>
      <instancedMesh ref={trunkRef} args={[undefined, undefined, trees.length]} castShadow>
        <cylinderGeometry args={[0.16, 0.24, 1, 7]} />
        <meshStandardMaterial color="#392d22" roughness={1} />
      </instancedMesh>
      <instancedMesh ref={canopyRef} args={[undefined, undefined, trees.length * 3]} material={foliageMaterial}>
        <coneGeometry args={[0.82, 1.55, 7]} />
      </instancedMesh>
    </group>
  );
}

function Mountain({ position, scale, color, rotation = 0 }) {
  return (
    <mesh position={position} scale={scale} rotation-y={rotation}>
      <coneGeometry args={[1, 1, 7, 3]} />
      <meshStandardMaterial color={color} roughness={1} flatShading />
    </mesh>
  );
}

function Terrain() {
  const geometry = useMemo(() => {
    const terrain = new THREE.PlaneGeometry(58, 48, 72, 60);
    const positions = terrain.attributes.position;
    for (let index = 0; index < positions.count; index += 1) {
      const x = positions.getX(index);
      const y = positions.getY(index);
      const rise = Math.sin(x * 0.18 + y * 0.09) * 0.22 + Math.cos(y * 0.24) * 0.16;
      positions.setZ(index, rise);
    }
    terrain.computeVertexNormals();
    return terrain;
  }, []);

  return (
    <group>
      <mesh position={[0, -0.85, -18]} scale={[23, 8, 2]}>
        <sphereGeometry args={[1, 40, 24]} />
        <meshStandardMaterial color="#152b27" roughness={1} />
      </mesh>
      <Mountain position={[-15, -0.15, -15]} scale={[8, 7, 2.8]} color="#203b33" rotation={0.4} />
      <Mountain position={[-5, 0.1, -18]} scale={[9, 8, 3]} color="#1a342d" rotation={0.15} />
      <Mountain position={[8, -0.1, -17]} scale={[10, 8.5, 3]} color="#203c32" rotation={0.55} />
      <Mountain position={[18, -0.3, -13]} scale={[8, 6.5, 2.5]} color="#19352d" rotation={0.2} />
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.62, -3]} receiveShadow>
        <primitive object={geometry} attach="geometry" />
        <meshStandardMaterial color="#18372b" roughness={1} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0.7, -0.585, -9]} scale={[0.75, 9.8, 1]}>
        <planeGeometry args={[2.1, 1, 1, 1]} />
        <meshStandardMaterial color="#235b5a" emissive="#0b4e50" emissiveIntensity={0.42} roughness={0.24} metalness={0.18} />
      </mesh>
      <gridHelper args={[42, 42, '#00b9b0', '#168a83']} position={[0, -0.56, -3]}>
        <lineBasicMaterial attach="material" color="#00b9b0" transparent opacity={0.1} />
      </gridHelper>
    </group>
  );
}

function MovingParticles({ kind, count }) {
  const pointsRef = useRef();
  const positions = useMemo(() => {
    const data = new Float32Array(count * 3);
    for (let index = 0; index < count; index += 1) {
      data[index * 3] = (Math.random() - 0.5) * (kind === 'mist' ? 38 : 8);
      data[index * 3 + 1] = kind === 'mist' ? -0.15 + Math.random() * 3.5 : -0.2 + Math.random() * 2.4;
      data[index * 3 + 2] = kind === 'mist' ? -16 + Math.random() * 22 : -4 + Math.random() * 6;
    }
    return data;
  }, [count, kind]);
  const seeds = useMemo(() => Array.from({ length: count }, () => Math.random() * Math.PI * 2), [count]);

  useFrame((state) => {
    if (!pointsRef.current) return;
    const attribute = pointsRef.current.geometry.attributes.position;
    const time = state.clock.getElapsedTime();
    for (let index = 0; index < count; index += 1) {
      const offset = index * 3;
      if (kind === 'mist') {
        attribute.array[offset] = positions[offset] + Math.sin(time * 0.13 + seeds[index]) * 0.7;
        attribute.array[offset + 1] = positions[offset + 1] + Math.sin(time * 0.16 + seeds[index]) * 0.12;
        attribute.array[offset + 2] = positions[offset + 2] + Math.cos(time * 0.1 + seeds[index]) * 0.35;
      } else {
        attribute.array[offset] = positions[offset] + Math.sin(time * 0.8 + seeds[index]) * 0.24;
        attribute.array[offset + 1] = -0.15 + ((positions[offset + 1] + time * (0.12 + (index % 4) * 0.035)) % 2.8);
        attribute.array[offset + 2] = positions[offset + 2] + Math.cos(time * 0.45 + seeds[index]) * 0.18;
      }
    }
    attribute.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} usage={THREE.DynamicDrawUsage} />
      </bufferGeometry>
      <pointsMaterial
        color={kind === 'mist' ? '#b8d6c4' : '#ff9b48'}
        size={kind === 'mist' ? 0.72 : 0.07}
        transparent
        opacity={kind === 'mist' ? 0.075 : 0.82}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}

function FireZone() {
  const glow = useRef();
  const boundary = useRef();
  const boundaryGeometry = useMemo(() => {
    const points = [];
    for (let index = 0; index < 100; index += 1) {
      const angle = (index / 100) * Math.PI * 2;
      const variation = 1 + 0.045 * Math.sin(angle * 5) + 0.025 * Math.cos(angle * 9);
      points.push(new THREE.Vector3(Math.cos(angle) * 3.6 * variation, 0, Math.sin(angle) * 1.8 * variation));
    }
    return new THREE.BufferGeometry().setFromPoints(points);
  }, []);

  useFrame((state) => {
    const pulse = 0.5 + Math.sin(state.clock.getElapsedTime() * 1.2) * 0.5;
    if (glow.current) glow.current.material.opacity = 0.12 + pulse * 0.09;
    if (boundary.current) boundary.current.material.opacity = 0.5 + pulse * 0.32;
  });

  return (
    <group position={[0, -0.51, -2.2]}>
      <mesh ref={glow} rotation-x={-Math.PI / 2} scale={[1, 0.65, 1]}>
        <circleGeometry args={[4.6, 64]} />
        <meshBasicMaterial color="#f07432" transparent opacity={0.18} depthWrite={false} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.025, 0]} scale={[3.8, 1.75, 1]}>
        <circleGeometry args={[1, 64]} />
        <meshBasicMaterial color="#ff9d45" transparent opacity={0.54} depthWrite={false} />
      </mesh>
      <line ref={boundary} geometry={boundaryGeometry} position={[0, 0.06, 0]}>
        <lineBasicMaterial color="#ffc46a" transparent opacity={0.75} />
      </line>
    </group>
  );
}

function LightShafts() {
  return (
    <group>
      {[-1.15, -0.35, 0.55].map((angle, index) => (
        <mesh key={angle} position={[-7 + index * 6, 3.2, -7]} rotation={[0, 0, angle]}>
          <coneGeometry args={[1.3, 11, 16, 1, true]} />
          <meshBasicMaterial color={index === 1 ? '#d9e7b6' : '#b5cfac'} transparent opacity={0.045} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

function Scene({ reducedMotion, mobile }) {
  const trees = useMemo(makeTrees, []);
  const parallax = useRef();

  useFrame((state) => {
    if (!parallax.current || reducedMotion || mobile) return;
    const time = state.clock.getElapsedTime();
    const targetX = state.pointer.x * 0.16;
    const targetY = state.pointer.y * 0.08;
    parallax.current.rotation.y = THREE.MathUtils.lerp(parallax.current.rotation.y, targetX, 0.025);
    parallax.current.rotation.x = THREE.MathUtils.lerp(parallax.current.rotation.x, -targetY, 0.025);
    parallax.current.position.y = Math.sin(time * 0.18) * 0.025;
  });

  return (
    <group ref={parallax}>
      <Terrain />
      <ForestInstances trees={trees} />
      {!reducedMotion && <LightShafts />}
      <FireZone />
      {!reducedMotion && <MovingParticles kind="mist" count={mobile ? 22 : 54} />}
      {!reducedMotion && <MovingParticles kind="embers" count={mobile ? 16 : 42} />}
    </group>
  );
}

function ForestFallback() {
  const trees = Array.from({ length: 17 }, (_, index) => index);
  return (
    <div className="absolute inset-0 overflow-hidden bg-[linear-gradient(180deg,#14251f_0%,#243b32_38%,#14271f_62%,#09130f_100%)]" aria-label="Layered forest at dusk">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_62%_42%,rgba(255,164,83,0.38),transparent_23%),linear-gradient(115deg,transparent_30%,rgba(217,231,182,0.12)_51%,transparent_68%)]" />
      <div className="absolute inset-x-[-10%] top-[25%] h-[48%] bg-[#1b3029] opacity-75" style={{ clipPath: 'polygon(0 58%, 18% 20%, 32% 54%, 51% 8%, 70% 50%, 84% 23%, 100% 59%, 100% 100%, 0 100%)' }} />
      <div className="absolute left-[43%] top-[43%] h-[50%] w-[30%] -translate-x-1/2 bg-[#31605a]/50 blur-[3px]" style={{ clipPath: 'polygon(42% 0, 58% 0, 68% 35%, 60% 56%, 78% 100%, 20% 100%, 39% 58%, 31% 34%)' }} />
      {trees.map((tree) => {
        const left = `${(tree / (trees.length - 1)) * 100}%`;
        const height = 28 + ((tree * 17) % 38);
        return (
          <div key={tree} className="absolute bottom-0" style={{ left, height: `${height}%`, width: tree % 3 === 0 ? 48 : 34, transform: 'translateX(-50%)', opacity: 0.62 + (tree % 3) * 0.12 }}>
            <div className="absolute bottom-0 left-1/2 h-[35%] w-[10%] -translate-x-1/2 bg-[#151f18]" />
            <div className="absolute bottom-[22%] left-1/2 h-[82%] w-full -translate-x-1/2 bg-[#19372a]" style={{ clipPath: 'polygon(50% 0, 100% 32%, 77% 32%, 100% 59%, 70% 59%, 100% 100%, 0 100%, 30% 59%, 0 59%, 23% 32%, 0 32%)' }} />
          </div>
        );
      })}
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-[linear-gradient(0deg,rgba(7,16,12,0.88),transparent)]" />
      <div className="absolute inset-0 opacity-[0.14] [background-image:linear-gradient(rgba(0,230,210,0.35)_1px,transparent_1px),linear-gradient(90deg,rgba(0,230,210,0.35)_1px,transparent_1px)] [background-size:64px_64px] [mask-image:linear-gradient(transparent,black_45%,transparent)]" />
      <div className="absolute left-[56%] top-[58%] h-24 w-52 -translate-x-1/2 rounded-[50%] bg-orange-500/20 blur-2xl" />
      <div className="absolute inset-0 animate-pulse bg-[radial-gradient(ellipse_at_56%_68%,rgba(255,154,71,0.22),transparent_15%)]" />
    </div>
  );
}

export default function ImmersiveForestScene() {
  const reducedMotion = typeof window === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 700px)').matches;

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#0b1712]">
      <img
        src="/forest-background.jpg"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover object-center"
        onError={(event) => { event.currentTarget.style.display = 'none'; }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(238,164,90,0.12)_0%,transparent_42%,rgba(5,14,10,0.18)_100%),radial-gradient(ellipse_at_80%_56%,rgba(255,103,24,0.32),transparent_19%),radial-gradient(ellipse_at_76%_65%,rgba(255,183,71,0.16),transparent_28%)]" />
      <div className="pointer-events-none absolute right-[7%] top-[55%] h-56 w-[42%] max-w-[440px] min-w-[210px] -translate-y-1/2" aria-hidden="true">
        <div className="absolute inset-x-[8%] bottom-[8%] h-[34%] rounded-[50%] bg-[#ff5a16]/45 blur-2xl" />
        <div className="absolute inset-x-[15%] bottom-[13%] h-[26%] rounded-[50%] border border-[#ffad4c]/80 shadow-[0_0_12px_3px_rgba(255,110,24,0.75),inset_0_0_15px_rgba(255,110,24,0.55)]" />
        <div className="absolute bottom-[16%] left-[34%] h-[33%] w-[13%] animate-pulse bg-gradient-to-t from-[#ff4a08] via-[#ff9a22] to-[#ffe08a] [clip-path:polygon(50%_0,65%_23%,100%_48%,78%_100%,17%_100%,0_57%,36%_38%)]" />
        <div className="absolute bottom-[14%] left-[47%] h-[46%] w-[16%] animate-pulse bg-gradient-to-t from-[#ff4a08] via-[#ff8a1d] to-[#fff0a6] [clip-path:polygon(50%_0,69%_27%,100%_54%,81%_100%,13%_100%,0_62%,33%_43%)] [animation-delay:350ms]" />
        <div className="absolute bottom-[16%] left-[63%] h-[34%] w-[12%] animate-pulse bg-gradient-to-t from-[#ff4a08] via-[#ff9a22] to-[#ffe08a] [clip-path:polygon(50%_0,65%_23%,100%_48%,78%_100%,17%_100%,0_57%,36%_38%)] [animation-delay:700ms]" />
        <div className="absolute bottom-[54%] left-[45%] h-[36%] w-[27%] rounded-[50%] bg-[radial-gradient(ellipse,rgba(79,78,67,0.36),rgba(42,52,48,0.2)_48%,transparent_72%)] blur-xl" />
      </div>
      <Canvas
        className="hidden"
        dpr={mobile ? [1, 1.15] : [1, 1.5]}
        frameloop={reducedMotion ? 'demand' : 'always'}
        gl={{ antialias: !mobile, alpha: true, powerPreference: 'low-power' }}
        camera={{ position: [0, 2.2, 12.5], fov: mobile ? 56 : 48 }}
        fallback={<ForestFallback />}
        onCreated={({ gl }) => {
          gl.setClearColor(new THREE.Color('#000000'), 0);
          gl.domElement.addEventListener('webglcontextlost', (event) => {
            event.preventDefault();
            gl.domElement.parentElement?.classList.add('forest-webgl-lost');
          });
        }}
      >
        <fog attach="fog" args={['#0b1712', 12, 39]} />
        <hemisphereLight args={['#b7d6c1', '#102018', 1.05]} />
        <ambientLight intensity={0.3} color="#d2dfc1" />
        <directionalLight position={[-7, 10, -9]} intensity={1.3} color="#d3dfb5" />
        <pointLight position={[0, 1.2, -2]} intensity={2.1} distance={12} color="#ff843a" />
        <Scene reducedMotion={reducedMotion} mobile={mobile} />
      </Canvas>
      <div className="forest-webgl-fallback pointer-events-none absolute inset-0 hidden">
        <ForestFallback />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(5,14,10,0.08)_0%,rgba(6,15,11,0.025)_40%,transparent_77%),linear-gradient(0deg,rgba(5,13,10,0.12)_0%,transparent_38%,rgba(7,14,11,0.04)_100%)]" />
    </div>
  );
}
