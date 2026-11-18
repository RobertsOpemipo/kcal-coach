// src/health/index.ts
export * from './units';
export * from './bmi';
export * from './bmr';
export * from './bodyFat';
export * from './idealWeight';
export * from './goals';
export {
  ACTIVITY_FACTORS,
  GOAL_CONFIG,
  REVIEW_STATUS,
  TARGET_GAIN_FRACTION_PER_WEEK_RANGE,
  TARGET_LOSS_FRACTION_PER_WEEK_RANGE,
  TARGET_MAINTAIN_FRACTION_PER_WEEK_TOLERANCE,
  WATER_GOAL_ML,
  WATER_QUICK_ADD_ML,
} from './config/needs-review';
export * from './daySummary';
export * from './profileTarget';
export * from './labels';
export * from './validateProfile';
export * from './weightTrend';