// Turn the local audit log, state file and manifest into a progress summary.
// Pure and read-only: it never makes a request.

const ACTIVE_WITHIN_SECONDS = 90; // downloads run ~15 s apart, so a quiet minute and a half means idle

/**
 * @param {object} i
 * @param {number} i.total          words in the deck
 * @param {number} i.manifestCount  clips downloaded so far (entries in the manifest)
 * @param {{t:string, kind:string, status:number|string, ms:number}[]} i.rows  parsed requests.log lines
 * @param {{blockedUntil:number, failures:number, counts:object}} i.state
 * @param {{api:number, download:number}} i.dailyCaps
 * @param {number} i.now            epoch ms
 */
export function summarizeProgress({ total, manifestCount, rows, state, dailyCaps, now }) {
  const day = new Date(now).toISOString().slice(0, 10);
  const today = { api: state.counts?.[day]?.api ?? 0, download: state.counts?.[day]?.download ?? 0 };
  const remaining = Math.max(0, total - manifestCount);
  const capLeft = Math.max(0, dailyCaps.download - today.download);

  const downloads = rows.filter((r) => r.kind === 'download').slice(-10);
  let clipsPerMinute = null;
  if (downloads.length >= 2) {
    const starts = downloads.map((r) => Date.parse(r.t));
    const avgGap = (starts[starts.length - 1] - starts[0]) / (starts.length - 1) / 1000;
    if (avgGap > 0) clipsPerMinute = 60 / avgGap;
  }
  const etaMinutesToday = clipsPerMinute ? Math.round(Math.min(remaining, capLeft) / clipsPerMinute) : null;

  const last = rows.at(-1);
  const secondsAgo = last ? Math.max(0, Math.round((now - Date.parse(last.t)) / 1000)) : null;

  const problems = {};
  for (const r of rows) if (r.status !== 200) problems[r.status] = (problems[r.status] ?? 0) + 1;

  return {
    total,
    downloaded: manifestCount,
    remaining,
    today,
    capLeft,
    clipsPerMinute,
    etaMinutesToday,
    lastRequest: last ? { t: last.t, kind: last.kind, status: last.status, secondsAgo } : null,
    active: secondsAgo !== null && secondsAgo < ACTIVE_WITHIN_SECONDS,
    problems,
    blocked:
      state.blockedUntil > now
        ? { until: new Date(state.blockedUntil).toISOString(), minutesLeft: Math.ceil((state.blockedUntil - now) / 60000) }
        : null,
  };
}
