'use client';

import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, Line } from '@react-three/drei';
import * as THREE from 'three';

const NAV_NODES = [
  { id: 'account', label: 'ACCOUNT',  central: true, scale: 0.42, spin: 0.001, base: '#2a1206', accent: '#ff5a1f', rim: '#ff8a45' },
  { id: 'buy',     label: 'BUY',      scale: 0.28, orbitR: 2.4,  orbitSpeed: 0.13, orbitPhase: 0.0, orbitTiltX: 0.4,  orbitTiltY: 0.2,  base: '#0a2a33', accent: '#2ad0e0', rim: '#7fe5f0' },
  { id: 'install', label: 'SETUP',    scale: 0.27, orbitR: 3.0,  orbitSpeed: 0.07, orbitPhase: 2.1, orbitTiltX: 0.3,  orbitTiltY: 1.2,  base: '#1f1638', accent: '#8a5aff', rim: '#b89aff' },
  { id: 'faq',     label: 'FAQ',      scale: 0.26, orbitR: 2.5,  orbitSpeed: 0.11, orbitPhase: 3.1, orbitTiltX: 0.9,  orbitTiltY: -0.5, base: '#0c2a22', accent: '#1fd89a', rim: '#7fefc8' },
  { id: 'support', label: 'SUPPORT',  scale: 0.27, orbitR: 2.9,  orbitSpeed: 0.08, orbitPhase: 4.2, orbitTiltX: -0.6, orbitTiltY: 0.8,  base: '#161a3a', accent: '#5a7aff', rim: '#98aaff', url: 'https://t.me/ApexSupport_robot' },
  { id: 'openbot', label: 'OPEN BOT', scale: 0.26, orbitR: 2.65, orbitSpeed: 0.10, orbitPhase: 5.0, orbitTiltX: 0.5,  orbitTiltY: -1.0, base: '#0d2438', accent: '#2aaaff', rim: '#8acaff', url: 'https://t.me/ApexNoderobot' },
];

