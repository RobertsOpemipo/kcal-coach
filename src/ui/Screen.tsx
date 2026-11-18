import type { ReactNode } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { space, useTheme } from '../theme';

interface Props { children: ReactNode; edges?: Edge[]; gap?: number }

/** Scrolling screen with the 16 px gutter and theme background. */
export function Screen({ children, edges = ['top', 'bottom', 'left', 'right'], gap = space.lg }: Props) {
  const { c } = useTheme();
  return (
    <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: space.lg, gap, paddingBottom: space.xxl * 2 }}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
