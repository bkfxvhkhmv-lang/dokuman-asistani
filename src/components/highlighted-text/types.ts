export interface HighlightRule {
  key: string;
  regex: RegExp;
  color: string;
  bg: string;
  label: string;
  neon: string;
}

export interface Segment {
  plain: boolean;
  text: string;
  rule?: HighlightRule;
}

export interface HighlightedTextViewProps {
  text?: string | null;
  maxLength?: number;
}
