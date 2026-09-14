import { Component, lazy, Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ensureMonitorFlight, stopMonitorFlight } from '../../lib/monitor-flight';

const Workstation = lazy(() => import('./Workstation'));

class SceneBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onError(); }
  render() { return this.state.failed ? null : this.props.children; }
}

export default function HeroExperience() {
  const container = useRef<HTMLDivElement>(null);
  const [allowed, setAllowed] = useState(false);
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const handleReady = useCallback(() => setReady(true), []);
  const handleError = useCallback(() => setFailed(true), []);

  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const preference = () => {
      setReduced(media.matches);
      let disabled = false;
      try { disabled = localStorage.getItem('qwave-static') === 'true'; } catch { /* Private storage can be unavailable. */ }
      setAllowed(!media.matches && !disabled);
    };
    preference();
    setInitialized(true);
    media.addEventListener('change', preference);
    let inViewport = false;
    const update = () => setVisible(inViewport && !document.hidden);
    const observer = new IntersectionObserver(([entry]) => { inViewport = entry.isIntersecting; update(); }, { threshold: 0.05 });
    if (container.current) observer.observe(container.current);
    document.addEventListener('visibilitychange', update);
    return () => { observer.disconnect(); media.removeEventListener('change', preference); document.removeEventListener('visibilitychange', update); };
  }, []);

  useEffect(() => {
    const poster = container.current?.closest('.hero')?.querySelector<HTMLElement>('.scene-poster');
    if (poster) poster.style.opacity = allowed && ready && !failed ? '0' : '1';
    return () => { if (poster) poster.style.opacity = '1'; };
  }, [allowed, ready, failed]);

  useEffect(() => {
    if (!initialized) return;
    if (allowed && !failed && !reduced) ensureMonitorFlight();
    else stopMonitorFlight();
  }, [initialized, allowed, failed, reduced]);

  function toggle() {
    const next = !allowed;
    setAllowed(next);
    setReady(false);
    try { localStorage.setItem('qwave-static', String(!next)); } catch { /* Selection still works for this visit. */ }
  }

  return <div className="hero-live" ref={container}>
    <div className="hero-canvas" aria-hidden="true" data-scene-state={failed ? 'fallback' : ready && allowed ? 'ready' : 'poster'} style={{ opacity: ready && allowed && !failed ? 1 : 0 }}>
      {allowed && !failed && <SceneBoundary onError={handleError}><Suspense fallback={null}><Workstation active={visible || !ready} onReady={handleReady} onError={handleError} /></Suspense></SceneBoundary>}
    </div>
    {initialized && !reduced && !failed && <button className="scene-toggle mono" onClick={toggle} aria-pressed={allowed} aria-label={allowed ? 'Отключить 3D и оставить изображение' : 'Включить 3D'}><span className={allowed ? 'toggle-light is-on' : 'toggle-light'} aria-hidden="true" />{allowed ? '3D включено' : 'Включить 3D'}</button>}
  </div>;
}
