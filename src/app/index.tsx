import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fontFamily, radius, space, useTheme } from '../theme';
import { KcalLogo } from '../ui/KcalLogo';

/** Phase 0 placeholder. The real Today screen is phase 1. */
export default function Home() {
  const { c } = useTheme();
  return (
    <SafeAreaView style={[s.root, { backgroundColor: c.bg }]}>
      <KcalLogo size={72} />
      <Text style={[s.word, { color: c.ink }]}>
        Kcal <Text style={{ color: c.accent, fontFamily: fontFamily.displayBold }}>Coach</Text>
      </Text>
      <View style={[s.card, { backgroundColor: c.s1, borderColor: c.line }]}>
        <Text style={[s.label, { color: c.muted }]}>PHASE 0 · FOUNDATIONS</Text>
        <Text style={[s.body, { color: c.ink }]}>Theme, health engine and local database are in place.</Text>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.lg, paddingHorizontal: space.lg },
  word: { fontFamily: fontFamily.display, fontSize: 36, letterSpacing: -1.4 },
  card: { borderWidth: 1, borderRadius: radius.md, padding: space.lg, gap: space.sm, alignSelf: 'stretch' },
  label: { fontFamily: fontFamily.mono, fontSize: 11, letterSpacing: 1.2 },
  body: { fontFamily: fontFamily.body, fontSize: 15, lineHeight: 22 },
});
