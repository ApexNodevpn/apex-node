"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

function generateNodes(count: number) {
  const nodes: { pos: [number, number, number]; pulseOffset: number }[] = [];
  for (let i = 0; i < count; i++) {
    const phi = Math.acos(-1 + (2 * i) / count);
    const theta = Math.sqrt(count * Math.PI) * phi;
    const radius = 2.5;
    nodes.push({
      pos: [
        radius * Math.cos(theta) * Math.sin(phi),
        radius * Math.sin(theta) * Math.sin(phi),
        radius * Math.cos(phi),
      ],
      pulseOffset: Math.random() * Math.PI * 2,
    });
  }
  return nodes;
}

function Node({ pos, pulseOffset }: { pos: [number, number, number]; pulseOffset: number }) {
  const mesh = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (mesh.current) {
      const t = state.clock.elapsedTime * 1.5 + pulseOffset;
      const scale = 1 + Math.sin(t) * 0.3;
      mesh.current.scale.set(scale, scale, scale);
    }
  });
  return (
    <mesh ref={mesh} position={pos}>
      <sphereGeometry args={[0.06, 16, 16]} />
      <meshBasicMaterial color="#22d3ee" />
    </mesh>
  );
}

function Connections({ nodes }: { nodes: { pos: [number, number, number] }[] }) {
  const lines = useMemo(() => {
    const arr: [number, number][] = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i].pos;
        const b = nodes[j].pos;
        const dist = Math.sqrt(
          (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2
        );
        if (dist < 2.2) arr.push([i, j]);
      }
    }
    return arr;
  }, [nodes]);

  return (
    <>
      {lines.map(([i, j], idx) => {
        const a = nodes[i].pos;
        const b = nodes[j].pos;
        const points = [new THREE.Vector3(...a), new THREE.Vector3(...b)];
        const geom = new THREE.BufferGeometry().setFromPoints(points);
        return (
          <line key={idx}>
            <primitive object={geom} attach="geometry" />
            <lineBasicMaterial color="#1e40af" transparent opacity={0.5} />
          </line>
        );
      })}
    </>
  );
}

function NetworkGroup() {
  const group = useRef<THREE.Group>(null);
  const nodes = useMemo(() => generateNodes(40), []);
  useFrame(() => {
    if (group.current) {
      group.current.rotation.y += 0.0015;
      group.current.rotation.x += 0.0005;
    }
  });
  return (
    <group ref={group}>
      <Connections nodes={nodes} />
      {nodes.map((n, i) => (
        <Node key={i} pos={n.pos} pulseOffset={n.pulseOffset} />
      ))}
    </group>
  );
}

export default function NodeNetwork() {
  return (
    <div className="w-full h-full">
      <Canvas camera={{ position: [0, 0, 6], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <NetworkGroup />
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate={false}
          rotateSpeed={0.5}
        />
      </Canvas>
    </div>
  );
}
