import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { repos } from '../db/app';
import { parsePositive } from '../food/portion';
import { space } from '../theme';
import { Button, Field, Screen, Txt } from '../ui';

const optional = (t: string): number | null => (t.trim() === '' ? 0 : t.trim() === '0' ? 0 : parsePositive(t));

export default function CustomFood() {
  const { meal, date } = useLocalSearchParams<{ meal?: string; date?: string }>();
  const [name, setName] = useState('');
  const [kcal, setKcal] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [portion, setPortion] = useState('100');
  const [tried, setTried] = useState(false);

  const k = parsePositive(kcal);
  const p = optional(protein), cb = optional(carbs), f = optional(fat), pg = parsePositive(portion);
  const valid = name.trim().length > 0 && k !== null && p !== null && cb !== null && f !== null && pg !== null;

  const save = () => {
    setTried(true);
    if (!valid) return;
    const food = repos().food.addCustom({
      name, kcalPer100g: k, proteinPer100g: p, carbsPer100g: cb, fatPer100g: f, portionG: pg,
    });
    router.replace({ pathname: '/food/[id]', params: { id: food.id, ...(meal ? { meal } : {}), ...(date ? { date } : {}) } });
  };

  return (
    <Screen edges={['bottom', 'left', 'right']}>
      <Txt color="muted">Enter the numbers from the label, per 100 g.</Txt>
      <Field label="Name" value={name} onChangeText={setName} placeholder="Mama's jollof" error={tried && !name.trim() ? 'Give it a name' : null} />
      <Field label="Energy" unit="kcal" value={kcal} onChangeText={setKcal} keyboardType="decimal-pad" error={tried && k === null ? 'Enter kcal per 100 g' : null} />
      <View style={{ flexDirection: 'row', gap: space.md }}>
        <Field label="Protein" unit="g" value={protein} onChangeText={setProtein} keyboardType="decimal-pad" placeholder="0" />
        <Field label="Carbs" unit="g" value={carbs} onChangeText={setCarbs} keyboardType="decimal-pad" placeholder="0" />
        <Field label="Fat" unit="g" value={fat} onChangeText={setFat} keyboardType="decimal-pad" placeholder="0" />
      </View>
      <Field label="Usual portion" unit="g" value={portion} onChangeText={setPortion} keyboardType="decimal-pad" error={tried && pg === null ? 'Enter a portion in grams' : null} />
      <Button label="Save food" kind="primary" glow onPress={save} />
    </Screen>
  );
}
