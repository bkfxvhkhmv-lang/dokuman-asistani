import React from 'react';
import { Alert, Text, TouchableOpacity } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import AdvancedBatchView from '@features/scan/components/AdvancedBatchView';

jest.mock('../hooks/useScanI18n', () => ({
  useScanI18n: () => ({
    t: (key: string, vars?: Record<string, string>) => {
      const map: Record<string, string> = {
        'scan.select_all': 'ALLE',
        'scan.clear_selection': 'CLEAR',
        'scan.delete': 'DELETE',
        'scan.extract_selected': 'EXTRACT',
        'scan.undo': 'UNDO',
        'scan.confirm_title': 'CONFIRM',
        'scan.confirm_delete_selected': `${vars?.count ?? ''} DELETE?`,
        'scan.confirm_keep_only_selected': 'KEEP_ONLY?',
      };
      return map[key] ?? key;
    },
  }),
}));

function pressByText(root: TestRenderer.ReactTestInstance, label: string) {
  const touchables = root.findAllByType(TouchableOpacity);
  const target = touchables.find(node => {
    const texts = node.findAllByType(Text).map(t => Array.isArray(t.props.children) ? t.props.children.join('') : String(t.props.children ?? ''));
    return texts.some(t => t.includes(label));
  });
  if (!target) throw new Error(`Button not found: ${label}`);
  act(() => {
    target.props.onPress?.();
  });
}

function hasText(root: TestRenderer.ReactTestInstance, label: string) {
  const texts = root.findAllByType(Text).map(t => {
    if (Array.isArray(t.props.children)) return t.props.children.join('');
    return String(t.props.children ?? '');
  });
  return texts.some(t => t.includes(label));
}

function confirmDestructiveAlertCall(callIndex = 0) {
  const alertButtons = (Alert.alert as jest.Mock).mock.calls[callIndex][2];
  const destructive = alertButtons.find((b: any) => b.style === 'destructive');
  act(() => destructive.onPress());
}

describe('AdvancedBatchView', () => {
  const pages = [
    { id: 'p1', uri: 'file://1.jpg', order: 0, imageSession: { finalUri: 'file://1.jpg' } },
    { id: 'p2', uri: 'file://2.jpg', order: 1, imageSession: { finalUri: 'file://2.jpg' } },
  ];

  beforeEach(() => {
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('confirms delete and supports undo restore', () => {
    const onRemove = jest.fn();
    const onReplacePages = jest.fn();

    let tree: TestRenderer.ReactTestRenderer;
    act(() => {
      tree = TestRenderer.create(
        <AdvancedBatchView
          pages={pages}
          onBack={jest.fn()}
          onOpenPageEditor={jest.fn()}
          onMoveUp={jest.fn()}
          onMoveDown={jest.fn()}
          onRotate={jest.fn()}
          onRemove={onRemove}
          onAddPageLike={jest.fn()}
          onReplacePages={onReplacePages}
        />,
      );
    });

    const root = tree!.root;
    pressByText(root, 'ALLE');
    pressByText(root, 'DELETE');

    expect(Alert.alert).toHaveBeenCalled();
    confirmDestructiveAlertCall(0);

    expect(onRemove).toHaveBeenCalledTimes(2);

    pressByText(root, 'UNDO');
    expect(onReplacePages).toHaveBeenCalledTimes(1);
    expect(onReplacePages).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ id: 'p1' }),
      expect.objectContaining({ id: 'p2' }),
    ]));
  });

  it('does not open extract confirm with no selection', () => {
    const onReplacePages = jest.fn();

    let tree: TestRenderer.ReactTestRenderer;
    act(() => {
      tree = TestRenderer.create(
        <AdvancedBatchView
          pages={pages}
          onBack={jest.fn()}
          onOpenPageEditor={jest.fn()}
          onMoveUp={jest.fn()}
          onMoveDown={jest.fn()}
          onRotate={jest.fn()}
          onRemove={jest.fn()}
          onAddPageLike={jest.fn()}
          onReplacePages={onReplacePages}
        />,
      );
    });

    const root = tree!.root;
    pressByText(root, 'EXTRACT');
    expect(Alert.alert).not.toHaveBeenCalled();
    expect(onReplacePages).not.toHaveBeenCalled();
  });

  it('hides undo after 12 seconds timeout', () => {
    jest.useFakeTimers();
    const onRemove = jest.fn();

    let tree: TestRenderer.ReactTestRenderer;
    act(() => {
      tree = TestRenderer.create(
        <AdvancedBatchView
          pages={pages}
          onBack={jest.fn()}
          onOpenPageEditor={jest.fn()}
          onMoveUp={jest.fn()}
          onMoveDown={jest.fn()}
          onRotate={jest.fn()}
          onRemove={onRemove}
          onAddPageLike={jest.fn()}
          onReplacePages={jest.fn()}
        />,
      );
    });
    const root = tree!.root;

    pressByText(root, 'ALLE');
    pressByText(root, 'DELETE');
    confirmDestructiveAlertCall(0);

    expect(hasText(root, 'UNDO')).toBe(true);

    act(() => {
      jest.advanceTimersByTime(11000);
    });
    expect(hasText(root, 'UNDO')).toBe(true);

    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(hasText(root, 'UNDO')).toBe(false);
    jest.useRealTimers();
  });

  it('resets undo timer when a new undoable action occurs', () => {
    jest.useFakeTimers();
    const onRemove = jest.fn();

    let tree: TestRenderer.ReactTestRenderer;
    act(() => {
      tree = TestRenderer.create(
        <AdvancedBatchView
          pages={pages}
          onBack={jest.fn()}
          onOpenPageEditor={jest.fn()}
          onMoveUp={jest.fn()}
          onMoveDown={jest.fn()}
          onRotate={jest.fn()}
          onRemove={onRemove}
          onAddPageLike={jest.fn()}
          onReplacePages={jest.fn()}
        />,
      );
    });
    const root = tree!.root;

    // first undoable action
    pressByText(root, 'ALLE');
    pressByText(root, 'DELETE');
    confirmDestructiveAlertCall(0);

    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(hasText(root, 'UNDO')).toBe(true);

    // second undoable action should replace/refresh undo window
    pressByText(root, 'ALLE');
    pressByText(root, 'scan.duplicate_selected');
    expect(hasText(root, 'UNDO')).toBe(true);

    act(() => {
      jest.advanceTimersByTime(11000);
    });
    expect(hasText(root, 'UNDO')).toBe(true);

    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(hasText(root, 'UNDO')).toBe(false);
    jest.useRealTimers();
  });
});
