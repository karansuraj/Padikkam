#!/usr/bin/env node
// Download the word audio for src/data/vocab-data.json, gently.
//   node tools/wikimedia/fetch-audio.mjs                 DRY RUN: prints the plan, makes NO request
//   node tools/wikimedia/fetch-audio.mjs --go --limit 25 downloads at most 25 clips, then stops
// Run it again later to continue; finished clips are never fetched twice.
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { loadContact } from './contact.mjs';
import { fetchAll, planDownloads } from './audio-plan.mjs';
import { PoliteClient } from './polite-client.mjs';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const CACHE = `${ROOT}.wikimedia-cache`;
const DEST = `${ROOT}assets/audio/words`;
const META = `${CACHE}/audio-meta.json`;
const MANIFEST = `${DEST}/manifest.json`;

const args = process.argv.slice(2);
const go = args.includes('--go');
const limitArg = args.indexOf('--limit');
const limit = limitArg === -1 ? 25 : Number(args[limitArg + 1]);
if (!Number.isInteger(limit) || limit < 1) {
  console.error('--limit needs a positive whole number');
  process.exit(2);
}

const vocab = JSON.parse(readFileSync(`${ROOT}src/data/vocab-data.json`, 'utf8'));

if (!go) {
  // Dry run: reads local files only.
  const { todo, done } = planDownloads(vocab, DEST);
  const cache = existsSync(META) ? JSON.parse(readFileSync(META, 'utf8')) : {};
  const uncached = [...new Set(todo.map((i) => i.commonsFile))].filter((f) => !(f in cache)).length;
  const apiBatches = Math.ceil(uncached / 10);
  const perDay = 150;
  const seconds = apiBatches * 7 + todo.length * 16; // ~6.5 s API gap, ~15 s download gap, plus transfer time
  console.log(
    [
      'DRY RUN (no request made)',
      `  words in deck:        ${vocab.length}`,
      `  already downloaded:   ${done.length}`,
      `  still to download:    ${todo.length}   (about ${((todo.length * 90) / 1024).toFixed(1)} MB at ~90 KB each)`,
      `  metadata lookups:     ${apiBatches} requests (10 files each, cached after)`,
      `  download requests:    ${todo.length}, one at a time, 12-18 s apart`,
      `  estimated total time: ~${Math.round(seconds / 60)} minutes of spaced requests`,
      `  daily cap:            ${perDay} downloads, so ${Math.ceil(todo.length / perDay)} day(s) at the cap`,
      `  this run would fetch: at most ${Math.min(limit, todo.length)} (use --go --limit N)`,
    ].join('\n'),
  );
  process.exit(0);
}

const client = new PoliteClient({ contact: loadContact(ROOT), dir: `${CACHE}/state` });
const result = await fetchAll({ client, vocab, destDir: DEST, manifestPath: MANIFEST, metaPath: META, limit });
console.log(JSON.stringify(result, null, 2));
if (result.stoppedBy) {
  console.error(`Stopped: ${result.stoppedBy}. ${result.message ?? ''}`);
  process.exit(1);
}
