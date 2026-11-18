// src/health/weightTrend.test.ts
import { describe, it, expect } from 'vitest';
import type { WeightPoint } from '../contracts';
import {
  movingAverage,
  weeklyChangeKg,
  trendSummary,
  MIN_POINTS_FOR_WEEKLY_CHANGE,
} from './weightTrend';

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function dailySeries(startDate: string, n: number, startKg: number, delta: number): WeightPoint[] {
  const out: WeightPoint[] = [];
  for (let i = 0; i < n; i++) {
    out.push({ localDate: addDays(startDate, i), weightKg: startKg + delta * i });
  }
  return out;
}

describe('weeklyChangeKg — known slopes', () => {
  it('14 daily points, 80 → 79.35 (delta -0.05/day): slope = -0.35 kg/week', () => {
    const s = dailySeries('2026-01-01', 14, 80, -0.05);
    expect(weeklyChangeKg(s)).toBeCloseTo(-0.35, 6);
  });

  it('14 daily points, 80 → 81.3 (delta +0.1/day): slope = +0.7 kg/week', () => {
    const s = dailySeries('2026-01-01', 14, 80, 0.1);
    expect(weeklyChangeKg(s)).toBeCloseTo(0.7, 6);
  });

  // REPLACE the "3 points at day 0/7/14 …" test with this:

it('drops points outside the 14-day window; three consecutive days fit and give an exact slope', () => {
  // Span 14 (days 0/7/14): the oldest point is 14 days before the latest,
  // one day outside a 14-date inclusive window → only 2 points → null.
  const tooWide: WeightPoint[] = [
    { localDate: '2026-01-01', weightKg: 80 },
    { localDate: '2026-01-08', weightKg: 79.5 },
    { localDate: '2026-01-15', weightKg: 79 },
  ];
  expect(weeklyChangeKg(tooWide)).toBeNull();

  // 3 consecutive days (span 2): all inside the window, perfectly linear
  // data → OLS reproduces the exact per-day slope. -0.1 kg/day × 7 = -0.7 kg/week.
  const threeDaily: WeightPoint[] = [
    { localDate: '2026-01-01', weightKg: 80 },
    { localDate: '2026-01-02', weightKg: 79.9 },
    { localDate: '2026-01-03', weightKg: 79.8 },
  ];
  expect(weeklyChangeKg(threeDaily)).toBeCloseTo(-0.7, 6);
  });
});

