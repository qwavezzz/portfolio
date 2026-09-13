import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { useEffect, useRef } from 'react';
import { ACESFilmicToneMapping, PerspectiveCamera, Vector3 } from 'three';
import { flight, onFlightChange, placeDesktop } from '../../lib/monitor-flight';

function Scene({ active, onReady }: { active: boolean; onReady: () => void }) {
  const { scene } = useGLTF('/models/workstation.glb');
  const { camera, invalidate, size, gl } = useThree();
  const first = useRef(true);
  const pointer = useRef({ x: 0, y: 0 });
  const target = useRef(new Vector3());
  const aim = useRef(new Vector3());
  const screenCenter = new Vector3(-0.54, 1.98, -0.004);
  useEffect(() => onFlightChange(invalidate), [invalidate]);

  useEffect(() => {
    const controller = new AbortController();
    const move = (event: PointerEvent) => {
      if (!active || (flight.enabled && flight.progress >= 1) || event.pointerType !== 'mouse') return;
      pointer.current = { x: event.clientX / window.innerWidth - 0.5, y: event.clientY / window.innerHeight - 0.5 };
      invalidate();
    };
    window.addEventListener('pointermove', move, { passive: true, signal: controller.signal });
    invalidate();
    return () => controller.abort();
  }, [active, invalidate]);

  useFrame(() => {
    if (!active) return;
    const hero = gl.domElement.closest<HTMLElement>('.hero');
    const frame = hero?.querySelector<HTMLElement>('.hero-scene');
    if (!hero || !frame) return;
    const heroRect = hero.getBoundingClientRect();
    const frameRect = frame.getBoundingClientRect();
    const progress = flight.enabled ? flight.progress : 0;
    const align = Math.min(1, progress / 0.76);
    const ease = align * align * (3 - 2 * align);
    const perspective = camera as PerspectiveCamera;
    const startFov = 2 * Math.atan(Math.tan(29.9902 * Math.PI / 360) * Math.max(1, 1.6 / (frameRect.width / frameRect.height))) * 180 / Math.PI;
    perspective.fov = startFov + (38 - startFov) * ease;
    const frameWidth = frameRect.width + (size.width - frameRect.width) * ease;
    const frameHeight = frameRect.height + (size.height - frameRect.height) * ease;
    perspective.setViewOffset(frameWidth, frameHeight, -(frameRect.left - heroRect.left) * (1 - ease), -(frameRect.top - heroRect.top) * (1 - ease), size.width, size.height);
    perspective.updateProjectionMatrix();

    // Move into a front-on view before the last stretch into the glass.
    const fitDistance = Math.min(2.25 / 2, 4.02 / (2 * (size.width / size.height))) / Math.tan(38 * Math.PI / 360);
    const endDistance = fitDistance * 0.86;
    const distanceEase = progress * progress * (3 - 2 * progress);
    target.current.set(5 + (screenCenter.x - 5) * ease, 3.8 + (screenCenter.y - 3.8) * ease, 7 + (screenCenter.z + endDistance - 7) * distanceEase);
    const parallax = (1 - ease) * (1 - ease);
    target.current.x += pointer.current.x * 0.24 * parallax;
    target.current.y -= pointer.current.y * 0.15 * parallax;
    camera.position.copy(target.current);
    aim.current.set(0, 1.5, 0).lerp(screenCenter, ease);
    camera.lookAt(aim.current);
    camera.updateMatrixWorld();
    if (flight.enabled) {
      const corners = [[-2.55, 3.105], [1.47, 3.105], [1.47, 0.855], [-2.55, 0.855]].map(([x, y]) => {
        const point = new Vector3(x, y, screenCenter.z + 0.002).project(camera);
        return { x: (point.x + 1) * size.width / 2, y: (1 - point.y) * size.height / 2 };
      });
      placeDesktop(corners);
    }
    if (first.current) { first.current = false; requestAnimationFrame(onReady); }
  });

  return <>
    <ambientLight intensity={0.65} />
    <hemisphereLight args={['#f2f2ee', '#181818', 1.2]} />
    <directionalLight position={[-3, 7, 5]} intensity={5.5} />
    <directionalLight position={[5, 4, -2]} intensity={3.5} />
    <primitive object={scene} dispose={null} />
  </>;
}

export default function Workstation({ active, onReady, onError }: { active: boolean; onReady: () => void; onError: () => void }) {
  return <Canvas frameloop={active ? 'demand' : 'never'} dpr={[1, 1.5]} camera={{ position: [5, 3.8, 7], fov: 37, near: 0.05, far: 80 }} gl={{ alpha: true, antialias: true, powerPreference: 'low-power', toneMapping: ACESFilmicToneMapping, toneMappingExposure: 1.1 }} onCreated={({ gl }) => { gl.domElement.addEventListener('webglcontextlost', onError, { once: true }); }}><Scene active={active} onReady={onReady} /></Canvas>;
}
