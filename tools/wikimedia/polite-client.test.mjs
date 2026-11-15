import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  BlockedError,
  CapReachedError,
  HttpError,
  PoliteClient,
  StoppedError,
  buildUserAgent,
  parseRetryAfter,
} from './polite-client.mjs';

const API = 'https://commons.wikimedia.org/w/api.php?action=query';
const FILE = 'https://upload.wikimedia.org/wikipedia/commons/a/ab/x.wav';

/** A client wired to a fake clock, fake sleep and a scripted fake network. */
function harness({ statuses = [], ...opts } = {}) {
  let t = Date.UTC(2026, 10, 15, 12, 0, 0);
  const sleeps = [];
  const calls = [];
  const queue = [...statuses];
  let inflight = 0;
  let maxInflight = 0;
  const dir = mkdtempSync(join(tmpdir(), 'polite-'));
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    inflight++;
    maxInflight = Math.max(maxInflight, inflight);
    await Promise.resolve();
    inflight--;
    const next = queue.shift() ?? { status: 200 };
    return new Response('body', { status: next.status, headers: next.headers });
  };
  const make = (extra = {}) =>
    new PoliteClient({
      contact: 'me+test@example.com',
      dir,
      fetchImpl,
      now: () => t,
      sleep: async (ms) => {
        sleeps.push(ms);
        t += ms;
      },
      random: () => 0.5,
      ...opts,
      ...extra,
    });
  return {
    make,
    dir,
    calls,
    sleeps,
    advance: (ms) => (t += ms),
    now: () => t,
    maxInflight: () => maxInflight,
  };
}

describe('parseRetryAfter', () => {
  const now = Date.UTC(2026, 10, 15, 12, 0, 0);
  it('reads delta-seconds', () => expect(parseRetryAfter('600', now)).toBe(600));
  it('reads an HTTP date relative to now', () => {
    expect(parseRetryAfter(new Date(now + 90_000).toUTCString(), now)).toBe(90);
  });
  it('returns null for missing or garbage values', () => {
    expect(parseRetryAfter(null, now)).toBeNull();
    expect(parseRetryAfter('soon', now)).toBeNull();
  });
});

describe('buildUserAgent', () => {
  it('names the tool and includes the contact', () => {
    const ua = buildUserAgent('me+test@example.com');
    expect(ua).toContain('PadikkamAudioFetch/');
    expect(ua).toContain('(me+test@example.com)');
  });
  it('refuses a missing or non-contact value', () => {
    expect(() => buildUserAgent('')).toThrow();
    expect(() => buildUserAgent('just a name')).toThrow();
  });
});

describe('PoliteClient requests', () => {
  it('sends the User-Agent on every request', async () => {
    const h = harness();
    const c = h.make();
    await c.request(API);
    expect(h.calls[0].init.headers['User-Agent']).toContain('me+test@example.com');
  });

  it('does not wait before the very first request, then spaces the next one', async () => {
    const h = harness();
    const c = h.make();
    await c.request(API);
    expect(h.sleeps).toEqual([]);
    await c.request(API);
    expect(h.sleeps).toEqual([6500]); // 5000 base + 0.5 * 3000 jitter
  });

  it('uses a longer gap for downloads from upload.wikimedia.org', async () => {
    const h = harness();
    const c = h.make();
    await c.request(FILE);
    await c.request(FILE);
    expect(h.sleeps).toEqual([15000]); // 12000 base + 0.5 * 6000 jitter
  });

  it('keeps spacing across separate runs (state is on disk)', async () => {
    const h = harness();
    await h.make().request(API);
    await h.make().request(API); // a brand-new client, same state directory
    expect(h.sleeps).toEqual([6500]);
  });

  it('never has two requests in flight at once', async () => {
    const h = harness();
    const c = h.make();
    await Promise.all([c.request(API), c.request(API), c.request(API)]);
    expect(h.calls).toHaveLength(3);
    expect(h.maxInflight()).toBe(1);
  });

  it('refuses hosts that are not on the Wikimedia allow-list, and plain http', async () => {
    const h = harness();
    const c = h.make();
    await expect(c.request('https://example.com/x')).rejects.toThrow(/host/i);
    await expect(c.request('http://commons.wikimedia.org/w/api.php')).rejects.toThrow(/https/i);
    expect(h.calls).toHaveLength(0);
  });
});

