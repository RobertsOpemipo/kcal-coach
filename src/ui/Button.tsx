import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { minTarget, radius, space, useTheme } from '../theme';
import { Txt } from './Txt';

interface Props {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'secondary' | 'quiet';
  disabled?: boolean;
  /** Accent glow: only for Save and Scan. */
  glow?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
}

export function Button({ label, onPress, kind = 'secondary', disabled, glow, style, accessibilityHint }: Props) {
  const { c } = useTheme();
  const bg = kind === 'primary' ? c.accent : kind === 'secondary' ? c.s2 : 'transparent';
  const fg = kind === 'primary' ? 'onAccent' : kind === 'quiet' ? 'accent' : 'ink';
  const border = kind === 'secondary' ? c.line : 'transparent';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.base,
        { backgroundColor: bg, borderColor: border, opacity: disabled ? 0.45 : pressed ? 0.85 : 1 },
        glow && kind === 'primary' && { shadowColor: c.accent, shadowOpacity: 0.45, shadowRadius: 14, shadowOffset: { width: 0, height: 0 }, elevation: 6 },
        style,
      ]}
    >
      <View>
        <Txt v="strong" color={fg} style={{ textAlign: 'center' }}>{label}</Txt>
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  base: {
    minHeight: minTarget + 4, paddingHorizontal: space.lg, borderRadius: radius.md, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
});
