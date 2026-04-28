let collapsed = false;
const listeners = new Set<(value: boolean) => void>();

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
