import {createContext, useContext, useMemo, useState, type ReactNode} from 'react';
import {useColorScheme} from 'react-native';

export type ThemeMode = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';
export type ThemePalette = 'moss' | 'ocean' | 'sunset' | 'plum' | 'citrus';

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

const mossLightColors: ThemeColors = {
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

const mossDarkColors: ThemeColors = {
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

export interface ThemePaletteDefinition {
  label: string;
  description: string;
  swatch: string;
  light: ThemeColors;
  dark: ThemeColors;
}

export const THEME_PALETTES: Record<ThemePalette, ThemePaletteDefinition> = {
  moss: {
    label: 'Moss',
    description: 'Quiet, grounded, familiar',
    swatch: mossLightColors.accent,
    light: mossLightColors,
    dark: mossDarkColors,
  },
  ocean: {
    label: 'Ocean',
    description: 'Clear, focused, dependable',
    swatch: '#3677D5',
    light: {
      background: '#F5F8FC',
      card: '#FFFFFF',
      cardRaised: '#E9F1FB',
      text: '#17212F',
      muted: '#65738A',
      accent: '#3677D5',
      accentText: '#FFFFFF',
      warning: '#C97A16',
      danger: '#C64858',
      border: '#E0E7F0',
      input: '#F0F5FB',
      shadow: '#1B2A3C',
    },
    dark: {
      background: '#0D1724',
      card: '#152337',
      cardRaised: '#1C3048',
      text: '#F3F7FF',
      muted: '#A9B7CC',
      accent: '#8AB9FF',
      accentText: '#0C1C33',
      warning: '#FFD166',
      danger: '#FF9C9C',
      border: '#2A4260',
      input: '#1C3048',
      shadow: '#000000',
    },
  },
  sunset: {
    label: 'Sunset',
    description: 'Warm, expressive, human',
    swatch: '#D45C43',
    light: {
      background: '#FFF8F5',
      card: '#FFFFFF',
      cardRaised: '#FBEAE2',
      text: '#2A1C1A',
      muted: '#806964',
      accent: '#D45C43',
      accentText: '#FFFFFF',
      warning: '#D98724',
      danger: '#C94F5C',
      border: '#F0DED7',
      input: '#FFF3EF',
      shadow: '#3B231E',
    },
    dark: {
      background: '#221512',
      card: '#30201D',
      cardRaised: '#422823',
      text: '#FFF3EE',
      muted: '#C9AAA1',
      accent: '#FF9A7D',
      accentText: '#341612',
      warning: '#FFD166',
      danger: '#FF9D9D',
      border: '#5A3730',
      input: '#422823',
      shadow: '#000000',
    },
  },
  plum: {
    label: 'Plum',
    description: 'Creative, rich, confident',
    swatch: '#8146C7',
    light: {
      background: '#FBF8FF',
      card: '#FFFFFF',
      cardRaised: '#F1E8FB',
      text: '#2A2032',
      muted: '#756A7D',
      accent: '#8146C7',
      accentText: '#FFFFFF',
      warning: '#C78A1C',
      danger: '#C64A69',
      border: '#E8DFF0',
      input: '#F7F1FC',
      shadow: '#2A2032',
    },
    dark: {
      background: '#18111F',
      card: '#261A30',
      cardRaised: '#342441',
      text: '#F7EEFF',
      muted: '#BDA9C9',
      accent: '#C7A1FF',
      accentText: '#25133E',
      warning: '#FFD166',
      danger: '#FF9AAD',
      border: '#453051',
      input: '#342441',
      shadow: '#000000',
    },
  },
  citrus: {
    label: 'Citrus',
    description: 'Bright, optimistic, energetic',
    swatch: '#B87500',
    light: {
      background: '#FCFAF2',
      card: '#FFFFFF',
      cardRaised: '#F7F0D6',
      text: '#26241A',
      muted: '#7C775F',
      accent: '#B87500',
      accentText: '#FFFFFF',
      warning: '#D28E1B',
      danger: '#C84F5D',
      border: '#ECE5CE',
      input: '#FBF8EC',
      shadow: '#302B1C',
    },
    dark: {
      background: '#1B1A12',
      card: '#282615',
      cardRaised: '#3A361D',
      text: '#FAF7E8',
      muted: '#C6BF98',
      accent: '#FFD66B',
      accentText: '#2D2100',
      warning: '#FFBE55',
      danger: '#FF9D9D',
      border: '#4B4728',
      input: '#3A361D',
      shadow: '#000000',
    },
  },
};

export const THEME_PALETTE_OPTIONS: ReadonlyArray<{value: ThemePalette; label: string; description: string; swatch: string}> = [
  {value: 'moss', label: THEME_PALETTES.moss.label, description: THEME_PALETTES.moss.description, swatch: THEME_PALETTES.moss.swatch},
  {value: 'ocean', label: THEME_PALETTES.ocean.label, description: THEME_PALETTES.ocean.description, swatch: THEME_PALETTES.ocean.swatch},
  {value: 'sunset', label: THEME_PALETTES.sunset.label, description: THEME_PALETTES.sunset.description, swatch: THEME_PALETTES.sunset.swatch},
  {value: 'plum', label: THEME_PALETTES.plum.label, description: THEME_PALETTES.plum.description, swatch: THEME_PALETTES.plum.swatch},
  {value: 'citrus', label: THEME_PALETTES.citrus.label, description: THEME_PALETTES.citrus.description, swatch: THEME_PALETTES.citrus.swatch},
];

interface ThemeContextValue {
  colors: ThemeColors;
  mode: ThemeMode;
  resolvedMode: ResolvedTheme;
  palette: ThemePalette;
  setMode: (mode: ThemeMode) => void;
  setPalette: (palette: ThemePalette) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  colors: mossLightColors,
  mode: 'system',
  resolvedMode: 'light',
  palette: 'moss',
  setMode: () => undefined,
  setPalette: () => undefined,
});

export function ThemeProvider({children}: {children: ReactNode}) {
  const systemScheme = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>('system');
  const [palette, setPalette] = useState<ThemePalette>('moss');
  const resolvedMode: ResolvedTheme = mode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : mode;
  const value = useMemo(
    () => ({colors: THEME_PALETTES[palette][resolvedMode], mode, resolvedMode, palette, setMode, setPalette}),
    [mode, palette, resolvedMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
