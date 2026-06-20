import { renderAccordionContentWhenOpen } from '@/features/detail/components/details-panel/lazyAccordionContent';

describe('renderAccordionContentWhenOpen', () => {
  it('does not invoke render while collapsed', () => {
    const render = jest.fn(() => 'content');
    expect(renderAccordionContentWhenOpen(false, render)).toBeNull();
    expect(render).not.toHaveBeenCalled();
  });

  it('invokes render only when open', () => {
    const render = jest.fn(() => 'content');
    expect(renderAccordionContentWhenOpen(true, render)).toBe('content');
    expect(render).toHaveBeenCalledTimes(1);
  });
});
