import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Text, TouchableOpacity } from 'react-native';
import { CameraView } from 'expo-camera';

import Icon from '../Icon';
import DocumentOverlay from './DocumentOverlay';
import CaptureControls from './CaptureControls';
import { useAutoCapture } from '../../modules/scanner/useAutoCapture';

type Props = {
  cameraRef: any;
  flash: 'on' | 'off';
  insetsTop: number;
  primaryColor: string;
  pageCount: number;
  shotFlash: boolean;
  shotAnim: Animated.Value;
  onClose: () => void;
  onToggleFlash: () => void;
  onImport: () => void;
  onCapture: () => void;
  onPagesPress: () => void;
};

export default function ScannerView({
  cameraRef,
  flash,
  insetsTop,
  primaryColor,
  pageCount,
  shotFlash,
  shotAnim,
  onClose,
  onToggleFlash,
  onImport,
  onCapture,
  onPagesPress,
}: Props) {
  const [autoMode, setAutoMode] = useState(false);
  const scanLineY = useRef(new Animated.Value(0)).current;
  const cornerPulse = useRef(new Animated.Value(1)).current;

  const {
    enabled: autoEnabled,
    isStable,
    readiness,
    toggle: toggleAuto,
    triggerFeedback,
  } = useAutoCapture({ threshold: 0.35, requiredDuration: 800, autoTriggerDelay: 1200, readinessThreshold: 0.82 });

  const autoActive = autoMode && autoEnabled;
  const showScanLine = autoActive && !isStable;
  const showStableBanner = autoActive && isStable;

  useEffect(() => {
    if (showScanLine) {
      scanLineY.setValue(0);
      Animated.loop(
        Animated.sequence([
          Animated.timing(scanLineY, { toValue: 1, duration: 2200, useNativeDriver: true }),
          Animated.timing(scanLineY, { toValue: 0, duration: 2200, useNativeDriver: true }),
        ])
      ).start();
    } else {
      scanLineY.stopAnimation();
      scanLineY.setValue(0);
    }
  }, [showScanLine]);

  useEffect(() => {
    if (showScanLine) {
      cornerPulse.setValue(0.4);
      Animated.loop(
        Animated.sequence([
          Animated.timing(cornerPulse, { toValue: 1, duration: 800, useNativeDriver: true }),
          Animated.timing(cornerPulse, { toValue: 0.4, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    } else {
      cornerPulse.stopAnimation();
      cornerPulse.setValue(1);
    }
  }, [showScanLine]);

  useEffect(() => {
    if (isStable && autoMode) {
      triggerFeedback();
      const timer = setTimeout(() => {
        setAutoMode(false);
        onCapture();
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [isStable, autoMode]);

  const handleToggleAuto = () => {
    const next = !autoMode;
    setAutoMode(next);
    if (next) {
      toggleAuto();
    } else {
      toggleAuto();
    }
  };

  return (
    <View style={[st.fill, { backgroundColor: '#000' }]}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" flash={flash} />

      <View style={st.topShade} />
      <View style={st.bottomShade} />

      <DocumentOverlay
        mode="document"
        hint={autoActive ? (isStable ? '' : 'Telefonu sabit tutun...') : 'Dokument im Rahmen ausrichten'}
        cornerColor={autoActive ? (isStable ? '#22C55E' : 'rgba(34,197,94,0.7)') : 'rgba(255,255,255,0.85)'}
        cornerOpacity={showScanLine ? (cornerPulse as unknown as number) : 1}
        showGlow={autoActive}
        glowColor={isStable ? 'rgba(34,197,94,0.5)' : 'rgba(34,197,94,0.12)'}
      />

      {showScanLine && (
        <Animated.View
          style={[
            st.scanLine,
            {
              transform: [{
                translateY: scanLineY.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 340],
                }),
              }],
            },
          ]}
          pointerEvents="none"
        />
      )}

      {showStableBanner && (
        <View style={st.stableBannerWrap} pointerEvents="none">
          <View style={st.stableBadge}>
            <Text style={st.stableBadgeText}>Stabil — automatisch in 1s</Text>
          </View>
        </View>
      )}

      {shotFlash && (
        <>
          <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#fff', opacity: shotAnim }]} pointerEvents="none" />
          <Animated.View style={[st.banner, { opacity: shotAnim }]} pointerEvents="none">
            <Icon name="checkmark" size={15} color="#fff" />
            <Text style={st.bannerText}>Dokument erkannt</Text>
          </Animated.View>
        </>
      )}

      <CaptureControls
        insetsTop={insetsTop}
        flash={flash}
        primaryTitle="Dokument scannen"
        secondaryTitle={pageCount > 0 ? `${pageCount} Seite${pageCount > 1 ? 'n' : ''} bereits erfasst` : null}
        pageCount={pageCount}
        onClose={onClose}
        onToggleFlash={onToggleFlash}
        onImport={onImport}
        onCapture={onCapture}
        onPagesPress={onPagesPress}
        primaryColor={primaryColor}
        autoMode={autoMode}
        isStable={isStable}
        onToggleAuto={handleToggleAuto}
        shutterHighlight={autoActive && isStable}
      />

      <View style={st.hintWrap}>
        <View style={st.hintPill}>
          <Icon name="scan-outline" size={13} color="rgba(255,255,255,0.82)" />
          <Text style={st.hintText}>Rechnung · Mahnung · Brief · Bescheid</Text>
        </View>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  fill: { flex: 1 },
  topShade: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: '10%',
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  bottomShade: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: '18%',
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  scanLine: {
    position: 'absolute',
    top: '16%',
    left: '15%',
    right: '15%',
    height: 2,
    backgroundColor: '#22C55E',
    opacity: 0.75,
    shadowColor: '#22C55E',
    shadowOpacity: 0.5,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  stableBannerWrap: {
    position: 'absolute',
    top: '16%',
    marginTop: 352,
    left: 0, right: 0,
    alignItems: 'center',
  },
  stableBadge: {
    backgroundColor: 'rgba(34,197,94,0.15)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.35)',
  },
  stableBadgeText: {
    color: '#22C55E',
    fontSize: 11,
    fontWeight: '700',
  },
  hintWrap: {
    position: 'absolute',
    bottom: 140,
    left: 0, right: 0,
    alignItems: 'center',
  },
  hintPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: 'rgba(7,10,18,0.42)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  hintText: {
    color: 'rgba(255,255,255,0.74)',
    fontSize: 11,
    textAlign: 'center',
    fontWeight: '600',
  },
  banner: {
    position: 'absolute',
    bottom: '22%',
    alignSelf: 'center',
    backgroundColor: '#16A34A',
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  bannerText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
});
