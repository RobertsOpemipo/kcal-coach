import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { repos } from '../db/app';
import { useQuery } from '../db/useQuery';
import { addDays, dayLabel, lagosDate, lagosHour } from '../db/localDate';
import { ageFromBirthYear } from '../db/profileRepo';
import { MEAL_LABEL, MEAL_SLOTS, defaultMeal } from '../food/meal';
import type { MealSlot, Profile } from '../contracts';
import { MAINTENANCE_COPY, WATER_GOAL_ML, WATER_QUICK_ADD_ML, summariseDay, targetForProfile } from '../health';
import { minTarget, space, useTheme } from '../theme';
import { Bar, Button, Card, Screen, Txt } from '../ui';

export default function Index() {
  const profile = useQuery(() => repos().profile.get());
  if (!profile) return <Redirect href="/onboarding" />;
  return <Today profile={profile} />;
}

function Today({ profile }: { profile: Profile }) {
  const { c } = useTheme();
  const today = lagosDate();
  const [date, setDate] = useState(today);

  const weightKg = useQuery(() => repos().profile.latestWeightKg()) ?? 70;
  const target = targetForProfile(profile, weightKg, ageFromBirthYear(profile.birthYear, today));
  const entries = useQuery(() => repos().log.forDay(date), date);
  const eaten = useQuery(() => repos().log.totalsForDay(date), date);
  const water = useQuery(() => repos().water.totalForDay(date), date);
  const yesterdayCount = useQuery(() => repos().log.forDay(addDays(date, -1)).length, date);
  const sum = summariseDay(target.kcal, target.macros, eaten);
  const over = sum.overKcal > 0;

  const addTo = (meal: MealSlot) => router.push({ pathname: '/add', params: { meal, date } });

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <NavBtn label="Previous day" glyph="‹" onPress={() => setDate(addDays(date, -1))} />
        <Txt v="label" accessibilityRole="header">{dayLabel(date, today)}</Txt>
        <NavBtn label="Next day" glyph="›" onPress={() => setDate(addDays(date, 1))} disabled={date >= today} />
      </View>

      <View style={{ gap: space.sm }}>
        <Txt v="label">{over ? 'Above today’s goal' : 'Kcal left'}</Txt>
        <Txt v="display" accessibilityLabel={`${over ? sum.overKcal : sum.remainingKcal} kilocalories ${over ? 'above goal' : 'left'}`}>
          {over ? sum.overKcal : sum.remainingKcal}
        </Txt>
        <Bar fraction={sum.fraction} height={8} />
        <Txt v="num" color="muted">{Math.round(sum.eatenKcal)} eaten · goal {sum.goalKcal}</Txt>
      </View>

      {target.status === 'maintenance_only' ? (
        <Card><Txt v="small" color="ink">{MAINTENANCE_COPY[target.reason]}</Txt></Card>
      ) : null}

      <Card>
        <MacroRow label="Protein" colour="protein" eaten={sum.protein.eatenG} target={sum.protein.targetG} fraction={sum.protein.fraction} />
        <MacroRow label="Carbs" colour="carbs" eaten={sum.carbs.eatenG} target={sum.carbs.targetG} fraction={sum.carbs.fraction} />
        <MacroRow label="Fat" colour="fat" eaten={sum.fat.eatenG} target={sum.fat.targetG} fraction={sum.fat.fraction} />
      </Card>

      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Txt v="label">Water</Txt>
          <Txt v="num" color="muted">{water} / {WATER_GOAL_ML} ml</Txt>
        </View>
        <Bar fraction={water / WATER_GOAL_ML} color="protein" />
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          {WATER_QUICK_ADD_ML.map((ml) => (
            <Button key={ml} label={`+${ml} ml`} style={{ flex: 1 }} onPress={() => repos().water.add(ml, date)} />
          ))}
          <Button label="Undo" kind="quiet" onPress={() => repos().water.undoLast(date)} disabled={water === 0} />
        </View>
      </Card>

      <Button
        label="Scan your plate"
        kind="primary"
        glow
        onPress={() => router.push({ pathname: '/scan', params: { meal: defaultMeal(lagosHour()), date } })}
      />

      {entries.length === 0 && yesterdayCount > 0 ? (
        <Button label={`Copy yesterday’s meals (${yesterdayCount})`} onPress={() => repos().log.copyDay(addDays(date, -1), date)} />
      ) : null}

      {MEAL_SLOTS.map((slot) => {
        const rows = entries.filter((e) => e.meal === slot);
        const kcal = rows.reduce((t, e) => t + e.kcal, 0);
        return (
          <View key={slot} style={{ gap: space.sm }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <Txt v="title" style={{ fontSize: 18 }}>{MEAL_LABEL[slot]}</Txt>
              <Txt v="num" color="muted">{Math.round(kcal)} kcal</Txt>
            </View>
            {rows.map((e) => (
              <View key={e.id} style={{ flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderColor: c.line, minHeight: minTarget }}>
                <View style={{ flex: 1, paddingVertical: space.sm }}>
                  <Txt v="strong" numberOfLines={1}>{e.name}</Txt>
                  <Txt v="num" color="muted">{Math.round(e.grams)} g · {Math.round(e.kcal)} kcal</Txt>
                </View>
                <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${e.name}`} onPress={() => repos().log.remove(e.id)} style={{ minHeight: minTarget, minWidth: 64, justifyContent: 'center', alignItems: 'flex-end' }}>
                  <Txt v="label" color="muted">Remove</Txt>
                </Pressable>
              </View>
            ))}
            <Button label={`Add to ${MEAL_LABEL[slot].toLowerCase()}`} onPress={() => addTo(slot)} />
          </View>
        );
      })}

      <Txt v="small" style={{ textAlign: 'center' }}>Estimates, not medical advice.</Txt>
    </Screen>
  );
}

function NavBtn({ label, glyph, onPress, disabled }: { label: string; glyph: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress}
      style={{ width: minTarget, height: minTarget, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.3 : 1 }}
    >
      <Txt v="title">{glyph}</Txt>
    </Pressable>
  );
}

function MacroRow({ label, colour, eaten, target, fraction }: { label: string; colour: 'protein' | 'carbs' | 'fat'; eaten: number; target: number; fraction: number }) {
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Txt v="label" color={colour}>{label}</Txt>
        <Txt v="num" color="muted">{Math.round(eaten)} / {Math.round(target)} g</Txt>
      </View>
      <Bar fraction={fraction} color={colour} />
    </View>
  );
}
