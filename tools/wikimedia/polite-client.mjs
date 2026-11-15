// A deliberately slow, cautious HTTP client for Wikimedia hosts.
//
// Rules it enforces (see docs/wikimedia-fetching.md):
//  - Every request carries a User-Agent with a real contact (Wikimedia robot policy).
//  - One request at a time (the policy allows 2; we use 1).
//  - A long, jittered pause between requests, kept ON DISK so separate runs honour it.
//  - On the first 429/503 it stops, saves how long to wait, and refuses to make any
//    request until then, even from a new run. It never retries a 429.
//  - 3 server failures in a row also stop everything for a while.
//  - Daily caps per kind of request, and a STOP file that halts everything.
//  - Only https, and only a short allow-list of Wikimedia hosts.
//  - Every request is appended to an audit log.
import { appendFileSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const NAME = 'PadikkamAudioFetch';
const VERSION = '0.1';

/** Which pacing profile each allowed host uses. */
const HOST_KIND = {
  'commons.wikimedia.org': 'api',
  'lingualibre.org': 'api',
  'query.wikidata.org': 'api',
  'www.wikidata.org': 'api',
  'upload.wikimedia.org': 'download',
};

const DEFAULTS = {
  gaps: { api: { base: 5000, jitter: 3000 }, download: { base: 12000, jitter: 6000 } },
  dailyCaps: { api: 100, download: 150 },
  failureLimit: 3,
  defaultBlockSeconds: 900,
};

export class BlockedError extends Error {
  constructor(blockedUntil, why) {
    super(`Blocked until ${new Date(blockedUntil).toISOString()} (${why}). Not making any request.`);
    this.name = 'BlockedError';
    this.blockedUntil = blockedUntil;
  }
}
export class CapReachedError extends Error {
  constructor(kind, cap) {
    super(`Daily cap of ${cap} ${kind} requests reached. Try again tomorrow (UTC).`);
    this.name = 'CapReachedError';
  }
}
export class StoppedError extends Error {
  constructor() {
    super('STOP file present. Remove it to continue.');
    this.name = 'StoppedError';
  }
}
export class HttpError extends Error {
  constructor(status, url) {
    super(`HTTP ${status} for ${url}`);
    this.name = 'HttpError';
    this.status = status;
  }
}

/** Seconds to wait from a Retry-After header (delta-seconds or HTTP date), or null. */
export function parseRetryAfter(value, now = Date.now()) {
  if (value === null || value === undefined || value === '') return null;
  const v = String(value).trim();
  if (/^\d+$/.test(v)) return Number(v);
  const t = Date.parse(v);
  return Number.isNaN(t) ? null : Math.max(0, Math.ceil((t - now) / 1000));
}

/** Wikimedia asks for a tool name and a way to reach the operator. */
export function buildUserAgent(contact) {
  if (!contact || !(/@/.test(contact) || /^https?:\/\//.test(contact))) {
    throw new Error('A contact email or URL is required for the User-Agent.');
  }
  return `${NAME}/${VERSION} (${contact}) node/${process.versions.node}`;
}

export class PoliteClient {
  /**
   * @param {object} o
   * @param {string} o.contact  email or URL for the User-Agent
   * @param {string} o.dir      directory for state.json, requests.log and the STOP file
   */
  constructor({
    contact,
    dir,
    fetchImpl = globalThis.fetch,
    now = () => Date.now(),
    sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
    random = Math.random,
    gaps = DEFAULTS.gaps,
    dailyCaps = DEFAULTS.dailyCaps,
    failureLimit = DEFAULTS.failureLimit,
    defaultBlockSeconds = DEFAULTS.defaultBlockSeconds,
  }) {
    this.userAgent = buildUserAgent(contact);
    this.dir = dir;
    this.fetchImpl = fetchImpl;
    this.now = now;
    this.sleep = sleep;
    this.random = random;
    this.gaps = gaps;
    this.dailyCaps = dailyCaps;
    this.failureLimit = failureLimit;
    this.defaultBlockSeconds = defaultBlockSeconds;
    this.chain = Promise.resolve();
    mkdirSync(dir, { recursive: true });
  }

  /** Queue a request. Calls run strictly one after another. */
  request(url, init = {}) {
    const run = this.chain.then(() => this.#do(url, init));
    this.chain = run.catch(() => {});
    return run;
  }

  #statePath() {
    return join(this.dir, 'state.json');
  }
  #loadState() {
    try {
      return JSON.parse(readFileSync(this.#statePath(), 'utf8'));
    } catch {
      return { lastRequestAt: 0, blockedUntil: 0, failures: 0, counts: {} };
    }
  }
  #saveState(state) {
    const tmp = this.#statePath() + '.tmp';
    writeFileSync(tmp, JSON.stringify(state, null, 2));
    renameSync(tmp, this.#statePath());
  }
  #log(entry) {
    appendFileSync(join(this.dir, 'requests.log'), JSON.stringify(entry) + '\n');
  }
  #block(state, seconds, why) {
    state.blockedUntil = this.now() + Math.ceil(seconds * 1.25) * 1000 + 60_000;
    this.#saveState(state);
    return new BlockedError(state.blockedUntil, why);
  }

  async #do(rawUrl, init) {
    const url = new URL(rawUrl);
    if (url.protocol !== 'https:') throw new Error(`Only https is allowed: ${rawUrl}`);
    const kind = HOST_KIND[url.hostname];
    if (!kind) throw new Error(`Host not on the Wikimedia allow-list: ${url.hostname}`);

    if (existsSync(join(this.dir, 'STOP'))) throw new StoppedError();

    const state = this.#loadState();
    if (state.blockedUntil > this.now()) throw new BlockedError(state.blockedUntil, 'earlier rate limit or failures');

    const day = new Date(this.now()).toISOString().slice(0, 10);
    state.counts = { [day]: state.counts?.[day] ?? {} }; // drop older days
    const cap = this.dailyCaps[kind];
    if ((state.counts[day][kind] ?? 0) >= cap) throw new CapReachedError(kind, cap);

    const gap = this.gaps[kind];
    const wait = state.lastRequestAt + gap.base + this.random() * gap.jitter - this.now();
    if (state.lastRequestAt && wait > 0) await this.sleep(wait);

    // Count before sending, so a crash mid-request still counts against the cap.
    state.counts[day][kind] = (state.counts[day][kind] ?? 0) + 1;
    this.#saveState(state);

    const started = this.now();
    let response;
    try {
      response = await this.fetchImpl(rawUrl, {
        ...init,
        headers: { ...(init.headers ?? {}), 'User-Agent': this.userAgent },
      });
    } catch (e) {
      state.lastRequestAt = this.now();
      state.failures = (state.failures ?? 0) + 1;
      this.#log({ t: new Date(started).toISOString(), url: rawUrl, kind, status: 'network-error', ms: this.now() - started });
      if (state.failures >= this.failureLimit) throw this.#block(state, this.defaultBlockSeconds, 'repeated network errors');
      this.#saveState(state);
      throw e;
    }

    state.lastRequestAt = this.now(); // measured from the END of the request
    this.#log({ t: new Date(started).toISOString(), url: rawUrl, kind, status: response.status, ms: this.now() - started });

    if (response.status === 429 || response.status === 503) {
      const seconds = parseRetryAfter(response.headers.get('retry-after'), this.now()) ?? this.defaultBlockSeconds;
      throw this.#block(state, seconds, `HTTP ${response.status}`);
    }
    if (!response.ok) {
      if (response.status >= 500 || response.status === 403) {
        state.failures = (state.failures ?? 0) + 1;
        if (state.failures >= this.failureLimit) throw this.#block(state, this.defaultBlockSeconds, `${state.failures} failures in a row`);
      }
      this.#saveState(state);
      throw new HttpError(response.status, rawUrl);
    }
    state.failures = 0;
    this.#saveState(state);
    return response;
  }
}
