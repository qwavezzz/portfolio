import { withBase } from '../../lib/paths';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { useEffect, useRef } from 'react';
import { ACESFilmicToneMapping, Mesh, PerspectiveCamera, Vector3 } from 'three';
import layout from '../../../assets-source/workstation-metadata.json';
import { flight, onFlightChange, placeDesktop } from '../../lib/monitor-flight';

function Scene({ active, onReady }: { active: boolean; onReady: () => void }) {
  const { scene } = useGLTF(withBase('/models/workstation.glb'));
  const { camera, invalidate, size, gl } = useThree();
  const first = useRef(true);
  const pointer = useRef({ x: 0, y: 0 });
  const target = useRef(new Vector3());
  const aim = useRef(new Vector3());
  const screenCenter = new Vector3().fromArray(layout.screen.center);
  useEffect(() => onFlightChange(invalidate), [invalidate]);
  useEffect(() => {
    scene.traverse(object => {
      if (!(object instanceof Mesh)) return;
      const display = ['Screen', 'City_Backdrop', 'Portrait_Display'].includes(object.name);
      object.castShadow = !display;
      object.receiveShadow = !display;
      if (display) for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        material.toneMapped = false;
        material.needsUpdate = true;
      }
    });
    gl.shadowMap.needsUpdate = true;
    invalidate();
  }, [scene, invalidate, gl]);

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
    if (!hero) return;
    const progress = flight.enabled ? flight.progress : 0;
    const align = Math.min(1, progress / 0.76);
    const ease = align * align * (3 - 2 * align);
    const perspective = camera as PerspectiveCamera;
    const start = size.width < 768 ? layout.mobile_camera : layout.camera;
    const startFov = start.vertical_fov_degrees;
    perspective.fov = startFov + (38 - startFov) * ease;
    perspective.updateProjectionMatrix();

    // Move into a front-on view before the last stretch into the glass.
    const fitDistance = Math.min(layout.screen.height / 2, layout.screen.width / (2 * (size.width / size.height))) / Math.tan(38 * Math.PI / 360);
    const endDistance = fitDistance * 0.86;
    const distanceEase = progress * progress * (3 - 2 * progress);
    target.current.set(start.position[0] + (screenCenter.x - start.position[0]) * ease, start.position[1] + (screenCenter.y - start.position[1]) * ease, start.position[2] + (screenCenter.z + endDistance - start.position[2]) * distanceEase);
    const parallax = (1 - ease) * (1 - ease);
    target.current.x += pointer.current.x * 0.24 * parallax;
    target.current.y -= pointer.current.y * 0.15 * parallax;
    camera.position.copy(target.current);
    aim.current.fromArray(start.target).lerp(screenCenter, ease);
    camera.lookAt(aim.current);
    camera.updateMatrixWorld();
    if (flight.enabled) {
      const left = screenCenter.x - layout.screen.width / 2, right = screenCenter.x + layout.screen.width / 2;
      const top = screenCenter.y + layout.screen.height / 2, bottom = screenCenter.y - layout.screen.height / 2;
      const corners = [[left, top], [right, top], [right, bottom], [left, bottom]].map(([x, y]) => {
        const point = new Vector3(x, y, screenCenter.z + 0.002).project(camera);
        return { x: (point.x + 1) * size.width / 2, y: (1 - point.y) * size.height / 2 };
      });
      placeDesktop(corners);
    }
    if (first.current) { first.current = false; requestAnimationFrame(onReady); }
  });

  return <>
    <ambientLight intensity={0.32} />
    <hemisphereLight args={['#b3c5e4', '#10131b', 0.9]} />
    <directionalLight position={[-4, 7, 5]} color="#bdcbe8" intensity={2.5} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-9} shadow-camera-right={9} shadow-camera-top={9} shadow-camera-bottom={-9} shadow-camera-near={0.5} shadow-camera-far={32} shadow-bias={-0.0002} shadow-normalBias={0.025} />
    <directionalLight position={[4, 5, -2]} color="#789bda" intensity={1.7} />
    <pointLight position={[-0.54, 1.9, 0.3]} color="#c4d7ed" intensity={4} distance={4} decay={2} />
    <primitive object={scene} dispose={null} />
  </>;
}

export default function Workstation({ active, onReady, onError }: { active: boolean; onReady: () => void; onError: () => void }) {
  return <Canvas shadows frameloop={active ? 'demand' : 'never'} dpr={[1, 1.5]} camera={{ position: [5.4, 3.5, 9.4], fov: 42, near: 0.05, far: 80 }} gl={{ alpha: true, antialias: true, powerPreference: 'low-power', toneMapping: ACESFilmicToneMapping, toneMappingExposure: 1.1 }} onCreated={({ gl }) => { gl.shadowMap.autoUpdate = false; gl.domElement.addEventListener('webglcontextlost', onError, { once: true }); }}><Scene active={active} onReady={onReady} /></Canvas>;
}
