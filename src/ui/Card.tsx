import { View, type ViewProps } from 'react-native';
import { radius, space, useTheme } from '../theme';

export function Card({ style, ...rest }: ViewProps) {
  const { c } = useTheme();
  return (
    <View
      {...rest}
      style={[{ backgroundColor: c.s1, borderColor: c.line, borderWidth: 1, borderRadius: radius.lg, padding: space.lg, gap: space.md }, style]}
    />
  );
}
