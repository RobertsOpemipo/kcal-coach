import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { repos } from '../db/app';
import { lagosDate, lagosHour } from '../db/localDate';
import { asMeal } from '../food/meal';
import { nutrientsFor } from '../food/portion';
import { describeConfidence, isEngineAvailable, isNotSure, scanPhoto, type ScanOutcome } from '../scan';
import { minTarget, radius, space, useTheme } from '../theme';
import { Button, Card, Screen, Txt } from '../ui';

type Phase = { kind: 'camera' } | { kind: 'working'; uri: string } | { kind: 'result'; uri: string; outcome: ScanOutcome } | { kind: 'error'; message: string };

export default function Scan() {
  const { c } = useTheme();
  const params = useLocalSearchParams<{ meal?: string; date?: string }>();
  const meal = asMeal(params.meal, lagosHour());
  const date = params.date ?? lagosDate();
  const [permission, requestPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);
  const [phase, setPhase] = useState<Phase>({ kind: 'camera' });
  const engineReady = isEngineAvailable();

  const analyse = async (uri: string) => {
    setPhase({ kind: 'working', uri });
    try {
      setPhase({ kind: 'result', uri, outcome: await scanPhoto(uri) });
    } catch (e) {
      setPhase({ kind: 'error', message: e instanceof Error ? e.message : String(e) });
    }
  };

  const shoot = async () => {
    const pic = await camera.current?.takePictureAsync({ quality: 0.8, skipProcessing: false });
    if (pic) await analyse(pic.uri);
  };

  const pickFromGallery = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    const asset = r.assets?.[0];
    if (!r.canceled && asset) await analyse(asset.uri);
  };

  const search = () => router.replace({ pathname: '/add', params: { meal, date } });
  const choose = (id: string) => router.replace({ pathname: '/food/[id]', params: { id, meal, date } });

  if (!engineReady) {
    return (
      <Screen edges={['bottom', 'left', 'right']}>
        <Card>
          <Txt v="strong">Scanning needs the development build</Txt>
          <Txt color="muted">The on-device model can’t run in Expo Go. Build the app with `npx expo run:android`, or search for your food instead.</Txt>
        </Card>
        <Button label="Search for a food" kind="primary" onPress={search} />
      </Screen>
    );
  }

  if (phase.kind === 'working') {
    return (
      <Screen edges={['bottom', 'left', 'right']}>
        <Image source={{ uri: phase.uri }} style={s.thumb} accessibilityIgnoresInvertColors />
        <View style={{ flexDirection: 'row', gap: space.md, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={c.accent} />
          <Txt>Looking at your plate…</Txt>
        </View>
      </Screen>
    );
  }

  if (phase.kind === 'error') {
    return (
      <Screen edges={['bottom', 'left', 'right']}>
        <Card>
          <Txt v="strong">We couldn’t read that photo</Txt>
          <Txt v="small">{phase.message}</Txt>
        </Card>
        <Button label="Try again" kind="primary" onPress={() => setPhase({ kind: 'camera' })} />
        <Button label="Search for a food" onPress={search} />
      </Screen>
    );
  }

  if (phase.kind === 'result') {
    const { outcome } = phase;
    const foods = outcome.candidates
      .map((cand) => ({ cand, food: repos().food.get(cand.foodId) }))
      .filter((x): x is { cand: typeof x.cand; food: NonNullable<typeof x.food> } => x.food !== null);
    const unsure = isNotSure(outcome.candidates);
    return (
      <Screen edges={['bottom', 'left', 'right']}>
        <Image source={{ uri: phase.uri }} style={s.thumb} accessibilityIgnoresInvertColors />
        {outcome.isPlaceholder ? (
          <Card>
            <Txt v="strong">Demo model</Txt>
            <Txt v="small">These guesses are not real yet. The real model arrives once it is trained on your dish photos.</Txt>
          </Card>
        ) : null}
        <Txt v="title">{unsure ? 'Not sure. Is it one of these?' : 'Is it one of these?'}</Txt>
        {foods.map(({ cand, food }) => (
          <Pressable
            key={food.id} accessibilityRole="button" accessibilityLabel={`${food.name}, ${describeConfidence(cand.probability)}`}
            onPress={() => choose(food.id)}
            style={{ minHeight: minTarget + 12, borderRadius: radius.md, borderWidth: 1, borderColor: c.line, backgroundColor: c.s1, padding: space.md, flexDirection: 'row', alignItems: 'center', gap: space.md }}
          >
            <View style={{ flex: 1 }}>
              <Txt v="strong">{food.name}</Txt>
              <Txt v="num" color="muted">{food.portionLabel} · {Math.round(nutrientsFor(food, food.portionG).kcal)} kcal</Txt>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Txt v="label">{describeConfidence(cand.probability)}</Txt>
              <Txt v="num" color="muted">{Math.round(cand.probability * 100)}%</Txt>
            </View>
          </Pressable>
        ))}
        <Button label="None of these, search" onPress={search} />
        <Button label="Retake" kind="quiet" onPress={() => setPhase({ kind: 'camera' })} />
        <Txt v="small" style={{ textAlign: 'center' }}>Analysed on this phone in {outcome.ms} ms. Nothing was uploaded.</Txt>
      </Screen>
    );
  }

  // camera phase
  if (!permission) return <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} />;
  if (!permission.granted) {
    return (
      <Screen edges={['bottom', 'left', 'right']}>
        <Card>
          <Txt v="strong">Let Kcal Coach use the camera</Txt>
          <Txt color="muted">The camera is used only to recognise your plate. Photos are analysed on this phone and never uploaded.</Txt>
        </Card>
        <Button label="Allow camera" kind="primary" onPress={requestPermission} />
        <Button label="Choose a photo instead" onPress={pickFromGallery} />
        <Button label="Search for a food" kind="quiet" onPress={search} />
      </Screen>
    );
  }

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ flex: 1, margin: space.lg, borderRadius: radius.lg, overflow: 'hidden' }}>
        <CameraView ref={camera} style={{ flex: 1 }} facing="back" />
        <View pointerEvents="none" style={s.guideWrap}>
          <View style={[s.guide, { borderColor: c.accent }]} />
        </View>
        <Txt v="small" style={s.caption} color="ink">Fit your plate in the square</Txt>
      </View>
      <View style={{ paddingHorizontal: space.lg, paddingBottom: space.lg, gap: space.sm }}>
        <Button label="Scan plate" kind="primary" glow onPress={shoot} />
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <Button label="Choose photo" style={{ flex: 1 }} onPress={pickFromGallery} />
          <Button label="Search" style={{ flex: 1 }} onPress={search} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  thumb: { width: '100%', aspectRatio: 1, borderRadius: radius.lg },
  guideWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  guide: { width: '78%', aspectRatio: 1, borderWidth: 2, borderRadius: radius.lg },
  caption: { position: 'absolute', bottom: space.md, alignSelf: 'center', textShadowColor: '#000', textShadowRadius: 4 },
});
