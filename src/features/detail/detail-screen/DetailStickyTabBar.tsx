import { TouchableOpacity, Text, Animated } from 'react-native';
import Icon from '@/components/Icon';
import { DETAIL_SCREEN_TABS } from '@/features/detail/detail-screen/detailTabConfig';
import { useT } from '@/hooks/useT';

interface Props {
  tabs?: readonly { id: string; label: string; icon: string }[];
  aktifTab: string;
  onTabPress: (tabId: string) => void;
  bgCard: string;
  border: string;
  textShadow: string;
  textTertiary: string;
  primary: string;
  headerShadowOpacity: Animated.AnimatedInterpolation<number>;
}

export function DetailStickyTabBar({
  tabs = DETAIL_SCREEN_TABS as unknown as readonly { id: string; label: string; icon: string }[],
  aktifTab,
  onTabPress,
  bgCard,
  border,
  textShadow,
  textTertiary,
  primary,
  headerShadowOpacity,
}: Props) {
  const { t: T } = useT();

  const tabLabel = (id: string, fallback: string): string => {
    if (id === 'analiz') return T('detail.tab.analysis');
    if (id === 'ozet')   return T('detail.tab.overview');
    if (id === 'detay')  return T('detail.tab.details');
    return fallback;
  };

  if (tabs.length <= 1) {
    return null;
  }

  return (
    <Animated.View style={{
      flexDirection: 'row',
      backgroundColor: bgCard,
      borderBottomWidth: 0.5,
      borderBottomColor: border,
      shadowColor: textShadow,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 8,
      shadowOpacity: headerShadowOpacity as Animated.AnimatedInterpolation<number>,
      elevation: 4,
      zIndex: 10,
    }}>
      {tabs.map(tab => (
        <TouchableOpacity
          key={tab.id}
          onPress={() => onTabPress(tab.id)}
          style={{
            flex: 1,
            alignItems: 'center',
            paddingVertical: 10,
            borderBottomWidth: 2,
            borderBottomColor: aktifTab === tab.id ? primary : 'transparent',
          }}
        >
          <Icon
            name={tab.icon}
            size={18}
            color={aktifTab === tab.id ? primary : textTertiary}
          />
          <Text
            style={{
              fontSize: 10,
              marginTop: 2,
              fontWeight: aktifTab === tab.id ? '700' : '400',
              color: aktifTab === tab.id ? primary : textTertiary,
            }}
          >
            {tabLabel(tab.id, tab.label)}
          </Text>
        </TouchableOpacity>
      ))}
    </Animated.View>
  );
}
