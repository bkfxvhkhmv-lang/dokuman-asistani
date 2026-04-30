import React from 'react';
import { useRouter } from 'expo-router';
import HomeHeaderCluster from '@/features/home/components/HomeHeaderCluster';
import HomeSyncStrip from '@/features/home/components/HomeSyncStrip';
import type { FilterParams } from '@/utils/search';

export default function HomeHeader({ data }: { data: any }) {
  const router = useRouter();

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
        onSettingsPress={() => router.push('/einstellungen')}
        onSearchPress={() => router.push('/(tabs)/Suche')}
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
