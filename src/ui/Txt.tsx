import { Text, type TextProps, type TextStyle } from 'react-native';
import { fontFamily, useTheme, type Palette } from '../theme';

export type TxtVariant = 'display' | 'title' | 'body' | 'strong' | 'label' | 'num' | 'small';

const base: Record<TxtVariant, TextStyle> = {
  display: { fontFamily: fontFamily.display, fontSize: 64, letterSpacing: -2.6, lineHeight: 68, fontVariant: ['tabular-nums'] },
  title: { fontFamily: fontFamily.displayBold, fontSize: 22, letterSpacing: -0.6, lineHeight: 28 },
  body: { fontFamily: fontFamily.body, fontSize: 16, lineHeight: 23 },
  strong: { fontFamily: fontFamily.bodyStrong, fontSize: 16, lineHeight: 23 },
  small: { fontFamily: fontFamily.body, fontSize: 13, lineHeight: 18 },
  label: { fontFamily: fontFamily.mono, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', lineHeight: 16 },
  num: { fontFamily: fontFamily.mono, fontSize: 14, fontVariant: ['tabular-nums'] },
};

interface Props extends TextProps {
  v?: TxtVariant;
  color?: keyof Palette;
}

export function Txt({ v = 'body', color, style, ...rest }: Props) {
  const { c } = useTheme();
  const col = color ?? (v === 'label' || v === 'small' ? 'muted' : 'ink');
  return <Text {...rest} style={[base[v], { color: c[col] }, style]} />;
}
