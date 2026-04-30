import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { useScanSessionSelection } from '@features/scan/hooks/useScanSessionSelection';

jest.mock('@features/scan/state/EditStateMachine', () => ({
  resolveEditTransition: jest.fn(() => ({ nextMode: 'none', allowed: true, exiting: [] })),
}));

describe('useScanSessionSelection', () => {
  const pageA = {
    id: 'a',
    uri: 'file://a.jpg',
    filter: 'original',
    imageSession: { id: 'session-a', activeFilter: 'clean', editMode: 'none' },
    capture: { processing: { filter: 'clean' } },
  };
  const pageB = {
    id: 'b',
    uri: 'file://b.jpg',
    filter: 'mono',
    imageSession: { id: 'session-b', activeFilter: 'mono', editMode: 'none' },
    capture: { processing: { filter: 'mono' } },
  };

  it('derives session pages and target page', () => {
    const loadSession = jest.fn();
    const imageSessionManager = {
      fromCapture: jest.fn(),
      create: jest.fn(),
      setEditMode: jest.fn((s) => s),
    };
    const setActiveFilter = jest.fn();
    const startEditing = jest.fn();

    let state: any = null;
    function Harness() {
      state = useScanSessionSelection({
        pages: [pageA, { id: 'x', imageSession: null }, pageB],
        editingPageId: null,
        loadSession,
        imageSessionManager,
        setActiveFilter,
        mode: 'camera',
        startEditing,
      });
      return null;
    }

    act(() => {
      TestRenderer.create(<Harness />);
    });

    expect(state.sessionPages).toHaveLength(2);
    expect(state.targetPage.id).toBe('b');
    expect(loadSession).toHaveBeenCalled();
  });

  it('opens editor with chosen page and starts edit mode', () => {
    const loadSession = jest.fn();
    const imageSessionManager = {
      fromCapture: jest.fn(),
      create: jest.fn(),
      setEditMode: jest.fn((s) => ({ ...s, editMode: 'none' })),
    };
    const setActiveFilter = jest.fn();
    const startEditing = jest.fn();

    let state: any = null;
    function Harness() {
      state = useScanSessionSelection({
        pages: [pageA, pageB],
        editingPageId: null,
        loadSession,
        imageSessionManager,
        setActiveFilter,
        mode: 'batch',
        startEditing,
      });
      return null;
    }

    act(() => {
      TestRenderer.create(<Harness />);
    });

    act(() => {
      state.handleOpenPageEditor('a');
    });

    expect(setActiveFilter).toHaveBeenCalledWith('clean');
    expect(startEditing).toHaveBeenCalledWith('a', 'batch');
    expect(imageSessionManager.setEditMode).toHaveBeenCalled();
  });
});