describe('weeklyChangeKg — gating and window', () => {
  it('returns null for fewer than MIN_POINTS_FOR_WEEKLY_CHANGE points', () => {
    expect(weeklyChangeKg([])).toBeNull();
    expect(weeklyChangeKg([{ localDate: '2026-01-01', weightKg: 80 }])).toBeNull();
    expect(weeklyChangeKg([
      { localDate: '2026-01-01', weightKg: 80 },
      { localDate: '2026-01-02', weightKg: 79.9 },
    ])).toBeNull();
    expect(MIN_POINTS_FOR_WEEKLY_CHANGE).toBe(3);
  });

  it('ignores points older than 14 days before the latest', () => {
    const s: WeightPoint[] = [
      { localDate: '2026-01-01', weightKg: 80 },
      { localDate: '2026-01-15', weightKg: 79.5 },
      { localDate: '2026-01-18', weightKg: 79.3 },
      { localDate: '2026-01-22', weightKg: 79.0 },
    ];
    // Offsets from 01-15: 0, 3, 7. y = 79.5, 79.3, 79.0.
    //   n=3, sumX=10, sumY=237.8, sumXY=790.9, sumXX=58
    //   slope/day = -5.3/74 → ×7 = -0.50135... kg/week.
    expect(weeklyChangeKg(s)).toBeCloseTo(-0.50135, 4);
  });

  it('uses the later of two same-day entries (via createdAt)', () => {
    const s: WeightPoint[] = [
      { localDate: '2026-01-01', weightKg: 80, createdAt: '2026-01-01T08:00:00Z' },
      { localDate: '2026-01-05', weightKg: 80, createdAt: '2026-01-05T08:00:00Z' },
      { localDate: '2026-01-05', weightKg: 79.5, createdAt: '2026-01-05T20:00:00Z' },
      { localDate: '2026-01-10', weightKg: 79, createdAt: '2026-01-10T08:00:00Z' },
    ];
    // After dedupe: (01-01,80), (01-05,79.5), (01-10,79).
    //   offsets 0, 4, 9. y = 80, 79.5, 79.
    //   slope/day = -13.5/122 → ×7 = -0.77459... kg/week.
    expect(weeklyChangeKg(s)).toBeCloseTo(-0.77459, 4);
  });

  it('uses the later-in-array point when createdAt is absent', () => {
    const a: WeightPoint[] = [
      { localDate: '2026-01-01', weightKg: 80 },
      { localDate: '2026-01-05', weightKg: 80 },
      { localDate: '2026-01-05', weightKg: 79.5 },
      { localDate: '2026-01-10', weightKg: 79 },
    ];
    const b: WeightPoint[] = [
      { localDate: '2026-01-01', weightKg: 80 },
      { localDate: '2026-01-05', weightKg: 79.5 },
      { localDate: '2026-01-05', weightKg: 80 },
      { localDate: '2026-01-10', weightKg: 79 },
    ];
    expect(weeklyChangeKg(a)).toBeCloseTo(-0.77459, 4);
    expect(weeklyChangeKg(b)).not.toBeCloseTo(weeklyChangeKg(a)!, 6);
  });
});

describe('movingAverage', () => {
  it('handles a 14-day series with a step at day 7 and a 7-day window', () => {
    const s: WeightPoint[] = [
      ...dailySeries('2026-01-01', 7, 80, 0),
      ...dailySeries('2026-01-08', 7, 79, 0),
    ];
    const a = movingAverage(s, 7);
    expect(a.length).toBe(14);
    expect(a[0]!.sampleCount).toBe(1);
    expect(a[0]!.averageKg).toBeCloseTo(80, 6);
    expect(a[6]!.sampleCount).toBe(7);
    expect(a[6]!.averageKg).toBeCloseTo(80, 6);
    // Day 7 (index 7): days 1..6 (80) + day 7 (79) → 559/7.
    expect(a[7]!.sampleCount).toBe(7);
    expect(a[7]!.averageKg).toBeCloseTo(559 / 7, 6);
    expect(a[13]!.sampleCount).toBe(7);
    expect(a[13]!.averageKg).toBeCloseTo(79, 6);
  });

  it('resets sampleCount across gaps longer than the window', () => {
    const s: WeightPoint[] = [
      { localDate: '2026-01-01', weightKg: 80 },
      { localDate: '2026-01-11', weightKg: 79 },
      { localDate: '2026-01-12', weightKg: 79.5 },
      { localDate: '2026-01-13', weightKg: 79.8 },
    ];
    const a = movingAverage(s, 7);
    expect(a.map((p) => p.sampleCount)).toEqual([1, 1, 2, 3]);
    expect(a[0]!.averageKg).toBeCloseTo(80, 6);
    expect(a[1]!.averageKg).toBeCloseTo(79, 6);
    expect(a[2]!.averageKg).toBeCloseTo((79 + 79.5) / 2, 6);
    expect(a[3]!.averageKg).toBeCloseTo((79 + 79.5 + 79.8) / 3, 6);
  });

  it('collapses two entries on the same day to the later one', () => {
    const s: WeightPoint[] = [
      { localDate: '2026-01-01', weightKg: 80, createdAt: '2026-01-01T08:00:00Z' },
      { localDate: '2026-01-01', weightKg: 79.5, createdAt: '2026-01-01T20:00:00Z' },
    ];
    const a = movingAverage(s, 7);
    expect(a.length).toBe(1);
    expect(a[0]!.weightKg).toBe(79.5);
    expect(a[0]!.averageKg).toBeCloseTo(79.5, 6);
    expect(a[0]!.sampleCount).toBe(1);
  });

  it('windowDays = 1 gives each point as its own average', () => {
    const s = dailySeries('2026-01-01', 3, 80, -1);
    const a = movingAverage(s, 1);
    expect(a.map((p) => p.averageKg)).toEqual([80, 79, 78]);
    expect(a.map((p) => p.sampleCount)).toEqual([1, 1, 1]);
  });

  it('returns [] for empty input or a non-positive window', () => {
    expect(movingAverage([])).toEqual([]);
    expect(movingAverage([{ localDate: '2026-01-01', weightKg: 80 }], 0)).toEqual([]);
  });
});

