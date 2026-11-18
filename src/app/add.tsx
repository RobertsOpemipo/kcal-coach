import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { repos } from '../db/app';
import { useQuery } from '../db/useQuery';
import { lagosDate, lagosHour } from '../db/localDate';
import { MEAL_LABEL, asMeal } from '../food/meal';
import { nutrientsFor } from '../food/portion';
import { searchFoods } from '../food/search';
import { minTarget, radius, space, useTheme } from '../theme';
import { Button, Field, Screen, Txt } from '../ui';

export default function AddFood() {
  const { c } = useTheme();
  const params = useLocalSearchParams<{ meal?: string; date?: string }>();
  const meal = asMeal(params.meal, lagosHour());
  const date = params.date ?? lagosDate();
  const [q, setQ] = useState('');

  const foods = useQuery(() => repos().food.all());
  const recent = useQuery(() => repos().log.recent(8));
  const results = searchFoods(foods, q);

  const row = (key: string, title: string, sub: string, onPress: () => void) => (
    <Pressable
      key={key} accessibilityRole="button" accessibilityLabel={`${title}, ${sub}`} onPress={onPress}
      style={{ minHeight: minTarget + 8, justifyContent: 'center', borderBottomWidth: 1, borderColor: c.line, paddingVertical: space.sm }}
    >
      <Txt v="strong">{title}</Txt>
      <Txt v="num" color="muted">{sub}</Txt>
    </Pressable>
  );

  return (
    <Screen edges={['bottom', 'left', 'right']}>
      <Txt v="label">Adding to {MEAL_LABEL[meal]}</Txt>
      <Field label="Search" value={q} onChangeText={setQ} placeholder="Jollof, dodo, egusi…" autoFocus autoCorrect={false} />

      {q.trim() === '' ? (
        <View style={{ gap: 2 }}>
          {recent.length > 0 ? <Txt v="label">Log again</Txt> : null}
          {recent.map((e) =>
            row(e.id, e.name, `${Math.round(e.grams)} g · ${Math.round(e.kcal)} kcal`, () => {
              repos().log.logAgain(e.id, { meal, localDate: date });
              router.dismissTo('/');
            }),
          )}
        </View>
      ) : (
        <View style={{ gap: 2 }}>
          {results.map((f) =>
            row(f.id, f.name, `${f.portionLabel} · ${Math.round(nutrientsFor(f, f.portionG).kcal)} kcal`, () =>
              router.push({ pathname: '/food/[id]', params: { id: f.id, meal, date } }),
            ),
          )}
          {results.length === 0 ? <Txt color="muted">Nothing found for “{q.trim()}”. You can add it yourself below.</Txt> : null}
        </View>
      )}

      <View style={{ borderRadius: radius.md }}>
        <Button label="Add your own food" onPress={() => router.push({ pathname: '/custom-food', params: { meal, date } })} />
      </View>
    </Screen>
  );
}
