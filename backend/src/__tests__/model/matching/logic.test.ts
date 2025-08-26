import { cleanupAndSortQueue, isExpired, canMatch, selectPartnerFIFO, planPartner } from '../../../model/matching/logic.js';
import type { MatchingTeamInfo } from '../../../model/team/types.js';
import type { MatchingRules } from '../../../model/matching/types.js';

const mkInfo = (teamId: string, memberCount: number, joinedAtISO: string): MatchingTeamInfo => ({
  teamId,
  memberCount,
  joinedAt: joinedAtISO,
});

describe('matching logic (pure)', () => {
  const now = new Date('2024-01-01T00:10:00.000Z');
  const ttlMs = 5 * 60 * 1000; // 5 minutes
  const rules: MatchingRules = { ttlMs };

  it('isExpired detects expired and invalid dates', () => {
    const valid = mkInfo('A', 2, '2024-01-01T00:07:00.000Z'); // within ttl
    const expired = mkInfo('B', 2, '2023-12-31T23:59:00.000Z'); // expired
    const invalid = mkInfo('C', 2, 'not-a-date');
    const future = mkInfo('D', 2, '2025-01-01T00:00:00.000Z');

    expect(isExpired(valid, now, ttlMs)).toBe(false);
    expect(isExpired(expired, now, ttlMs)).toBe(true);
    expect(isExpired(invalid, now, ttlMs)).toBe(true);
    expect(isExpired(future, now, ttlMs)).toBe(true);
  });

  it('cleanupAndSortQueue removes expired and sorts by joinedAt asc; keeps oldest per teamId', () => {
    const q: MatchingTeamInfo[] = [
      mkInfo('X', 2, '2024-01-01T00:06:00.000Z'), // oldest X within TTL
      mkInfo('Y', 3, '2024-01-01T00:09:00.000Z'), // recent Y
      mkInfo('X', 2, '2024-01-01T00:08:00.000Z'), // duplicate X (newer) -> dropped
      mkInfo('Z', 2, 'not-a-date'), // invalid -> expiredIds
      mkInfo('W', 2, '2023-12-31T23:59:00.000Z'), // expired
    ];

    const { valid, expiredIds } = cleanupAndSortQueue(q, now, ttlMs);
    expect(expiredIds.sort()).toEqual(['W', 'Z'].sort());
    // valid: oldest X, then Y (sorted by joinedAt)
    expect(valid.map(v => v.teamId)).toEqual(['X', 'Y']);
  });

  it('canMatch applies equality and delta rules', () => {
    const a = mkInfo('A', 2, '2024-01-01T00:00:00.000Z');
    const b = mkInfo('B', 2, '2024-01-01T00:00:01.000Z');
    const c = mkInfo('C', 4, '2024-01-01T00:00:02.000Z');

    expect(canMatch(a, b, { ttlMs, requireEqualSize: true })).toBe(true);
    expect(canMatch(a, c, { ttlMs, requireEqualSize: true })).toBe(false);

    expect(canMatch(a, c, { ttlMs, maxSizeDelta: 1 })).toBe(false);
    expect(canMatch(a, c, { ttlMs, maxSizeDelta: 2 })).toBe(true);
  });

  it('selectPartnerFIFO picks the oldest non-self candidate', () => {
    const candidates: MatchingTeamInfo[] = [
      mkInfo('A', 2, '2024-01-01T00:02:00.000Z'),
      mkInfo('B', 2, '2024-01-01T00:01:00.000Z'), // oldest
      mkInfo('C', 2, '2024-01-01T00:03:00.000Z'),
    ];
    const self = mkInfo('A', 2, '2024-01-01T00:05:00.000Z');
    const picked = selectPartnerFIFO(self, candidates, rules);
    expect(picked?.teamId).toBe('B');
  });

  it('FIFO tie-breaks by teamId ascending when joinedAt equal', () => {
    const candidates: MatchingTeamInfo[] = [
      mkInfo('C', 2, '2024-01-01T00:09:00.000Z'),
      mkInfo('B', 2, '2024-01-01T00:09:00.000Z'),
      mkInfo('D', 2, '2024-01-01T00:09:00.000Z'),
    ];
    // ensure sorted order via cleanup helper (already sorted if valid)
    const { valid } = cleanupAndSortQueue(candidates, now, ttlMs);
    expect(valid.map(v => v.teamId)).toEqual(['B', 'C', 'D']);
    const self = mkInfo('A', 2, '2024-01-01T00:05:00.000Z');
    const picked = selectPartnerFIFO(self, valid, rules);
    expect(picked?.teamId).toBe('B');
  });

  it('returns null if only self exists in queue', () => {
    const self = mkInfo('SELF', 2, '2024-01-01T00:05:00.000Z');
    const { partner } = planPartner(self, [self], now, rules);
    expect(partner).toBeNull();
  });

  it('planPartner integrates cleanup and FIFO selection with rules', () => {
    const self = mkInfo('A', 2, '2024-01-01T00:05:00.000Z');
    const q: MatchingTeamInfo[] = [
      self,
      mkInfo('B', 2, '2024-01-01T00:06:00.000Z'),
      mkInfo('C', 3, '2024-01-01T00:07:00.000Z'),
      mkInfo('D', 2, '2023-12-31T23:59:00.000Z'), // expired
    ];
    const { partner, expiredIds, valid } = planPartner(self, q, now, rules);
    expect(expiredIds).toEqual(['D']);
    expect(valid.map(v => v.teamId)).toEqual(['A', 'B', 'C']);
    expect(partner?.teamId).toBe('B');
  });

  it('planPartner respects requireEqualSize rule', () => {
    const self = mkInfo('A', 2, '2024-01-01T00:05:00.000Z');
    const q: MatchingTeamInfo[] = [
      self,
      mkInfo('B', 3, '2024-01-01T00:06:00.000Z'),
      mkInfo('C', 2, '2024-01-01T00:07:00.000Z'),
    ];
    const { partner } = planPartner(self, q, now, { ttlMs, requireEqualSize: true });
    expect(partner?.teamId).toBe('C');
  });
});
