import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { useScanFlowController } from '@features/scan/hooks/useScanFlowController';

describe('useScanFlowController', () => {
  it('starts with expected defaults', () => {
    let state: any = null;
    function Harness() {
      state = useScanFlowController();
      return null;
    }
    act(() => {
      TestRenderer.create(<Harness />);
    });

    expect(state.mode).toBe('camera');
    expect(state.flash).toBe('off');
    expect(state.autoCapture).toBe(false);
    expect(state.showActionPicker).toBe(false);
    expect(state.qualityPreset).toBe('auto');
    expect(state.editingPageId).toBeNull();
  });

  it('toggles flash and auto-capture', () => {
    let state: any = null;
    function Harness() {
      state = useScanFlowController();
      return null;
    }
    act(() => {
      TestRenderer.create(<Harness />);
    });

    act(() => {
      state.toggleFlash();
      state.toggleAutoCapture();
    });

    expect(state.flash).toBe('on');
    expect(state.autoCapture).toBe(true);
  });

  it('handles action picker and edit flow transitions', () => {
    let state: any = null;
    function Harness() {
      state = useScanFlowController();
      return null;
    }
    act(() => {
      TestRenderer.create(<Harness />);
    });

    act(() => {
      state.openActionPicker();
    });
    expect(state.showActionPicker).toBe(true);

    act(() => {
      state.closeActionPicker();
    });
    expect(state.showActionPicker).toBe(false);

    act(() => {
      state.startEditing('p-1', 'batch');
    });
    expect(state.mode).toBe('edit');
    expect(state.editingPageId).toBe('p-1');
    expect(state.editReturnMode).toBe('batch');

    act(() => {
      state.stopEditing();
    });
    expect(state.mode).toBe('batch');
    expect(state.editingPageId).toBeNull();
  });
});