describe('trendSummary — not enough data', () => {
  it('returns not_enough_data when weeklyChangeKg is null', () => {
    expect(trendSummary([], 'lose')).toBe('not_enough_data');
    expect(trendSummary([{ localDate: '2026-01-01', weightKg: 80 }], 'maintain')).toBe(
      'not_enough_data',
    );
    expect(
      trendSummary(
        [
          { localDate: '2026-01-01', weightKg: 80 },
          { localDate: '2026-01-08', weightKg: 79.5 },
        ],
        'gain',
      ),
    ).toBe('not_enough_data');
  });
});

describe('trendSummary — lose goal', () => {
  it('on_track: -0.35 kg/week at ~79 kg (~-0.44 %)', () => {
    expect(trendSummary(dailySeries('2026-01-01', 14, 80, -0.05), 'lose')).toBe('on_track');
  });
  it('slower: -0.07 kg/week (~-0.09 %)', () => {
    expect(trendSummary(dailySeries('2026-01-01', 14, 80, -0.01), 'lose')).toBe('slower');
  });
  it('faster (safety): -1.05 kg/week at ~78 kg (~-1.35 %)', () => {
    expect(trendSummary(dailySeries('2026-01-01', 14, 80, -0.15), 'lose')).toBe('faster');
  });
  it('slower when gaining on a lose goal (0.35 kg/week, no safety trigger)', () => {
    expect(trendSummary(dailySeries('2026-01-01', 14, 80, 0.05), 'lose')).toBe('slower');
  });
});

describe('trendSummary — gain goal', () => {
  it('on_track: +0.35 kg/week at ~80.65 kg (~+0.43 %)', () => {
    expect(trendSummary(dailySeries('2026-01-01', 14, 80, 0.05), 'gain')).toBe('on_track');
  });
  it('slower: +0.07 kg/week', () => {
    expect(trendSummary(dailySeries('2026-01-01', 14, 80, 0.01), 'gain')).toBe('slower');
  });
  it('faster: +1.05 kg/week at ~81.95 kg (~+1.28 %)', () => {
    expect(trendSummary(dailySeries('2026-01-01', 14, 80, 0.15), 'gain')).toBe('faster');
  });
});

describe('trendSummary — maintain goal', () => {
  it('on_track: stable at 80 kg (rate 0)', () => {
    expect(trendSummary(dailySeries('2026-01-01', 14, 80, 0), 'maintain')).toBe('on_track');
  });
  it('on_track: -0.035 kg/week (~-0.04 %) inside the ±0.5 % band', () => {
    expect(trendSummary(dailySeries('2026-01-01', 14, 80, -0.005), 'maintain')).toBe(
      'on_track',
    );
  });
  it('faster (gaining): +0.7 kg/week at ~81.3 kg (~+0.86 %) > 0.5 %', () => {
    expect(trendSummary(dailySeries('2026-01-01', 14, 80, 0.1), 'maintain')).toBe('faster');
  });
  it('faster (losing, under 1 % safety): -0.7 kg/week at ~78.7 kg (~-0.89 %) > 0.5 %', () => {
    expect(trendSummary(dailySeries('2026-01-01', 14, 80, -0.1), 'maintain')).toBe('faster');
  });
});