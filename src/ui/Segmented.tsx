import { Pressable, StyleSheet, View } from 'react-native';
import { minTarget, radius, useTheme } from '../theme';
import { Txt } from './Txt';

interface Props<T extends string> {
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}

/** Equal-width segmented control with square-ish corners (no pills). */
export function Segmented<T extends string>({ value, options, onChange, label }: Props<T>) {
  const { c } = useTheme();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={[s.row, { borderColor: c.line, backgroundColor: c.s1 }]}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o.value)}
            style={[s.seg, on && { backgroundColor: c.accent }]}
          >
            <Txt v="strong" color={on ? 'onAccent' : 'ink'} style={{ fontSize: 14 }}>{o.label}</Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', borderWidth: 1, borderRadius: radius.md, padding: 3, gap: 3 },
  seg: { flex: 1, minHeight: minTarget - 4, borderRadius: radius.md - 2, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
});
