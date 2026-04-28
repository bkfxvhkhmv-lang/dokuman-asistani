import { NativeModules, Platform } from 'react-native';
import {
  registerNativeEdgeDetect,
  registerNativeFilter,
  registerNativeWarp,
} from '../engine/NativeStub';
import type { DocumentCorners } from '../types';
import {
  SCANNER_NATIVE_MODULE_NAME,
  type NativeEdgeDetectionInput,
  type NativeFilterInput,
  type NativeScannerCapabilities,
  type NativeScannerModuleContract,
  type NativeWarpPerspectiveInput,
} from './contract';

const nativeScannerModule =
  NativeModules[SCANNER_NATIVE_MODULE_NAME] as NativeScannerModuleContract | undefined;

let bindingsInstalled = false;

function frameToDetectionInput(frame: unknown): NativeEdgeDetectionInput | null {
  if (!frame || typeof frame !== 'object') {
    return null;
  }

  const maybeFrame = frame as {
    imageUri?: unknown;
    path?: unknown;
    width?: unknown;
    height?: unknown;
  };

  const imageUri =
    typeof maybeFrame.imageUri === 'string'
      ? maybeFrame.imageUri
      : typeof maybeFrame.path === 'string'
        ? maybeFrame.path
        : null;

  if (!imageUri) {
    return null;
  }

  return {
    imageUri,
    width: typeof maybeFrame.width === 'number' ? maybeFrame.width : undefined,
    height: typeof maybeFrame.height === 'number' ? maybeFrame.height : undefined,
  };
}

export function getNativeScannerModule(): NativeScannerModuleContract | null {
  return nativeScannerModule ?? null;
}

export function hasNativeScannerModule(): boolean {
  return !!nativeScannerModule;
}

export async function getNativeScannerCapabilities(): Promise<NativeScannerCapabilities | null> {
  if (!nativeScannerModule) {
    return null;
  }

  try {
    return await nativeScannerModule.getCapabilities();
  } catch {
    return null;
  }
}

export function installNativeScannerBindings(): boolean {
  if (!nativeScannerModule || bindingsInstalled) {
    return !!nativeScannerModule;
  }

  registerNativeEdgeDetect(async (frame: unknown): Promise<DocumentCorners | null> => {
    const input = frameToDetectionInput(frame);
    if (!input) {
      return null;
    }

    return nativeScannerModule.detectDocumentEdges(input);
  });

  registerNativeWarp(async (imageUri: string, corners: DocumentCorners) => {
    const input: NativeWarpPerspectiveInput = { imageUri, corners };
    const result = await nativeScannerModule.warpPerspective(input);
    return result.uri;
  });

  registerNativeFilter(async (imageUri: string, filterId: string) => {
    const input: NativeFilterInput = { imageUri, filterId };
    const result = await nativeScannerModule.applyFilter(input);
    return result.uri;
  });

  bindingsInstalled = true;
  return true;
}

export const scannerNativeBindingsInstalled = installNativeScannerBindings();

export const defaultScannerNativeCapabilities: NativeScannerCapabilities = {
  edgeDetection: false,
  perspectiveCorrection: false,
  filters: false,
  frameProcessor: false,
  platform: Platform.OS === 'ios' ? 'ios' : 'android',
  version: 'stub',
};

export * from './contract';
