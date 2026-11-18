import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { fontFamily, minTarget, radius, space, useTheme } from '../theme';
import { Txt } from './Txt';

interface Props extends Omit<TextInputProps, 'style'> {
  label: string;
  unit?: string;
  error?: string | null;
}

export function Field({ label, unit, error, ...rest }: Props) {
  const { c } = useTheme();
  return (
    <View style={{ gap: space.xs, flex: 1 }}>
      <Txt v="label">{label}</Txt>
      <View style={[s.box, { backgroundColor: c.s1, borderColor: error ? c.err : c.line }]}>
        <TextInput
          {...rest}
          accessibilityLabel={label}
          placeholderTextColor={c.ctl}
          selectionColor={c.accent}
          style={[s.input, { color: c.ink }]}
        />
        {unit ? <Txt v="num" color="muted">{unit}</Txt> : null}
      </View>
      {error ? <Txt v="small" color="err">{error}</Txt> : null}
    </View>
  );
}

const s = StyleSheet.create({
  box: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: radius.md, paddingHorizontal: space.md, minHeight: minTarget + 4 },
  input: { flex: 1, fontFamily: fontFamily.body, fontSize: 17, paddingVertical: 10 },
});
