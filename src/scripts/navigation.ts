import type { TransitionBeforePreparationEvent, TransitionBeforeSwapEvent } from 'astro:transitions/client';
import { navigate } from 'astro:transitions/client';
import { withBase } from '../lib/paths';
import { ensureMonitorFlight, refreshMonitorFlight, stopMonitorFlight } from '../lib/monitor-flight';

let firstLoad = true;
let isHistoryNavigation = false;
let explicitDesktopReturn = false;
let shortcutId: string | null = null;
let sourceDesktopOffset = 0;
let desktopEntry = false;

ensureMonitorFlight();

document.addEventListener('astro:before-swap', event => {
  const navigation = event as TransitionBeforeSwapEvent;
  const swap = navigation.swap;
  navigation.swap = () => {
    stopMonitorFlight(false);
    swap();
    // This runs before Astro restores scrollY, including browser Back/Forward.
    // A late GLB no longer changes the document height under the visitor.
    ensureMonitorFlight();
  };
});
document.addEventListener('astro:after-swap', refreshMonitorFlight);
window.addEventListener('pageshow', refreshMonitorFlight);

document.addEventListener('click', async (event) => {
  const anchor = (event.target as Element)?.closest<HTMLAnchorElement>('a');
  if (!anchor || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
  if (anchor.hasAttribute('data-shortcut')) {
    shortcutId = anchor.id;
    sourceDesktopOffset = Math.max(0, -(document.getElementById('desktop')?.getBoundingClientRect().top ?? 0));
    // Keep focus with the history entry, including an un-hashed home URL.
    history.replaceState({ ...history.state, qwaveShortcut: shortcutId }, '');
  }
  explicitDesktopReturn = anchor.hasAttribute('data-return-desktop');
  desktopEntry = anchor.hasAttribute('data-enter-desktop') || anchor.hasAttribute('data-desktop-link');
  if (anchor.hash === '#desktop' && anchor.pathname === location.pathname) {
    if (document.body.classList.contains('has-monitor-flight')) {
      event.preventDefault();
      await navigate(withBase('/#desktop'));
      window.dispatchEvent(new Event('qwave:skip-intro'));
    }
    requestAnimationFrame(() => document.getElementById('desktop-title')?.focus({ preventScroll: true }));
  }
}, { capture: true });

document.addEventListener('astro:before-preparation', (event) => {
  const navigation = event as TransitionBeforePreparationEvent;
  isHistoryNavigation = navigation.navigationType === 'traverse';
  const loader = navigation.loader;
  navigation.loader = async () => {
    const previousScroll = window.scrollY;
    const recover = async () => {
      if (navigation.signal.aborted) return;
      // A same-page navigation cancels the failed preparation via the router's
      // public API, keeping the current content and history entry intact.
      const current = new URL(navigation.from.href);
      current.hash ||= 'main';
      await navigate(current.href, { history: 'replace' });
      history.replaceState(history.state, '', navigation.from.href);
      window.scrollTo({ top: previousScroll, behavior: 'instant' });
      const message = document.getElementById('route-error');
      const retry = document.getElementById('route-retry') as HTMLAnchorElement | null;
      if (retry) retry.href = navigation.to.href;
      if (message) message.hidden = false;
      retry?.focus({ preventScroll: true });
    };
    try {
      await loader();
      if (navigation.defaultPrevented && navigation.newDocument === document) await recover();
    } catch {
      await recover();
    }
  };
});

document.addEventListener('astro:page-load', () => {
  const isHome = location.pathname === withBase('/');
  const isDesktop = isHome && location.hash === '#desktop';
  if (isDesktop && !isHistoryNavigation && (firstLoad || explicitDesktopReturn || desktopEntry)) {
    if (document.body.classList.contains('has-monitor-flight')) window.dispatchEvent(new Event('qwave:skip-intro'));
    else document.getElementById('desktop')?.scrollIntoView({ behavior: 'instant' });
    if (explicitDesktopReturn && shortcutId) {
      const desktopTop = (document.querySelector('.desktop-slot')?.getBoundingClientRect().top ?? 0) + window.scrollY;
      window.scrollTo({ top: desktopTop + sourceDesktopOffset, behavior: 'instant' });
      refreshMonitorFlight();
    }
  }
  const focusId = isHome && isHistoryNavigation ? history.state?.qwaveShortcut : isDesktop && explicitDesktopReturn ? shortcutId : null;
  const shortcut = typeof focusId === 'string' ? document.getElementById(focusId) : null;
  if (shortcut && !shortcut.closest('[inert]')) {
    shortcut.focus({ preventScroll: true });
  } else if (isDesktop && !document.getElementById('desktop')?.inert) {
    document.getElementById('desktop-title')?.focus({ preventScroll: true });
  } else if (!firstLoad) {
    document.querySelector<HTMLElement>('[data-route-heading]')?.focus({ preventScroll: true });
  }
  firstLoad = false;
  explicitDesktopReturn = false;
  desktopEntry = false;
  document.querySelector('[data-dismiss-error]')?.addEventListener('click', () => {
    const error = document.getElementById('route-error');
    if (error) error.hidden = true;
  }, { once: true });
});
