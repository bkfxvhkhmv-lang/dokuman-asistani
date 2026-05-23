import React, { createContext, useContext, useState, useCallback } from 'react';

interface OfflineBannerSuppressionCtx {
  suppress: boolean;
  setSuppressBanner: (v: boolean) => void;
}

const OfflineBannerVisibilityContext = createContext<OfflineBannerSuppressionCtx>({
  suppress: false,
  setSuppressBanner: () => {},
});

export function OfflineBannerProvider({ children }: { children: React.ReactNode }) {
  const [suppress, setSuppress] = useState(false);
  const setSuppressBanner = useCallback((v: boolean) => setSuppress(v), []);
  return (
    <OfflineBannerVisibilityContext.Provider value={{ suppress, setSuppressBanner }}>
      {children}
    </OfflineBannerVisibilityContext.Provider>
  );
}

export function useOfflineBannerSuppression() {
  return useContext(OfflineBannerVisibilityContext);
}
