import { View } from 'react-native';
import { radius, useTheme, type Palette } from '../theme';

interface Props { fraction: number; color?: keyof Palette; height?: number }

/** Flat progress bar. Over-target never turns red. */
export function Bar({ fraction, color = 'accent', height = 6 }: Props) {
  const { c } = useTheme();
  const pct = Math.round(Math.min(1, Math.max(0, fraction)) * 100);
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: pct }}
      style={{ height, borderRadius: radius.sm, backgroundColor: c.s3, overflow: 'hidden' }}
    >
      <View style={{ width: `${pct}%`, height, backgroundColor: c[color], borderRadius: radius.sm }} />
    </View>
  );
}