const vertexShader = `
  varying vec3 vN;
  varying vec3 vV;
  varying vec3 vPos;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vN = normalize(mat3(modelMatrix) * normal);
    vV = normalize(cameraPosition - wp.xyz);
    vPos = position;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const fragmentShader = `
  uniform vec3 uBase;
  uniform vec3 uAccent;
  uniform vec3 uRim;
  uniform float uRimPower;
  uniform float uRimStrength;
  uniform float uTime;
  varying vec3 vN;
  varying vec3 vV;
  varying vec3 vPos;
  float hash(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,37.719)))*43758.5453); }
  float noise(vec3 p){
    vec3 i = floor(p); vec3 f = fract(p); f = f*f*(3.0-2.0*f);
    return mix(mix(mix(hash(i+vec3(0,0,0)),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
               mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y), f.z);
  }
  void main() {
    vec3 n = normalize(vN);
    float cloud = noise(vPos * 3.0 + vec3(uTime * 0.04)) + noise(vPos * 6.5) * 0.5;
    cloud = clamp(cloud, 0.0, 1.0);
    vec3 surf = mix(uBase, uAccent, smoothstep(0.42, 0.92, cloud));
    vec3 lightDir = normalize(vec3(0.5, 0.7, 0.6));
    surf += surf * max(dot(n, lightDir), 0.0) * 0.45;
    float f = pow(1.0 - max(dot(n, normalize(vV)), 0.0), uRimPower) * uRimStrength;
    gl_FragColor = vec4(surf + uRim * f, 1.0);
  }
`;

function Orb({ node, onSelect, hasDragged }) {
  const groupRef = useRef();
  const meshRef = useRef();
  const lineRef = useRef();
  const pulseRef = useRef();
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const euler = useMemo(() => new THREE.Euler(node.orbitTiltX || 0, node.orbitTiltY || 0, 0), [node]);
  const uniforms = useMemo(() => ({
    uBase:        { value: new THREE.Color(node.base) },
    uAccent:      { value: new THREE.Color(node.accent) },
    uRim:         { value: new THREE.Color(node.rim) },
    uRimPower:    { value: 2.3 },
    uRimStrength: { value: node.central ? 1.6 : 1.9 },
    uTime:        { value: 0 },
  }), [node]);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    uniforms.uTime.value = t;

    if (node.central) {
      if (meshRef.current) {
        meshRef.current.rotation.y += node.spin;
        meshRef.current.scale.setScalar(node.scale * (1 + Math.sin(t * 1.2) * 0.02));
      }
      return;
    }

    const angle = node.orbitPhase + t * node.orbitSpeed;
    tmp.set(Math.cos(angle) * node.orbitR, 0, Math.sin(angle) * node.orbitR).applyEuler(euler);
    if (groupRef.current) groupRef.current.position.copy(tmp);
    if (meshRef.current) meshRef.current.scale.setScalar(node.scale * (1 + Math.sin(t * 1.2 + node.orbitPhase) * 0.02));
    if (lineRef.current) lineRef.current.geometry.setPositions([0, 0, 0, tmp.x, tmp.y, tmp.z]);
    if (pulseRef.current) {
      const pt = (t * 0.3 + node.orbitPhase * 0.2) % 1;
      pulseRef.current.position.set(tmp.x * pt, tmp.y * pt, tmp.z * pt);
      pulseRef.current.material.opacity = Math.sin(pt * Math.PI);
    }
  });

  const handleClick = (e) => {
    e.stopPropagation();
    if (hasDragged.current) return;
    if (node.url) window.open(node.url, '_blank');
    else onSelect?.(node.id);
  };

  return (
    <>
      {!node.central && (
        <>
          <Line ref={lineRef} points={[[0, 0, 0], [node.orbitR, 0, 0]]} color="#7e94b6" lineWidth={4} transparent opacity={0.45} />
          <mesh ref={pulseRef}>
            <sphereGeometry args={[0.05, 8, 8]} />
            <meshBasicMaterial color="#aed4ff" transparent depthWrite={false} blending={THREE.AdditiveBlending} />
          </mesh>
        </>
      )}

      <group ref={groupRef} position={[0, 0, 0]}>
        <mesh scale={node.scale * (node.central ? 2.7 : 2.4)}>
          <sphereGeometry args={[1, 32, 32]} />
          <meshBasicMaterial color={node.accent} transparent opacity={node.central ? 0.09 : 0.07} side={THREE.BackSide} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>

        <mesh
          ref={meshRef}
          onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
          onPointerOut={() => { document.body.style.cursor = 'grab'; }}
          onClick={handleClick}
        >
          <sphereGeometry args={[1, 128, 128]} />
          <shaderMaterial vertexShader={vertexShader} fragmentShader={fragmentShader} uniforms={uniforms} />
        </mesh>

        <Html center distanceFactor={11} position={[0, node.scale * 2.4, 0]} style={{ pointerEvents: 'none', userSelect: 'none' }}>
          <div style={{
            color: node.central ? '#fff1e6' : '#c2cedd',
            fontWeight: node.central ? 500 : 400,
            fontSize: node.central ? '15px' : '12px',
            letterSpacing: '0.32em',
            whiteSpace: 'nowrap',
            fontFamily: "'Jost', sans-serif",
            textShadow: '0 0 16px rgba(0,0,0,0.95)',
          }}>
            {node.label}
          </div>
        </Html>
      </group>
    </>
  );
}

function StarField() {
  const stars = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 600; i++) {
      const phi = Math.acos(2 * Math.random() - 1);
      const theta = 2 * Math.PI * Math.random();
      const r = 8 + Math.random() * 16;
      const big = Math.random() > 0.93;
      arr.push({
        pos: [r * Math.sin(phi) * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi)],
        size: big ? 0.04 + Math.random() * 0.04 : 0.006 + Math.random() * 0.018,
        opacity: big ? 0.7 + Math.random() * 0.3 : 0.15 + Math.random() * 0.5,
      });
    }
    return arr;
  }, []);
  return (
    <>
      {stars.map((s, i) => (
        <mesh key={i} position={s.pos}>
          <sphereGeometry args={[s.size, 6, 6]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={s.opacity} />
        </mesh>
      ))}
    </>
  );
}

function Nebula() {
  const blobs = [
    { pos: [-7, 4, -9],  color: '#1a2c5a', scale: 8 },
    { pos: [8, -5, -11], color: '#3a1a4a', scale: 10 },
    { pos: [2, 6, -13],  color: '#0a3a4a', scale: 9 },
    { pos: [-5, -6, -10],color: '#2a1838', scale: 7 },
  ];
  return (
    <>
      {blobs.map((b, i) => (
        <mesh key={i} position={b.pos} scale={b.scale}>
          <sphereGeometry args={[1, 16, 16]} />
          <meshBasicMaterial color={b.color} transparent opacity={0.13} side={THREE.BackSide} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      ))}
    </>
  );
}

function DragRig({ children, dragging, hasDragged }) {
  const groupRef = useRef();
  const vel = useRef({ x: 0, y: 0 });
  const last = useRef({ x: 0, y: 0 });

  useEffect(() => {
    document.body.style.cursor = 'grab';
    const onDown = (e) => {
      dragging.current = true; hasDragged.current = false;
      last.current = { x: e.clientX, y: e.clientY }; vel.current = { x: 0, y: 0 };
      document.body.style.cursor = 'grabbing';
    };
    const onMove = (e) => {
      if (!dragging.current || !groupRef.current) return;
      const dx = e.clientX - last.current.x, dy = e.clientY - last.current.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) hasDragged.current = true;
      last.current = { x: e.clientX, y: e.clientY };
      vel.current.y = dx * 0.006; vel.current.x = dy * 0.006;
      groupRef.current.rotation.y += vel.current.y;
      groupRef.current.rotation.x += vel.current.x;
    };
    const onUp = () => { dragging.current = false; document.body.style.cursor = 'grab'; };
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, []);

  useFrame(() => {
    const g = groupRef.current;
    if (!g || dragging.current) return;
    g.rotation.y += vel.current.y + 0.0007;
    g.rotation.x += vel.current.x;
    vel.current.x *= 0.95; vel.current.y *= 0.95;
  });

  return <group ref={groupRef}>{children}</group>;
}

export default function NodeNetwork({ onSelectNode }) {
  const dragging = useRef(false);
  const hasDragged = useRef(false);
  return (
    <Canvas camera={{ position: [0, 0, 11], fov: 38 }} dpr={[1, 2]}>
      <color attach="background" args={['#040406']} />
      <fog attach="fog" args={['#040406', 12, 30]} />
      <Nebula />
      <DragRig dragging={dragging} hasDragged={hasDragged}>
        <StarField />
        {NAV_NODES.map((node) => (
          <Orb key={node.id} node={node} onSelect={onSelectNode} hasDragged={hasDragged} />
        ))}
      </DragRig>
    </Canvas>
  );
}