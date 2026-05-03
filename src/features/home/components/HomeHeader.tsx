import React from 'react';
import { Animated } from 'react-native';
import HomeHeaderCluster from '@/features/home/components/HomeHeaderCluster';
import HomeSyncStrip from '@/features/home/components/HomeSyncStrip';
import type { FilterParams } from '@/utils/search';

export default function HomeHeader({ data, scrollY }: { data: any; scrollY?: Animated.Value }) {
  return (
    <>
      <HomeHeaderCluster
        colors={data.Colors}
        dringend={data.dringend?.length ?? 0}
        totalOpen={data.offenCount ?? data.sichtbareDocs?.length ?? 0}
        quickScope={data.filter.quickScope ?? 'offen'}
        onScopeChange={quickScope =>
          data.setFilter((f: FilterParams) => ({ ...f, quickScope }))
        }
        scrollY={scrollY}
      />
      <HomeSyncStrip
        colors={data.Colors}
        syncStatus={data.syncStatus}
        letzterSync={data.letzterSync}
        onPress={data.runSync}
      />
    </>
  );
}
