import React from 'react';
import Constants from 'expo-constants';

function loadCameraScreen() {
  const appOwnership = Constants.appOwnership ?? null;
  const isExpoGo = appOwnership === 'expo';

  if (isExpoGo) {
    return require('../../screens/Kamerabildschirm').default;
  }

  return require('../../screens/ScannerScreen').default;
}

export default function ScanScreen() {
  const Screen = loadCameraScreen();
  return <Screen />;
}
