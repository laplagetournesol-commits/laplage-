import React, { createContext, useContext, useState, useCallback } from 'react';
import { sunThemes, type SunPeriod, type SunTheme } from './colors';

interface SunModeContextValue {
  theme: SunTheme;
  period: SunPeriod;
  /** Forcer un thème manuellement (utile pour le debug) */
  override: (period: SunPeriod | null) => void;
  isOverridden: boolean;
}

const SunModeContext = createContext<SunModeContextValue | null>(null);

export function SunModeProvider({ children }: { children: React.ReactNode }) {
  const [overridePeriod, setOverridePeriod] = useState<SunPeriod | null>(null);
  const [autoPeriod] = useState<SunPeriod>('day');

  const period = overridePeriod ?? autoPeriod;
  const theme = sunThemes[period];

  const override = useCallback((p: SunPeriod | null) => {
    setOverridePeriod(p);
  }, []);

  return (
    <SunModeContext.Provider value={{ theme, period, override, isOverridden: overridePeriod !== null }}>
      {children}
    </SunModeContext.Provider>
  );
}

export function useSunMode(): SunModeContextValue {
  const ctx = useContext(SunModeContext);
  if (!ctx) throw new Error('useSunMode must be used within SunModeProvider');
  return ctx;
}
