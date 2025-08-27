import { describe, expect, test } from '@jest/globals';
import { InMemoryGameStore } from '../../repository/gameStore.memory.js';

const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

describe('InMemoryGameStore - locks', () => {
  test('acquirePieceLock allows only one holder among contenders', async () => {
    const store = new InMemoryGameStore();
    const matchId = 'm1';
    const pieceId = 'p1';
    const ttlSec = 1;

    const contenders = ['u1', 'u2', 'u3', 'u4'];
    const results = await Promise.all(contenders.map(u => store.acquirePieceLock(matchId, pieceId, u, ttlSec)));
    const oks = results.filter(r => r.isOk()).length;
    const errs = results.filter(r => r.isErr()).length;
    expect(oks).toBe(1);
    expect(errs).toBe(contenders.length - 1);
  });

  test('release by non-holder is rejected', async () => {
    const store = new InMemoryGameStore();
    await store.acquirePieceLock('m1', 'p1', 'u1', 1);
    const rel = await store.releasePieceLock('m1', 'p1', 'u2');
    expect(rel.isErr()).toBe(true);
  });

  test('lock expires after TTL and can be re-acquired', async () => {
    const store = new InMemoryGameStore();
    await store.acquirePieceLock('m1', 'p1', 'u1', 0.05);
    await sleep(80);
    const res = await store.acquirePieceLock('m1', 'p1', 'u2', 1);
    expect(res.isOk()).toBe(true);
  });
});

