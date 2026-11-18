import { describe, expect, it } from 'vitest';
import { addDays, dayLabel } from '../db/localDate';
import type { Profile } from '../contracts';
import { MAINTENANCE_COPY, parseBody, targetForProfile } from './index';

const profile: Profile = {
  sex: 'male', birthYear: 1996, heightCm: 180, activity: 'moderate', goal: 'maintain', units: 'metric',
  pregnantOrBreastfeeding: false, updatedAt: '2026-11-13T00:00:00Z',
};

describe('targetForProfile', () => {
  it('matches the engine for an adult', () => {
    const t = targetForProfile(profile, 80, 30);
    expect(t.status).toBe('ok');
    expect(t.kcal).toBe(Math.round(1780 * 1.55));
  });
  it('gives maintenance only for a pregnant profile and has copy for every reason', () => {
    const t = targetForProfile({ ...profile, sex: 'female', pregnantOrBreastfeeding: true, goal: 'lose' }, 70, 30);
    expect(t.status).toBe('maintenance_only');
    for (const k of Object.keys(MAINTENANCE_COPY)) expect(MAINTENANCE_COPY[k as keyof typeof MAINTENANCE_COPY].length).toBeGreaterThan(20);
  });
});

describe('parseBody', () => {
  const metric = { units: 'metric', heightCm: '180', feet: '', inches: '', weight: '80', birthYear: '1996' } as const;
  it('accepts valid metric input', () => {
    expect(parseBody(metric, 2026)).toEqual({ ok: true, birthYear: 1996, heightCm: 180, weightKg: 80 });
  });
  it('accepts imperial input and converts', () => {
    const r = parseBody({ units: 'imperial', heightCm: '', feet: '5', inches: '11', weight: '176', birthYear: '1996' }, 2026);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.heightCm).toBeCloseTo(180.34, 2);
      expect(r.weightKg).toBeCloseTo(79.83, 1);
    }
  });
  it('treats blank inches as zero', () => {
    const r = parseBody({ units: 'imperial', heightCm: '', feet: '6', inches: '', weight: '180', birthYear: '1990' }, 2026);
    expect(r.ok).toBe(true);
  });
  it('accepts comma decimals', () => expect(parseBody({ ...metric, weight: '72,5' }, 2026)).toMatchObject({ ok: true, weightKg: 72.5 }));
  it.each([
    ['empty height', { heightCm: '' }, 'height'],
    ['tiny height', { heightCm: '50' }, 'height'],
    ['text weight', { weight: 'abc' }, 'weight'],
    ['huge weight', { weight: '900' }, 'weight'],
    ['future birth year', { birthYear: '2026' }, 'birthYear'],
    ['too old', { birthYear: '1900' }, 'birthYear'],
    ['decimal year', { birthYear: '1996.5' }, 'birthYear'],
  ] as const)('rejects %s', (_n, patch, field) => {
    const r = parseBody({ ...metric, ...patch }, 2026);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[field]).toBeTruthy();
  });
});

describe('day helpers', () => {
  it('shifts across month and year ends', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2028-03-01', -1)).toBe('2028-02-29');
  });
  it('labels days', () => {
    expect(dayLabel('2026-11-13', '2026-11-13')).toBe('Today');
    expect(dayLabel('2026-11-12', '2026-11-13')).toBe('Yesterday');
    expect(dayLabel('2026-11-14', '2026-11-13')).toBe('Tomorrow');
    expect(dayLabel('2026-11-09', '2026-11-13')).toBe('Mon 9 Nov');
  });
});
