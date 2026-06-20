import type { ReactNode } from 'react';

/** Lazy accordion mount gate — render fn is never invoked while collapsed. */
export function renderAccordionContentWhenOpen(
  isOpen: boolean,
  render: () => ReactNode,
): ReactNode {
  if (!isOpen) return null;
  return render();
}
