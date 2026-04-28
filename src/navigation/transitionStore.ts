/**
 * Lightweight module-level store for hero card transition data.
 * No React context needed — avoids re-renders and keeps the bridge thin.
 */

export interface CardTransitionGeometry {
  x:           number;  // absolute screen X (measureInWindow)
  y:           number;  // absolute screen Y
  width:       number;
  height:      number;
  accentColor: string;
}

type Listener = (data: CardTransitionGeometry) => void;

let _pending: CardTransitionGeometry | null = null;
let _listeners: Listener[] = [];

export const TransitionStore = {
  /** Called by DokumentKarte right before router.push() */
  trigger(data: CardTransitionGeometry) {
    _pending = data;
    _listeners.forEach(fn => fn(data));
  },

  /** Called by HeroTransitionOverlay to get & clear the pending transition */
  consume(): CardTransitionGeometry | null {
    const d = _pending;
    _pending = null;
    return d;
  },

  /** Overlay subscribes once on mount */
  subscribe(fn: Listener): () => void {
    _listeners.push(fn);
    return () => { _listeners = _listeners.filter(f => f !== fn); };
  },
};