describe('blocks and limits', () => {
  it('stops on 429, does not retry, and records the wait', async () => {
    const h = harness({ statuses: [{ status: 429, headers: { 'retry-after': '600' } }] });
    const c = h.make();
    const start = h.now();
    await expect(c.request(API)).rejects.toBeInstanceOf(BlockedError);
    expect(h.calls).toHaveLength(1); // no retry
    const state = JSON.parse(readFileSync(join(h.dir, 'state.json'), 'utf8'));
    expect(state.blockedUntil).toBeGreaterThanOrEqual(start + 600_000);
  });

  it('makes no network call while blocked, even from a new run, and resumes after the wait', async () => {
    const h = harness({ statuses: [{ status: 429, headers: { 'retry-after': '600' } }] });
    await expect(h.make().request(API)).rejects.toBeInstanceOf(BlockedError);
    await expect(h.make().request(API)).rejects.toBeInstanceOf(BlockedError);
    expect(h.calls).toHaveLength(1);
    h.advance(24 * 3600_000);
    await h.make().request(API);
    expect(h.calls).toHaveLength(2);
  });

  it('treats 503 like 429 and falls back to a default wait with no Retry-After', async () => {
    const h = harness({ statuses: [{ status: 503 }] });
    const start = h.now();
    await expect(h.make().request(API)).rejects.toBeInstanceOf(BlockedError);
    const state = JSON.parse(readFileSync(join(h.dir, 'state.json'), 'utf8'));
    expect(state.blockedUntil).toBeGreaterThanOrEqual(start + 900_000);
  });

  it('opens the circuit after 3 failures in a row', async () => {
    const h = harness({ statuses: [{ status: 500 }, { status: 500 }, { status: 500 }] });
    const c = h.make();
    await expect(c.request(API)).rejects.toBeInstanceOf(HttpError);
    await expect(c.request(API)).rejects.toBeInstanceOf(HttpError);
    await expect(c.request(API)).rejects.toBeInstanceOf(BlockedError);
    await expect(c.request(API)).rejects.toBeInstanceOf(BlockedError);
    expect(h.calls).toHaveLength(3);
  });

  it('a success resets the failure count', async () => {
    const h = harness({ statuses: [{ status: 500 }, { status: 200 }, { status: 500 }, { status: 500 }, { status: 200 }] });
    const c = h.make();
    await expect(c.request(API)).rejects.toBeInstanceOf(HttpError);
    await c.request(API);
    await expect(c.request(API)).rejects.toBeInstanceOf(HttpError);
    await expect(c.request(API)).rejects.toBeInstanceOf(HttpError);
    await c.request(API); // only 2 in a row, circuit still closed
    expect(h.calls).toHaveLength(5);
  });

  it('enforces a daily cap per kind of request, and resets the next day', async () => {
    const h = harness({ dailyCaps: { api: 2, download: 1 } });
    const c = h.make();
    await c.request(API);
    await c.request(API);
    await expect(c.request(API)).rejects.toBeInstanceOf(CapReachedError);
    await c.request(FILE); // downloads have their own cap
    await expect(c.request(FILE)).rejects.toBeInstanceOf(CapReachedError);
    expect(h.calls).toHaveLength(3);
    h.advance(25 * 3600_000);
    await c.request(API);
    expect(h.calls).toHaveLength(4);
  });

  it('stops at once when a STOP file exists', async () => {
    const h = harness();
    writeFileSync(join(h.dir, 'STOP'), '');
    await expect(h.make().request(API)).rejects.toBeInstanceOf(StoppedError);
    expect(h.calls).toHaveLength(0);
  });

  it('writes an audit log line for each request', async () => {
    const h = harness();
    await h.make().request(API);
    const lines = readFileSync(join(h.dir, 'requests.log'), 'utf8').trim().split('\n');
    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0])).toMatchObject({ status: 200, kind: 'api' });
  });
});
