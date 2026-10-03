import React, {useMemo} from 'react';
import {View} from 'react-native';
import {vars} from 'nativewind';
import {getMaterialColors, isDynamicColorAvailable} from '@expo/ui/jetpack-compose';
import {M3_COLOR_ROLES, roleToCssVar} from './colors';
import {
  createCoherentAccentRoles,
  DEFAULT_SEED,
  LEGACY_NEUTRAL_SURFACE_ROLES,
} from './seeds';
import {M3HostThemeContext, M3PaletteContext} from './M3PaletteContext';
import useThemeStore from '../lib/zustand/themeStore';

export const FIXED_THEME_PRIMARY = '#E50914';

export const RED_PALETTE = {
  primary: '#E50914',
  onPrimary: '#FFFFFF',
  primaryContainer: '#450005',
  onPrimaryContainer: '#FFDAD8',
  inversePrimary: '#FFB3B3',
  secondary: '#E50914',
  onSecondary: '#FFFFFF',
  secondaryContainer: '#E50914',
  onSecondaryContainer: '#FFFFFF',
  secondaryFixed: '#FFDAD8',
  secondaryFixedDim: '#FFB3B3',
  onSecondaryFixed: '#410004',
  tertiary: '#FF3B47',
  onTertiary: '#FFFFFF',
  tertiaryContainer: '#540008',
  onTertiaryContainer: '#FFDAD8',
  surfaceTint: '#E50914',
  primaryFixed: '#FFDAD8',
  primaryFixedDim: '#FFB3B3',
  onPrimaryFixed: '#410004',
  onPrimaryFixedVariant: '#733333',
} as const;

export const M3ThemeProvider = ({children}: {children: React.ReactNode}) => {
  const source = useThemeStore(state => state.source);
  const primary = useThemeStore(state => state.primary) || '#E50914';

  const palette = useMemo(() => {
    let generatedPalette: any;
    try {
      if (source === 'wallpaper' && isDynamicColorAvailable) {
        generatedPalette = getMaterialColors({scheme: 'dark'});
      } else {
        generatedPalette = getMaterialColors({
          scheme: 'dark',
          seedColor: primary,
        });
      }
    } catch {
      generatedPalette = createCoherentAccentRoles(primary);
    }

    const isRedTheme = primary.toLowerCase() === '#e50914' && source !== 'wallpaper';

    return {
      ...generatedPalette,
      ...(isRedTheme ? RED_PALETTE : {}),
      primary: isRedTheme ? '#E50914' : (generatedPalette?.primary || primary),
      secondary: isRedTheme ? '#E50914' : (generatedPalette?.secondary || primary),
      secondaryContainer: isRedTheme ? '#E50914' : (generatedPalette?.secondaryContainer || primary),
      onSecondaryContainer: isRedTheme ? '#FFFFFF' : (generatedPalette?.onSecondaryContainer || '#FFFFFF'),
      surfaceTint: isRedTheme ? '#E50914' : (generatedPalette?.surfaceTint || primary),
      ...LEGACY_NEUTRAL_SURFACE_ROLES,
      background: '#000000',
      surface: '#0B0B0E',
      surfaceDim: '#070709',
      surfaceBright: '#18181E',
      surfaceContainerLowest: '#000000',
      surfaceContainerLow: '#0E0E12',
      surfaceContainer: '#141418',
      surfaceContainerHigh: '#1A1A20',
      surfaceContainerHighest: '#22222A',
      onBackground: '#F2F2F2',
      onSurface: '#F2F2F2',
      onSurfaceVariant: '#A0A0AA',
      outline: '#70707C',
      outlineVariant: '#2A2A32',
    } as const;
  }, [source, primary]);

  const hostTheme = useMemo(
    () => ({
      colorScheme: 'dark' as const,
      seedColor: primary,
    }),
    [primary],
  );

  const style = useMemo(() => {
    const entries = M3_COLOR_ROLES.map(role => [
      roleToCssVar(role),
      palette[role],
    ]);
    return vars(Object.fromEntries(entries));
  }, [palette]);

  return (
    <M3HostThemeContext.Provider value={hostTheme}>
      <M3PaletteContext.Provider value={palette}>
        <View style={[{flex: 1}, style]}>{children}</View>
      </M3PaletteContext.Provider>
    </M3HostThemeContext.Provider>
  );
};

export {useM3Colors} from './M3PaletteContext';
