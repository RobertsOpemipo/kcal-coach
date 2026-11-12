import { describe, expect, it } from 'vitest';
import { contrast } from './contrast';
import { dark, light, type Palette } from './tokens';

const textOn = (p: Palette): [keyof Palette, keyof Palette][] => {
  const pairs: [keyof Palette, keyof Palette][] = [];
  for (const fg of ['ink', 'muted', 'accent', 'protein', 'carbs', 'fat', 'ok', 'err'] as const)
    for (const bg of ['bg', 's1', 's2'] as const) pairs.push([fg, bg]);
  pairs.push(['onAccent', 'accent']);
  return pairs;
};

describe.each([['dark', dark], ['light', light]] as const)('%s palette', (_n, p) => {
  it.each(textOn(p))('text %s on %s is at least 4.5:1', (fg, bg) => {
    expect(contrast(p[fg], p[bg])).toBeGreaterThanOrEqual(4.5);
  });
  it('control colour is at least 3:1 on every surface', () => {
    for (const bg of ['bg', 's1', 's2'] as const) expect(contrast(p.ctl, p[bg])).toBeGreaterThanOrEqual(3);
  });
});
