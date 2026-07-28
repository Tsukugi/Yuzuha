import {createContext, useContext, useMemo, useState, type ReactNode} from 'react';
import {useColorScheme} from 'react-native';

export type ThemeMode = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

export interface ThemeColors {
  background: string;
  card: string;
  cardRaised: string;
  text: string;
  muted: string;
  accent: string;
  accentText: string;
  warning: string;
  danger: string;
  border: string;
  input: string;
  shadow: string;
}

const lightColors: ThemeColors = {
  background: '#F7F9FC',
  card: '#FFFFFF',
  cardRaised: '#EFF5F2',
  text: '#1C2430',
  muted: '#6F7785',
  accent: '#16A37C',
  accentText: '#FFFFFF',
  warning: '#D9931E',
  danger: '#C94F5C',
  border: '#E5EAF0',
  input: '#F4F7FA',
  shadow: '#1C2430',
};

const darkColors: ThemeColors = {
  background: '#101820',
  card: '#19272A',
  cardRaised: '#203234',
  text: '#F4F7F5',
  muted: '#AEBDB7',
  accent: '#8BE9C1',
  accentText: '#102019',
  warning: '#FFD166',
  danger: '#FF8B8B',
  border: '#2B4140',
  input: '#203234',
  shadow: '#000000',
};

interface ThemeContextValue {
  colors: ThemeColors;
  mode: ThemeMode;
  resolvedMode: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  colors: lightColors,
  mode: 'system',
  resolvedMode: 'light',
  setMode: () => undefined,
});

export function ThemeProvider({children}: {children: ReactNode}) {
  const systemScheme = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>('system');
  const resolvedMode: ResolvedTheme = mode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : mode;
  const value = useMemo(
    () => ({colors: resolvedMode === 'dark' ? darkColors : lightColors, mode, resolvedMode, setMode}),
    [mode, resolvedMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
