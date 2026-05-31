let collapsed = false;
let hidden = false;
const listeners = new Set<(value: boolean) => void>();
const hiddenListeners = new Set<(value: boolean) => void>();

export function getTabBarCollapsed() {
  return collapsed;
}

export function setTabBarCollapsed(nextValue: boolean) {
  if (collapsed === nextValue) return;
  collapsed = nextValue;
  listeners.forEach((listener) => listener(collapsed));
}

export function subscribeTabBarCollapsed(listener: (value: boolean) => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getTabBarHidden() {
  return hidden;
}

export function setTabBarHidden(nextValue: boolean) {
  if (hidden === nextValue) return;
  hidden = nextValue;
  hiddenListeners.forEach((listener) => listener(hidden));
}

export function subscribeTabBarHidden(listener: (value: boolean) => void) {
  hiddenListeners.add(listener);
  return () => hiddenListeners.delete(listener);
}
