import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
} from '@expo-google-fonts/bricolage-grotesque';
import { InstrumentSans_400Regular, InstrumentSans_600SemiBold } from '@expo-google-fonts/instrument-sans';
import { IBMPlexMono_500Medium } from '@expo-google-fonts/ibm-plex-mono';
import { fontFamily, ThemeProvider, useTheme } from '../theme';

function Shell() {
  const { c, mode } = useTheme();
  const withHeader = {
    headerShown: true,
    headerStyle: { backgroundColor: c.bg },
    headerTintColor: c.ink,
    headerTitleStyle: { fontFamily: fontFamily.displayBold, color: c.ink },
    headerShadowVisible: false,
  } as const;
  return (
    <>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
        <Stack.Screen name="add" options={{ ...withHeader, title: 'Add food' }} />
        <Stack.Screen name="food/[id]" options={{ ...withHeader, title: 'Portion' }} />
        <Stack.Screen name="scan" options={{ ...withHeader, title: 'Scan' }} />
        <Stack.Screen name="custom-food" options={{ ...withHeader, title: 'Your own food' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
    InstrumentSans_400Regular,
    InstrumentSans_600SemiBold,
    IBMPlexMono_500Medium,
  });
  if (!loaded) return null;
  return (
    <ThemeProvider>
      <Shell />
    </ThemeProvider>
  );
}
