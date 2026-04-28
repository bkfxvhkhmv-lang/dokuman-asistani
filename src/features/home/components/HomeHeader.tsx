import React from 'react';
import { useRouter } from 'expo-router';
import HomeHeaderCluster from './HomeHeaderCluster';
import HomeSyncStrip from './HomeSyncStrip';
import HomeProfileStrip from './HomeProfileStrip';

export default function HomeHeader({ data }: { data: any }) {
  const router = useRouter();
  const profiles = data.state?.einstellungen?.profile ?? [];
  const activeProfileId = data.state?.einstellungen?.aktifProfilId ?? null;

  return (
    <>
      <HomeHeaderCluster
        colors={data.Colors}
        tabs={['Aufgaben', 'Dokumente', 'Ordner', 'Kalender', 'Zahlungen']}
        activeTab={data.aktiv}
        onTabPress={data.handleTabPress}
        onSearchPress={() => router.push('/(tabs)/Suche')}
        onFilterPress={() => data.setFilterOffen?.((value: boolean) => !value)}
        filterActive={data.filterAktiv}
        filterOpen={data.filterOffen}
        unreadCount={data.ungelesen}
      />
      <HomeSyncStrip
        colors={data.Colors}
        syncStatus={data.syncStatus}
        letzterSync={data.letzterSync}
        onPress={data.runSync}
      />
      <HomeProfileStrip
        colors={data.Colors}
        profiles={profiles}
        activeProfileId={activeProfileId}
        onSelect={(id) => data.dispatch({ type: 'SELECT_PROFIL', id })}
        spacing={data.S}
        radius={data.R}
      />
    </>
  );
}
