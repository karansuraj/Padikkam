#!/usr/bin/env node
// Show how the word-audio download is going. READ-ONLY: reads local files, makes no request.
//   node tools/wikimedia/status.mjs            one snapshot
//   node tools/wikimedia/status.mjs --watch    refresh every 10 s (Ctrl+C to leave; the download is unaffected)
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { DEFAULTS } from './polite-client.mjs';
import { summarizeProgress } from './status-lib.mjs';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const STATE = `${ROOT}.wikimedia-cache/state`;

function readJson(path, fallback) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return fallback;
  }
}

function snapshot() {
  const vocab = readJson(`${ROOT}src/data/vocab-data.json`, []);
  const manifest = readJson(`${ROOT}assets/audio/words/manifest.json`, []);
  const rows = existsSync(`${STATE}/requests.log`)
    ? readFileSync(`${STATE}/requests.log`, 'utf8').split('\n').filter(Boolean).slice(-2000).map((l) => {
        try {
          return JSON.parse(l);
        } catch {
          return null;
        }
      }).filter(Boolean)
    : [];
  const state = readJson(`${STATE}/state.json`, { blockedUntil: 0, failures: 0, counts: {} });
  return summarizeProgress({
    total: vocab.length,
    manifestCount: manifest.length,
    rows,
    state,
    dailyCaps: DEFAULTS.dailyCaps,
    now: Date.now(),
  });
}

function render(s) {
  const width = 30;
  const filled = s.total ? Math.round((s.downloaded / s.total) * width) : 0;
  const bar = '#'.repeat(filled) + '-'.repeat(width - filled);
  const pct = s.total ? Math.round((s.downloaded / s.total) * 100) : 0;
  const last = s.lastRequest;
  const lines = [
    'Word audio download   (read-only: this makes no requests)',
    `  [${bar}] ${s.downloaded} / ${s.total} clips (${pct}%), ${s.remaining} to go`,
    `  State:    ${s.blocked ? `BLOCKED for about ${s.blocked.minutesLeft} more min (until ${s.blocked.until})` : s.active ? 'running' : 'not running right now'}`,
    last ? `  Last:     ${last.kind} HTTP ${last.status}, ${last.secondsAgo}s ago` : '  Last:     no requests yet',
    s.clipsPerMinute
      ? `  Speed:    ${s.clipsPerMinute.toFixed(1)} clips/min, about ${s.etaMinutesToday} min left today`
      : '  Speed:    (not enough downloads yet)',
    `  Today:    ${s.today.download} of ${DEFAULTS.dailyCaps.download} downloads, ${s.today.api} of ${DEFAULTS.dailyCaps.api} API requests (${s.capLeft} downloads left under today's cap)`,
    `  Problems: ${Object.keys(s.problems).length ? JSON.stringify(s.problems) : 'none (every request so far was HTTP 200)'}`,
  ];
  return lines.join('\n');
}

if (process.argv.includes('--watch')) {
  const tick = () => {
    console.clear();
    console.log(render(snapshot()));
    console.log(`\n  updated ${new Date().toLocaleTimeString()}, refreshing every 10 s (Ctrl+C to stop watching)`);
  };
  tick();
  setInterval(tick, 10_000);
} else {
  console.log(render(snapshot()));
}
