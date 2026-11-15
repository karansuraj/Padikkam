import { describe, expect, it } from 'vitest';
import { summarizeProgress } from './status-lib.mjs';

const NOW = Date.parse('2026-11-15T17:30:00Z');
const row = (secondsAgo, over = {}) => ({
  t: new Date(NOW - secondsAgo * 1000).toISOString(),
  kind: 'download',
  status: 200,
  ms: 300,
  ...over,
});
const base = {
  total: 353,
  manifestCount: 40,
  rows: [],
  state: { blockedUntil: 0, failures: 0, counts: { '2026-11-15': { api: 12, download: 40 } } },
  dailyCaps: { api: 100, download: 150 },
  now: NOW,
};

describe('summarizeProgress', () => {
  it('reports downloaded, remaining and todays request counts', () => {
    const s = summarizeProgress(base);
    expect(s).toMatchObject({ downloaded: 40, remaining: 313, total: 353, today: { api: 12, download: 40 }, capLeft: 110 });
  });

  it('works out the recent speed and a time estimate from the last downloads', () => {
    const rows = [150, 135, 120, 105, 90, 75, 60, 45, 30, 15].map((s) => row(s)); // one every 15 s
    const s = summarizeProgress({ ...base, rows });
    expect(s.clipsPerMinute).toBeCloseTo(4, 1);
    // limited by the daily cap (110 left), not the 313 remaining overall
    expect(s.etaMinutesToday).toBe(Math.round(110 / 4));
  });

  it('says whether it looks active: the last request was seconds ago versus minutes ago', () => {
    expect(summarizeProgress({ ...base, rows: [row(10)] }).active).toBe(true);
    expect(summarizeProgress({ ...base, rows: [row(300)] }).active).toBe(false);
    expect(summarizeProgress({ ...base, rows: [row(10)] }).lastRequest).toMatchObject({ kind: 'download', status: 200, secondsAgo: 10 });
  });

  it('counts any non-200 answers so a problem is visible', () => {
    const rows = [row(30), row(20, { status: 404 }), row(10, { status: 429 })];
    expect(summarizeProgress({ ...base, rows }).problems).toEqual({ 404: 1, 429: 1 });
  });

  it('reports a block and how long it lasts', () => {
    const s = summarizeProgress({ ...base, state: { ...base.state, blockedUntil: NOW + 600_000 } });
    expect(s.blocked).toEqual({ until: new Date(NOW + 600_000).toISOString(), minutesLeft: 10 });
    expect(summarizeProgress(base).blocked).toBeNull();
  });

  it('copes with no requests at all', () => {
    const s = summarizeProgress({ ...base, rows: [], state: { blockedUntil: 0, failures: 0, counts: {} } });
    expect(s.clipsPerMinute).toBeNull();
    expect(s.etaMinutesToday).toBeNull();
    expect(s.lastRequest).toBeNull();
    expect(s.active).toBe(false);
    expect(s.capLeft).toBe(150);
  });
});
