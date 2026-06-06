type Listener = () => void;

let bypassCount = 0;
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function setPrivacyGateBypassed(enabled: boolean) {
  const next = enabled ? bypassCount + 1 : Math.max(0, bypassCount - 1);
  if (next === bypassCount) return;
  bypassCount = next;
  emit();
}

export function isPrivacyGateBypassed() {
  return bypassCount > 0;
}

export function subscribePrivacyGateBypass(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
