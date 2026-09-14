import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

export type Point = { x: number; y: number };
export const flight = { enabled: false, progress: 0 };
const listeners = new Set<() => void>();
let project: ((corners: Point[]) => void) | undefined;
let currentHero: HTMLElement | undefined;
let cleanupFlight: ((preservePosition?: boolean) => void) | undefined;

// Layout belongs to the page lifecycle, not to the asynchronously loaded GLB.
// Astro must see the full journey before it restores a history entry's scroll.
export function ensureMonitorFlight() {
  const hero = document.querySelector<HTMLElement>('.hero');
  let disabled = matchMedia('(prefers-reduced-motion: reduce)').matches;
  try { disabled ||= localStorage.getItem('qwave-static') === 'true'; } catch { /* Storage is optional. */ }
  if (!hero || disabled) { stopMonitorFlight(); return; }
  if (currentHero === hero) return;
  stopMonitorFlight(false);
  currentHero = hero;
  cleanupFlight = createMonitorFlight(hero);
}

export function stopMonitorFlight(preservePosition = true) {
  cleanupFlight?.(preservePosition);
  cleanupFlight = undefined;
  currentHero = undefined;
}

export function refreshMonitorFlight() { ScrollTrigger.update(); }

export function onFlightChange(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export function placeDesktop(corners: Point[]) { project?.(corners); }
const clamp = (value: number) => Math.max(0, Math.min(1, value));

// Project the existing DOM rectangle onto the four actual monitor corners.
// The coefficients are a projective homography, not a hand-tuned CSS skew.
function matrix(corners: Point[], width: number, height: number) {
  const [p0, p1, p2, p3] = corners;
  const dx1 = p1.x - p2.x, dx2 = p3.x - p2.x;
  const dy1 = p1.y - p2.y, dy2 = p3.y - p2.y;
  const sx = p0.x - p1.x + p2.x - p3.x;
  const sy = p0.y - p1.y + p2.y - p3.y;
  const denominator = dx1 * dy2 - dx2 * dy1;
  const g = Math.abs(denominator) > 0.00001 ? (sx * dy2 - dx2 * sy) / denominator : 0;
  const h = Math.abs(denominator) > 0.00001 ? (dx1 * sy - sx * dy1) / denominator : 0;
  return `matrix3d(${[
    (p1.x - p0.x + g * p1.x) / width, (p1.y - p0.y + g * p1.y) / width, 0, g / width,
    (p3.x - p0.x + h * p3.x) / height, (p3.y - p0.y + h * p3.y) / height, 0, h / height,
    0, 0, 1, 0, p0.x, p0.y, 0, 1,
  ].join(',')})`;
}

export function createMonitorFlight(hero: HTMLElement) {
  const journey = hero.closest<HTMLElement>('.monitor-journey');
  const slot = document.querySelector<HTMLElement>('.desktop-slot');
  const desktopElement = document.getElementById('desktop');
  if (!journey || !slot || !desktopElement) return () => {};
  const desktop = desktopElement;
  gsap.registerPlugin(ScrollTrigger);
  const abort = new AbortController();
  const originalStyle = desktop.getAttribute('style');
  const scrollStyles = [document.documentElement, document.body].map(element => ({
    element, value: element.style.getPropertyValue('scroll-behavior'),
  }));
  let geometry: Point[] | undefined;
  let previousInteractive = true;
  let trigger: ScrollTrigger;

  flight.enabled = true;
  document.body.classList.add('has-monitor-flight');
  let viewportHeight = hero.clientHeight;
  let viewportWidth = hero.clientWidth;
  const distance = () => Math.round(hero.clientHeight * 1.8);
  journey.style.setProperty('--flight-travel', `${distance()}px`);

  function updateProjection() {
    if (flight.progress >= 1) {
      desktop.style.transform = '';
      return;
    }
    if (!geometry || !desktop.clientWidth || !hero.clientHeight) return;
    const width = hero.clientWidth, height = hero.clientHeight;
    // Once the bezel has left the viewport, the page resolves to viewport
    // aspect without an extra scroll, a duplicate DOM tree, or a cross-page cut.
    const mix = clamp((flight.progress - 0.86) / 0.14);
    const ease = mix * mix * (3 - 2 * mix);
    const viewport = [{ x: 0, y: 0 }, { x: width, y: 0 }, { x: width, y: height }, { x: 0, y: height }];
    const corners = geometry.map((corner, i) => ({
      x: corner.x + (viewport[i].x - corner.x) * ease,
      y: corner.y + (viewport[i].y - corner.y) * ease,
    }));
    desktop.style.transform = matrix(corners, desktop.clientWidth, height);
  }

  function paint(progress: number) {
    // Resize may emit a scroll/GSAP refresh before our resize callback. Keep
    // the old progress until the new travel distance and scroll agree.
    if (hero.clientHeight !== viewportHeight) return;
    flight.progress = clamp(progress);
    hero.style.setProperty('--flight-progress', String(flight.progress));
    const interactive = flight.progress >= 1;
    hero.inert = flight.progress >= 0.2;
    document.body.classList.toggle('monitor-entered', interactive);
    if (previousInteractive !== interactive) {
      // The live screen shares the sticky scene's coordinate system and
      // stacking order. At exit the very same node returns to document flow.
      (interactive ? slot! : hero).append(desktop);
      desktop.inert = !interactive;
      desktop.setAttribute('aria-hidden', String(!interactive));
      previousInteractive = interactive;
    }
    desktop.style.opacity = geometry || interactive ? '1' : '0';
    if (interactive) desktop.style.transform = '';
    // Camera, screen corners and WebGL render are advanced together by the
    // subscriber. Never project yesterday's corners from a scroll callback.
    listeners.forEach(listener => listener());
  }

  project = corners => { geometry = corners; updateProjection(); desktop.style.opacity = '1'; };
  trigger = ScrollTrigger.create({
    trigger: journey,
    start: 'top top',
    end: () => `+=${distance()}`,
    snap: {
      // Finish entering once the monitor fills most of the view. Scrolling
      // back remains free, as does scrolling inside/below the desktop.
      snapTo: (value: number, self?: ScrollTrigger) => self && self.direction > 0 && value >= 0.72 ? 1 : value,
      inertia: false,
      delay: 0.18,
      duration: { min: 0.2, max: 0.45 },
      ease: 'power2.out',
    },
    onUpdate: self => paint(self.progress),
    onRefresh: self => paint(self.progress),
  });
  paint(trigger.progress);

  function skip() {
    window.scrollTo({ top: slot!.getBoundingClientRect().top + window.scrollY, behavior: 'instant' });
    ScrollTrigger.update();
    paint(1);
  }
  window.addEventListener('qwave:skip-intro', skip, { signal: abort.signal });
  window.addEventListener('resize', () => {
    // In-app browser chrome can emit resize without changing the stable
    // scene viewport. Refreshing and scrolling on each event fights touch.
    if (hero.clientHeight === viewportHeight && hero.clientWidth === viewportWidth) return;
    trigger.getTween(true)?.kill();
    const progress = flight.progress;
    const start = journey!.getBoundingClientRect().top + window.scrollY;
    const previousDistance = parseFloat(journey!.style.getPropertyValue('--flight-travel'));
    const after = Math.max(0, window.scrollY - start - previousDistance);
    viewportHeight = hero.clientHeight;
    viewportWidth = hero.clientWidth;
    journey!.style.setProperty('--flight-travel', `${distance()}px`);
    ScrollTrigger.refresh();
    if (window.scrollY >= start) {
      trigger.scroll(start + distance() * progress + after);
      ScrollTrigger.update();
      paint(progress);
    }
  }, { signal: abort.signal });
  const entryFrame = requestAnimationFrame(() => {
    ScrollTrigger.refresh();
  });

  return (preservePosition = true) => {
    const enteredJourney = flight.progress > 0;
    const desktopOffset = Math.max(0, -slot.getBoundingClientRect().top);
    cancelAnimationFrame(entryFrame);
    abort.abort();
    trigger.kill();
    if (desktop.parentElement !== slot) slot.append(desktop);
    project = undefined;
    flight.enabled = false;
    flight.progress = 0;
    document.body.classList.remove('has-monitor-flight', 'monitor-entered');
    journey.style.removeProperty('--flight-travel');
    hero.style.removeProperty('--flight-progress');
    hero.inert = false;
    desktop.inert = false;
    desktop.removeAttribute('aria-hidden');
    if (originalStyle === null) desktop.removeAttribute('style');
    else desktop.setAttribute('style', originalStyle);
    for (const { element, value } of scrollStyles) {
      if (value) element.style.setProperty('scroll-behavior', value);
      else element.style.removeProperty('scroll-behavior');
    }
    // Losing WebGL removes the tall journey. Keep the visitor at the usable
    // desktop instead of letting scroll clamping drop them at the footer.
    // A detached hero belongs to a route that Astro has already replaced.
    if (preservePosition && hero.isConnected && enteredJourney) {
      window.scrollTo({ top: slot.getBoundingClientRect().top + window.scrollY + desktopOffset, behavior: 'instant' });
    }
    listeners.forEach(listener => listener());
  };
}
