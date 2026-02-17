import { toFollowerTier } from '@/common/utils/tier';

describe('toFollowerTier', () => {
  it('classifies T1 for 1k to under 100k', () => {
    expect(toFollowerTier(1000)).toBe('T1');
    expect(toFollowerTier(99999)).toBe('T1');
  });

  it('classifies T2 for 100k to under 500k', () => {
    expect(toFollowerTier(100000)).toBe('T2');
    expect(toFollowerTier(499999)).toBe('T2');
  });

  it('classifies T3 for 500k and above', () => {
    expect(toFollowerTier(500000)).toBe('T3');
    expect(toFollowerTier(1500000)).toBe('T3');
  });
});
