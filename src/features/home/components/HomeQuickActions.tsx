import React from 'react';
import { useRouter } from 'expo-router';
import HomeDashboardCards from './HomeDashboardCards';

export default function HomeQuickActions({ data }: { data: any }) {
  const router = useRouter();

  const handleStatChipPress = (filter: string) => {
    if (filter === 'Mahnung' || filter === 'Vertrag') {
      router.push({ pathname: '/(tabs)/Suche', params: { typ: filter } });
    } else {
      data.handleTabPress('Dokumente');
    }
  };

  return (
    <HomeDashboardCards
      colors={data.Colors}
      dashboardStats={data.dashStats}
      spacing={data.S}
      topDocs={data.aufgaben}
      onDocPress={(dok: any) => router.push({ pathname: '/detail', params: { dokId: dok.id } })}
      onStatChipPress={handleStatChipPress}
    />
  );
}
