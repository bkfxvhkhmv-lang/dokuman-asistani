import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';

import Icon from '../Icon';

type Props = {
  insetsTop: number;
  flash: 'on' | 'off';
  primaryTitle: string;
  secondaryTitle?: string | null;
  pageCount: number;
  onClose: () => void;
  onToggleFlash: () => void;
  onImport: () => void;
  onCapture: () => void;
  onPagesPress: () => void;
  primaryColor: string;
  autoMode?: boolean;
  isStable?: boolean;
  onToggleAuto?: () => void;
  shutterHighlight?: boolean;
};

export default function CaptureControls({
  insetsTop,
  flash,
  primaryTitle,
  secondaryTitle,
  pageCount,
  onClose,
  onToggleFlash,
  onImport,
  onCapture,
  onPagesPress,
  primaryColor,
  autoMode = false,
  isStable = false,
  onToggleAuto,
  shutterHighlight = false,
}: Props) {
  return (
    <>
      <View style={[st.top, { top: insetsTop }]}>
        <TouchableOpacity style={st.topButton} hitSlop={14} onPress={onClose}>
          <Icon name="close" size={21} color="#fff" />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={st.title}>{primaryTitle}</Text>
          {!!secondaryTitle && <Text style={st.subtitle}>{secondaryTitle}</Text>}
          {onToggleAuto && (
            <TouchableOpacity
              style={[st.autoToggle, autoMode ? st.autoToggleOn : st.autoToggleOff]}
              onPress={onToggleAuto}
            >
              <Icon name="bolt" size={11} color={autoMode ? '#22C55E' : 'rgba(255,255,255,0.45)'} />
              <Text style={[st.autoToggleText, { color: autoMode ? '#22C55E' : 'rgba(255,255,255,0.45)' }]}>AUTO</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[st.topButton, flash === 'on' && { backgroundColor: primaryColor }]}
          onPress={onToggleFlash}
        >
          <Icon name={flash === 'on' ? 'flash' : 'flash-off'} size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={st.bottom}>
        <TouchableOpacity style={st.sideAction} onPress={onImport}>
          <View style={st.sideBubble}>
            <Icon name="images-outline" size={20} color="#FFFFFF" />
          </View>
          <Text style={st.sideLabel}>Import</Text>
        </TouchableOpacity>

        <TouchableOpacity style={st.shutter} onPress={onCapture} activeOpacity={0.8}>
          <View style={[st.shutterInner, shutterHighlight && st.shutterInnerGreen]} />
        </TouchableOpacity>

        <TouchableOpacity style={st.sideAction} onPress={onPagesPress}>
          {pageCount > 0 ? (
            <>
              <View style={[st.badge, { backgroundColor: primaryColor }]}>
                <Text style={st.badgeText}>{pageCount}</Text>
              </View>
              <Text style={st.sideLabel}>Seiten</Text>
            </>
          ) : (
            <>
              <View style={st.sideBubble}>
                <Icon name="albums-outline" size={19} color="rgba(255,255,255,0.82)" />
              </View>
              <Text style={st.sideLabel}>Stapel</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </>
  );
}

const st = StyleSheet.create({
  top: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  topButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(9,12,22,0.52)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '600',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 10,
    marginTop: 2,
  },
  autoToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    marginTop: 4,
    borderWidth: 1,
  },
  autoToggleOn: {
    backgroundColor: 'rgba(34,197,94,0.12)',
    borderColor: 'rgba(34,197,94,0.4)',
  },
  autoToggleOff: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.1)',
  },
  autoToggleText: {
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 4,
  },
  bottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  sideAction: {
    alignItems: 'center',
    gap: 6,
    width: 60,
  },
  sideBubble: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
  },
  shutter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
  },
  shutterInnerGreen: {
    backgroundColor: '#22C55E',
  },
  badge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },
});
