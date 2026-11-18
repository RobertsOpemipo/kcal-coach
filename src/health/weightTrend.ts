// src/health/weightTrend.ts
import type { GoalKind, WeightPoint, WeightTrendSummary } from '../contracts';
import {
  GOAL_CONFIG,
  TARGET_GAIN_FRACTION_PER_WEEK_RANGE,
  TARGET_LOSS_FRACTION_PER_WEEK_RANGE,
  TARGET_MAINTAIN_FRACTION_PER_WEEK_TOLERANCE,
} from './config/needs-review';

/** Window for the moving average, in days (inclusive of today). */
export const MOVING_AVERAGE_WINDOW_DAYS = 7;

/** Window for the weekly rate of change, in days (inclusive of the latest day). */
export const WEEKLY_CHANGE_WINDOW_DAYS = 14;

/** Minimum points required to fit a slope. */
export const MIN_POINTS_FOR_WEEKLY_CHANGE = 3;

export interface MovingAveragePoint {
  localDate: string;
  weightKg: number;
  averageKg: number;
  /** How many deduped points contributed to `averageKg`. Always >= 1. */
  sampleCount: number;
}

// ---------- date helpers (YYYY-MM-DD, no time zone) ----------

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function daysBetween(fromDate: string, toDate: string): number {
  const a = Date.UTC(
    Number(fromDate.slice(0, 4)),
    Number(fromDate.slice(5, 7)) - 1,
    Number(fromDate.slice(8, 10)),
  );
  const b = Date.UTC(
    Number(toDate.slice(0, 4)),
    Number(toDate.slice(5, 7)) - 1,
    Number(toDate.slice(8, 10)),
  );
  return Math.round((b - a) / 86_400_000);
}

/**
 * Sort ascending by date; among same-day entries, sort by `createdAt` if
 * present (ISO lexicographic), then by original array order. Keep only the
 * last (latest) entry per day. This is the "later one wins" rule.
 */
function dedupeByDay(series: readonly WeightPoint[]): WeightPoint[] {
  const indexed = series.map((p, i) => ({ p, i }));
  indexed.sort((x, y) => {
    if (x.p.localDate !== y.p.localDate) return x.p.localDate < y.p.localDate ? -1 : 1;
    const xa = x.p.createdAt ?? '';
    const ya = y.p.createdAt ?? '';
    if (xa !== ya) return xa < ya ? -1 : 1;
    return x.i - y.i;
  });
  const out: WeightPoint[] = [];
  for (const { p } of indexed) {
    const last = out[out.length - 1];
    if (last && last.localDate === p.localDate) out[out.length - 1] = p;
    else out.push(p);
  }
  return out;
}

// ---------- moving average ----------

/**
 * Trailing `windowDays` average of weights, one output row per unique day in
 * the input (same-day duplicates resolved to the later entry). The window is
 * `[localDate - (windowDays - 1), localDate]`, i.e. `windowDays` calendar days
 * including today. Samples with a gap longer than the window simply start
 * from fresh data (sampleCount resets to 1).
 */
export function movingAverage(
  series: readonly WeightPoint[],
  windowDays = MOVING_AVERAGE_WINDOW_DAYS,
): MovingAveragePoint[] {
  if (!(windowDays >= 1)) return [];
  const deduped = dedupeByDay(series);
  const out: MovingAveragePoint[] = [];
  for (let i = 0; i < deduped.length; i++) {
    const here = deduped[i]!;
    const fromDate = addDays(here.localDate, -(windowDays - 1));
    let sum = 0;
    let count = 0;
    for (let j = i; j >= 0; j--) {
      const p = deduped[j]!;
      if (p.localDate < fromDate) break;
      sum += p.weightKg;
      count += 1;
    }
    out.push({
      localDate: here.localDate,
      weightKg: here.weightKg,
      averageKg: sum / count,
      sampleCount: count,
    });
  }
  return out;
}

// ---------- weekly rate ----------

/**
 * Least-squares slope over the last `WEEKLY_CHANGE_WINDOW_DAYS` days, in
 * kg/week. Returns `null` if there are fewer than `MIN_POINTS_FOR_WEEKLY_CHANGE`
 * deduped points inside the window. Same-day duplicates are collapsed to the
 * later entry before fitting.
 *
 * Sign convention: negative = losing weight, positive = gaining weight.
 */
export function weeklyChangeKg(series: readonly WeightPoint[]): number | null {
  const deduped = dedupeByDay(series);
  if (deduped.length === 0) return null;
  const latestDate = deduped[deduped.length - 1]!.localDate;
  const fromDate = addDays(latestDate, -(WEEKLY_CHANGE_WINDOW_DAYS - 1));
  const window = deduped.filter((p) => p.localDate >= fromDate && p.localDate <= latestDate);
  if (window.length < MIN_POINTS_FOR_WEEKLY_CHANGE) return null;

  const n = window.length;
  const x0 = window[0]!.localDate;
  const xs = window.map((p) => daysBetween(x0, p.localDate));
  const ys = window.map((p) => p.weightKg);

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  for (let i = 0; i < n; i++) {
    const x = xs[i]!;
    const y = ys[i]!;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  }
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return null;
  const slopePerDay = (n * sumXY - sumX * sumY) / denom;
  return slopePerDay * 7;
}

// ---------- summary ----------

/**
 * Compare the recent weekly rate against the goal.
 *
 * - `< 3 points` in window  → `'not_enough_data'`
 * - loss > `SAFE_LOSS_FRACTION_PER_WEEK` → `'faster'` (safety; goal-independent)
 * - otherwise compare signed rate to the goal's target band:
 *     lose:    `-hi..-lo`     → on_track; otherwise `'slower'` (incl. gaining)
 *     gain:    `+lo..+hi`     → on_track; above `'faster'`; below `'slower'`
 *     maintain: `|rate| ≤ tol` → on_track; otherwise `'faster'`
 */
export function trendSummary(
  series: readonly WeightPoint[],
  goal: GoalKind,
): WeightTrendSummary {
  const rateKgPerWeek = weeklyChangeKg(series);
  if (rateKgPerWeek === null) return 'not_enough_data';

  const deduped = dedupeByDay(series);
  const latest = deduped[deduped.length - 1];
  if (!latest || !(latest.weightKg > 0)) return 'not_enough_data';

  const rateFractionPerWeek = rateKgPerWeek / latest.weightKg;

  if (rateFractionPerWeek < -GOAL_CONFIG.maxWeeklyLossFraction) return 'faster';

  if (goal === 'lose') {
    const [lo, hi] = TARGET_LOSS_FRACTION_PER_WEEK_RANGE;
    const lossFraction = -rateFractionPerWeek;
    if (lossFraction >= lo && lossFraction <= hi) return 'on_track';
    return 'slower';
  }

  if (goal === 'gain') {
    const [lo, hi] = TARGET_GAIN_FRACTION_PER_WEEK_RANGE;
    if (rateFractionPerWeek >= lo && rateFractionPerWeek <= hi) return 'on_track';
    if (rateFractionPerWeek > hi) return 'faster';
    return 'slower';
  }

  if (Math.abs(rateFractionPerWeek) <= TARGET_MAINTAIN_FRACTION_PER_WEEK_TOLERANCE) {
    return 'on_track';
  }
  return 'faster';
}