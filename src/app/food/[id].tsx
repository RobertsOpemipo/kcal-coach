import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { repos } from '../../db/app';
import { lagosDate, lagosHour } from '../../db/localDate';
import { MEAL_LABEL, MEAL_SLOTS, asMeal } from '../../food/meal';
import { nutrientsFor, parsePositive } from '../../food/portion';
import { minTarget, radius, space, useTheme } from '../../theme';
import { Button, Card, Field, Screen, Segmented, Txt } from '../../ui';

const MULTIPLES = [0.5, 1, 1.5, 2] as const;

export default function FoodDetail() {
  const { c } = useTheme();
  const { id, meal: mealParam, date: dateParam } = useLocalSearchParams<{ id: string; meal?: string; date?: string }>();
  const food = repos().food.get(id);
  const [meal, setMeal] = useState(asMeal(mealParam, lagosHour()));
  const [gramsText, setGramsText] = useState(String(food?.portionG ?? 100));

  if (!food) {
    return (
      <Screen edges={['bottom', 'left', 'right']}>
        <Txt>We couldn’t find that food.</Txt>
        <Button label="Back" onPress={() => router.back()} />
      </Screen>
    );
  }

  const grams = parsePositive(gramsText);
  const n = nutrientsFor(food, grams ?? 0);
  const step = (d: number) => setGramsText(String(Math.max(5, Math.round((grams ?? food.portionG) + d))));

  const save = () => {
    if (grams === null) return;
    repos().log.add({
      meal, foodId: food.id, name: food.name, grams, kcal: n.kcal, proteinG: n.proteinG, carbsG: n.carbsG, fatG: n.fatG,
      source: food.origin === 'custom' ? 'custom' : 'manual', localDate: dateParam ?? lagosDate(),
    });
    router.dismissTo('/');
  };

  return (
    <Screen edges={['bottom', 'left', 'right']}>
      <Txt v="title">{food.name}</Txt>

      <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'flex-end' }}>
        <Stepper label="Less" glyph="−" onPress={() => step(-10)} />
        <Field label="Grams" unit="g" value={gramsText} onChangeText={setGramsText} keyboardType="decimal-pad" error={grams === null ? 'Enter an amount in grams' : null} />
        <Stepper label="More" glyph="+" onPress={() => step(10)} />
      </View>

      <View style={{ flexDirection: 'row', gap: space.sm }}>
        {MULTIPLES.map((m) => (
          <Pressable
            key={m} accessibilityRole="button" accessibilityLabel={`${m} times the usual portion`}
            onPress={() => setGramsText(String(Math.round(food.portionG * m)))}
            style={{ flex: 1, minHeight: minTarget, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.line, borderRadius: radius.md, backgroundColor: c.s1 }}
          >
            <Txt v="num">{m}×</Txt>
          </Pressable>
        ))}
      </View>
      <Txt v="small">1× is about {food.portionLabel.toLowerCase()} ({food.portionG} g).</Txt>

      <Card>
        <Txt v="label">This portion</Txt>
        <Txt v="display" style={{ fontSize: 48, lineHeight: 52 }}>{Math.round(n.kcal)} <Txt v="num" color="muted">kcal</Txt></Txt>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Txt v="num" color="protein">P {n.proteinG.toFixed(1)} g</Txt>
          <Txt v="num" color="carbs">C {n.carbsG.toFixed(1)} g</Txt>
          <Txt v="num" color="fat">F {n.fatG.toFixed(1)} g</Txt>
        </View>
        {food.needsReview ? <Txt v="small">Estimate. Recipes and cooks vary.</Txt> : null}
      </Card>

      <View style={{ gap: space.xs }}>
        <Txt v="label">Meal</Txt>
        <Segmented label="Meal" value={meal} onChange={setMeal} options={MEAL_SLOTS.map((s) => ({ value: s, label: s === 'snack' ? 'Snack' : MEAL_LABEL[s] }))} />
      </View>

      <Button label={`Add to ${MEAL_LABEL[meal].toLowerCase()}`} kind="primary" glow disabled={grams === null} onPress={save} />
    </Screen>
  );
}

function Stepper({ label, glyph, onPress }: { label: string; glyph: string; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
      style={{ width: minTarget + 4, height: minTarget + 4, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.line, borderRadius: radius.md, backgroundColor: c.s2 }}
    >
      <Txt v="title">{glyph}</Txt>
    </Pressable>
  );
}
