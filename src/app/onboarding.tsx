import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import type { ActivityLevel, GoalKind, Sex, Units } from '../contracts';
import { repos } from '../db/app';
import { lagosDate } from '../db/localDate';
import { ACTIVITY_OPTIONS, GOAL_OPTIONS, parseBody, type BodyErrors } from '../health';
import { minTarget, radius, space, useTheme } from '../theme';
import { Button, Card, Field, KcalLogo, Screen, Segmented, Txt } from '../ui';

export default function Onboarding() {
  const { c } = useTheme();
  const [units, setUnits] = useState<Units>('metric');
  const [sex, setSex] = useState<Sex>('female');
  const [birthYear, setBirthYear] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [feet, setFeet] = useState('');
  const [inches, setInches] = useState('');
  const [weight, setWeight] = useState('');
  const [activity, setActivity] = useState<ActivityLevel>('light');
  const [goal, setGoal] = useState<GoalKind>('maintain');
  const [pregnant, setPregnant] = useState(false);
  const [errors, setErrors] = useState<BodyErrors>({});

  const save = () => {
    const r = parseBody({ units, heightCm, feet, inches, weight, birthYear }, Number(lagosDate().slice(0, 4)));
    if (!r.ok) return setErrors(r.errors);
    setErrors({});
    repos().profile.save(
      { sex, birthYear: r.birthYear, heightCm: r.heightCm, activity, goal, units, pregnantOrBreastfeeding: sex === 'female' && pregnant },
      r.weightKg,
    );
    router.replace('/');
  };

  return (
    <Screen>
      <View style={{ gap: space.md }}>
        <KcalLogo size={48} />
        <Txt v="title">Let’s work out your daily number</Txt>
        <Txt color="muted">A few details, kept on this phone. You can change them later.</Txt>
      </View>

      <Segmented label="Units" value={units} onChange={setUnits} options={[{ value: 'metric', label: 'kg · cm' }, { value: 'imperial', label: 'lb · ft' }]} />

      <View style={{ gap: space.xs }}>
        <Txt v="label">Sex</Txt>
        <Segmented label="Sex" value={sex} onChange={setSex} options={[{ value: 'female', label: 'Female' }, { value: 'male', label: 'Male' }]} />
        <Txt v="small">Used only in the calorie formula.</Txt>
      </View>

      {sex === 'female' ? (
        <View style={{ gap: space.xs }}>
          <Txt v="label">Pregnant or breastfeeding</Txt>
          <Segmented label="Pregnant or breastfeeding" value={pregnant ? 'yes' : 'no'} onChange={(v) => setPregnant(v === 'yes')} options={[{ value: 'no', label: 'No' }, { value: 'yes', label: 'Yes' }]} />
        </View>
      ) : null}

      <Field label="Year you were born" value={birthYear} onChangeText={setBirthYear} keyboardType="number-pad" maxLength={4} placeholder="1995" error={errors.birthYear} />

      {units === 'metric' ? (
        <View style={{ flexDirection: 'row', gap: space.md }}>
          <Field label="Height" unit="cm" value={heightCm} onChangeText={setHeightCm} keyboardType="decimal-pad" placeholder="170" error={errors.height} />
          <Field label="Weight" unit="kg" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" placeholder="70" error={errors.weight} />
        </View>
      ) : (
        <View style={{ gap: space.md }}>
          <View style={{ flexDirection: 'row', gap: space.md }}>
            <Field label="Height" unit="ft" value={feet} onChangeText={setFeet} keyboardType="number-pad" placeholder="5" error={errors.height} />
            <Field label="Inches" unit="in" value={inches} onChangeText={setInches} keyboardType="decimal-pad" placeholder="7" />
          </View>
          <Field label="Weight" unit="lb" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" placeholder="154" error={errors.weight} />
        </View>
      )}

      <View style={{ gap: space.sm }}>
        <Txt v="label">How active are you?</Txt>
        {ACTIVITY_OPTIONS.map((o) => {
          const on = o.value === activity;
          return (
            <Pressable
              key={o.value}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              onPress={() => setActivity(o.value)}
              style={{
                minHeight: minTarget + 8, borderRadius: radius.md, borderWidth: on ? 2 : 1, borderColor: on ? c.accent : c.line,
                backgroundColor: c.s1, paddingHorizontal: space.md, paddingVertical: space.sm, justifyContent: 'center',
              }}
            >
              <Txt v="strong">{o.title}</Txt>
              <Txt v="small">{o.hint}</Txt>
            </Pressable>
          );
        })}
      </View>

      <View style={{ gap: space.xs }}>
        <Txt v="label">Your goal</Txt>
        <Segmented label="Your goal" value={goal} onChange={setGoal} options={GOAL_OPTIONS} />
      </View>

      <Card>
        <Txt v="small">Kcal Coach gives estimates, not medical advice. Numbers are a starting point you can adjust.</Txt>
      </Card>

      <Button label="Save and continue" kind="primary" glow onPress={save} />
    </Screen>
  );
}
