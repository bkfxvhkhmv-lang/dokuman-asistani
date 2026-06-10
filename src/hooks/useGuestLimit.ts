import { useCallback, useState } from 'react';
import { useAuth } from '@/providers/AuthContext';
import {
  canAddDocument,
  canRunOcr,
  recordDocument,
  recordOcr,
} from '@/services/guestLimitService';

export function useGuestLimit() {
  const { user } = useAuth();
  const [upgradeVisible, setUpgradeVisible] = useState(false);
  const isGuest = user?.isGuest === true;

  const showUpgrade = useCallback(() => setUpgradeVisible(true), []);
  const dismissUpgrade = useCallback(() => setUpgradeVisible(false), []);

  const gateDocument = useCallback(async (): Promise<boolean> => {
    if (!isGuest) return true;
    if (!(await canAddDocument())) {
      showUpgrade();
      return false;
    }
    await recordDocument();
    return true;
  }, [isGuest, showUpgrade]);

  const gateOcr = useCallback(async (): Promise<boolean> => {
    if (!isGuest) return true;
    if (!(await canRunOcr())) {
      showUpgrade();
      return false;
    }
    await recordOcr();
    return true;
  }, [isGuest, showUpgrade]);

  return {
    isGuest,
    upgradeVisible,
    showUpgrade,
    dismissUpgrade,
    gateDocument,
    gateOcr,
  };
}
