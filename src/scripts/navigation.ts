import type { TransitionBeforePreparationEvent } from 'astro:transitions/client';
import { navigate } from 'astro:transitions/client';

let firstLoad = true;
let isHistoryNavigation = false;
let explicitDesktopReturn = false;
let shortcutId: string | null = null;
let sourceScroll = 0;
let sourceDesktopOffset = 0;
let sourceWasFlight = false;
let desktopEntry = false;

document.addEventListener('click', async (event) => {
  const anchor = (event.target as Element)?.closest<HTMLAnchorElement>('a');
  if (!anchor || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
  if (anchor.hasAttribute('data-shortcut')) {
    shortcutId = anchor.id;
    sourceScroll = window.scrollY;
    sourceWasFlight = document.body.classList.contains('has-monitor-flight');
    sourceDesktopOffset = -(document.getElementById('desktop')?.getBoundingClientRect().top ?? 0);
  }
  explicitDesktopReturn = anchor.hasAttribute('data-return-desktop');
  desktopEntry = anchor.hasAttribute('data-enter-desktop') || anchor.hasAttribute('data-desktop-link');
  if (anchor.hash === '#desktop' && anchor.pathname === location.pathname) {
    if (document.body.classList.contains('has-monitor-flight')) {
      event.preventDefault();
      await navigate('/#desktop');
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
  const isDesktop = location.pathname === '/' && location.hash === '#desktop';
  const returning = isDesktop && (explicitDesktopReturn || isHistoryNavigation);
  if (returning && shortcutId && document.getElementById(shortcutId)) {
    if (explicitDesktopReturn || sourceWasFlight) {
      const desktopTop = (document.getElementById('desktop')?.getBoundingClientRect().top ?? 0) + window.scrollY;
      window.scrollTo({ top: sourceWasFlight ? desktopTop + sourceDesktopOffset : sourceScroll, behavior: 'instant' });
    }
    document.getElementById(shortcutId)?.focus({ preventScroll: true });
  } else if (isDesktop) {
    if (!isHistoryNavigation && (firstLoad || explicitDesktopReturn || desktopEntry)) document.getElementById('desktop')?.scrollIntoView({ behavior: 'instant' });
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
