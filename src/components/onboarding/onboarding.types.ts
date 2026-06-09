export interface ScanDemo {
  type: 'scan';
  schritte: { icon: string; label: string; desc: string }[];
}

export interface RisikoDemo {
  type: 'risiko';
  beispiele: { risiko: string; label: string; farbe: string; titel: string; tage: string }[];
}

export interface FristenDemo {
  type: 'fristen';
  events: { datum: string; titel: string; tage: number; risiko: string }[];
}

export interface SucheDemo {
  type: 'suche';
  beispiele: string[];
}

export interface PrivatDemo {
  type: 'privat';
  punkte: { icon: string; text?: string; textKey?: string }[];
}

export type SlideDemo = ScanDemo | RisikoDemo | FristenDemo | SucheDemo | PrivatDemo;

export interface Slide {
  id: string;
  emoji: string;
  titel: string;
  text?: string;
  textKey?: string;
  farbe: string;
  demo: SlideDemo | null;
}

export interface OnboardingModalProps {
  visible: boolean;
  onFertig: () => void;
}
