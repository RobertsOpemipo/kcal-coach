// Forest Sage tokens. Source of truth: BRD "Brand" section. 46/46 contrast checks pass per mode.
export interface Palette {
  bg: string; s1: string; s2: string; s3: string; s4: string;
  line: string; ctl: string; ink: string; muted: string;
  accent: string; onAccent: string;
  protein: string; carbs: string; fat: string; ok: string; err: string;
}

export const dark: Palette = {
  bg: '#0C1410', s1: '#181F1B', s2: '#212925', s3: '#2D3430', s4: '#3B423E',
  line: '#323934', ctl: '#8D928D', ink: '#F7F9F4', muted: '#ABAFAA',
  accent: '#A8D08D', onAccent: '#070C0A',
  protein: '#8FB0E8', carbs: '#E8CF7A', fat: '#E58F6C', ok: '#6FCB8E', err: '#F3968C',
};

export const light: Palette = {
  bg: '#F1F5EC', s1: '#F9FBF7', s2: '#FEFEFD', s3: '#E3E8DF', s4: '#D6DAD2',
  line: '#CCD1C9', ctl: '#737973', ink: '#0C1410', muted: '#565D58',
  accent: '#4F6243', onAccent: '#FFFFFF',
  protein: '#3B5B8C', carbs: '#7F5712', fat: '#A8502E', ok: '#2F6A3A', err: '#A62B1F',
};

/** Radii in px. No pill shapes. */
export const radius = { sm: 2, md: 6, lg: 10 } as const;
export const hairline = 1;
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const minTarget = 44;

export const fontFamily = {
  display: 'BricolageGrotesque_800ExtraBold',
  displayBold: 'BricolageGrotesque_700Bold',
  body: 'InstrumentSans_400Regular',
  bodyStrong: 'InstrumentSans_600SemiBold',
  mono: 'IBMPlexMono_500Medium',
} as const;

export const logoColors = {
  tile: '#0C1410', k: '#EEF5E6', flame: '#E58F6C',
  sageTile: '#A8D08D', sageK: '#0C1410', sageFlame: '#B8432A',
} as const;
