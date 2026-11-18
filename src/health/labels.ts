import type { ActivityLevel, GoalKind } from '../contracts';

export const ACTIVITY_OPTIONS: readonly { value: ActivityLevel; title: string; hint: string }[] = [
  { value: 'sedentary', title: 'Mostly sitting', hint: 'Desk job, little exercise' },
  { value: 'light', title: 'Lightly active', hint: '1 to 3 sessions a week' },
  { value: 'moderate', title: 'Moderately active', hint: '3 to 5 sessions a week' },
  { value: 'very_active', title: 'Very active', hint: '6 to 7 sessions a week' },
  { value: 'extra_active', title: 'Extra active', hint: 'Physical job plus training' },
];

export const GOAL_OPTIONS: readonly { value: GoalKind; label: string }[] = [
  { value: 'lose', label: 'Lose' },
  { value: 'maintain', label: 'Maintain' },
  { value: 'gain', label: 'Gain' },
];

export const MAINTENANCE_COPY = {
  under_18: 'For under 18s we show a maintenance number only. A weight goal is best set with a doctor or dietitian.',
  pregnant_or_breastfeeding: 'While pregnant or breastfeeding we show a maintenance number only. Please talk to your clinician about your needs.',
  bmi_under_18_5: 'Your BMI is under 18.5, so we show a maintenance number rather than a loss target. A clinician can advise you.',
} as const;
