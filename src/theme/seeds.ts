export type SeedOption = {
  name: string;
  color: string;
};

export const DEFAULT_SEED = '#E50914';
export const LEGACY_TERTIARY_BACKGROUND = '#171717';

type HexColor = `#${string}`;

export const mixHex = (
  color: string,
  target: string,
  amount: number,
): HexColor => {
  if (!color || typeof color !== 'string' || !target || typeof target !== 'string') {
    return '#E50914';
  }
  const parse = (value: string) => {
    const clean = value.replace('#', '');
    if (clean.length === 3) {
      return clean.split('').map(c => parseInt(c + c, 16));
    }
    return [0, 2, 4].map(idx => parseInt(clean.slice(idx, idx + 2) || '00', 16));
  };
  try {
    const sourceRgb = parse(color);
    const targetRgb = parse(target);
    const mixed = sourceRgb.map((channel, index) => {
      const c = isNaN(channel) ? 0 : channel;
      const t = isNaN(targetRgb[index]) ? 0 : targetRgb[index];
      return Math.round(c + (t - c) * amount);
    });
    return `#${mixed.map(channel => Math.max(0, Math.min(255, channel)).toString(16).padStart(2, '0')).join('')}`.toUpperCase() as HexColor;
  } catch {
    return '#E50914';
  }
};


export const readableOnColor = (color: string): HexColor => {
  const [red, green, blue] = [1, 3, 5].map(index =>
    parseInt(color.slice(index, index + 2), 16),
  );
  const luminance = (red * 299 + green * 587 + blue * 114) / 1000;
  return luminance > 150 ? '#17100F' : '#FFFFFF';
};

export const createCoherentAccentRoles = (seed: string) => {
  const primary = seed.toUpperCase() as HexColor;
  const primaryContainer = mixHex(primary, '#000000', 0.48);
  const fixed = mixHex(primary, '#FFFFFF', 0.76);
  const fixedDim = mixHex(primary, '#FFFFFF', 0.48);

  return {
    primary,
    onPrimary: readableOnColor(primary),
    primaryContainer,
    onPrimaryContainer: mixHex(primary, '#FFFFFF', 0.82),
    inversePrimary: mixHex(primary, '#000000', 0.25),
    secondary: mixHex(primary, '#FFFFFF', 0.24),
    onSecondary: readableOnColor(mixHex(primary, '#FFFFFF', 0.24)),
    secondaryContainer: mixHex(primary, '#000000', 0.58),
    onSecondaryContainer: mixHex(primary, '#FFFFFF', 0.84),
    tertiary: mixHex(primary, '#FFFFFF', 0.4),
    onTertiary: readableOnColor(mixHex(primary, '#FFFFFF', 0.4)),
    tertiaryContainer: mixHex(primary, '#000000', 0.66),
    onTertiaryContainer: mixHex(primary, '#FFFFFF', 0.86),
    surfaceTint: primary,
    primaryFixed: fixed,
    primaryFixedDim: fixedDim,
    onPrimaryFixed: '#17100F',
    onPrimaryFixedVariant: mixHex(primary, '#000000', 0.55),
    secondaryFixed: fixed,
    secondaryFixedDim: fixedDim,
    onSecondaryFixed: '#17100F',
    onSecondaryFixedVariant: mixHex(primary, '#000000', 0.55),
    tertiaryFixed: fixed,
    tertiaryFixedDim: fixedDim,
    onTertiaryFixed: '#17100F',
    onTertiaryFixedVariant: mixHex(primary, '#000000', 0.55),
    background: mixHex(primary, '#000000', 0.94),
    surface: mixHex(primary, '#000000', 0.94),
    surfaceDim: mixHex(primary, '#000000', 0.94),
    surfaceContainerLowest: mixHex(primary, '#000000', 0.97),
    surfaceContainerLow: mixHex(primary, '#000000', 0.9),
    surfaceContainer: mixHex(primary, '#000000', 0.86),
    surfaceContainerHigh: mixHex(primary, '#000000', 0.81),
    surfaceContainerHighest: mixHex(primary, '#000000', 0.75),
    surfaceBright: mixHex(primary, '#000000', 0.7),
    surfaceVariant: mixHex(primary, '#000000', 0.72),
    onBackground: '#F5F0EF',
    onSurface: '#F5F0EF',
    onSurfaceVariant: '#D4CBC9',
    outline: '#9E9290',
    outlineVariant: '#514846',
  } as const;
};

export const LEGACY_NEUTRAL_SURFACE_ROLES = {
  surface: LEGACY_TERTIARY_BACKGROUND,
  surfaceDim: LEGACY_TERTIARY_BACKGROUND,
  surfaceContainerLowest: LEGACY_TERTIARY_BACKGROUND,
  surfaceContainerLow: LEGACY_TERTIARY_BACKGROUND,
  surfaceContainer: LEGACY_TERTIARY_BACKGROUND,
  surfaceContainerHigh: LEGACY_TERTIARY_BACKGROUND,
  surfaceContainerHighest: LEGACY_TERTIARY_BACKGROUND,
  surfaceBright: LEGACY_TERTIARY_BACKGROUND,
  surfaceVariant: LEGACY_TERTIARY_BACKGROUND,
  onSurface: '#F5F0EF',
  onSurfaceVariant: '#D4CBC9',
  outline: '#938A88',
  outlineVariant: '#494240',
} as const;

/**
 * Curated seed colors. Each one is fed through `SchemeTonalSpot` to generate a
 * full Material 3 palette, so every option yields usable contrast in dark mode.
 */
export const M3_SEEDS: SeedOption[] = [
  {name: 'Cinema Red', color: '#E50914'},
  {name: 'Tomato', color: '#FF6347'},
  {name: 'Blue', color: '#2196F3'},
  {name: 'Emerald', color: '#10B981'},
  {name: 'Purple', color: '#9333EA'},
  {name: 'Amber', color: '#F59E0B'},
  {name: 'White', color: '#FFFFFF'},
];

export const isCuratedSeed = (color: string): boolean =>
  M3_SEEDS.some(seed => seed.color.toLowerCase() === color.toLowerCase());
