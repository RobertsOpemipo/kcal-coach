import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { dark, light, type Palette } from './tokens';

interface Theme { mode: 'dark' | 'light'; c: Palette }
const ThemeContext = createContext<Theme>({ mode: 'dark', c: dark });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const scheme = useColorScheme();
  const value = useMemo<Theme>(
    () => (scheme === 'light' ? { mode: 'light', c: light } : { mode: 'dark', c: dark }),
    [scheme],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
