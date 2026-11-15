#!/usr/bin/env node
// Build src/data/vocab-data.json from the CACHED Wikidata query responses and topics.json.
// Makes no network request. If a cached page is missing, run the queries first:
//   node tools/wikimedia/query.mjs wdqs tools/wikimedia/queries/wikidata-words-p1.rq --go   (and p2, p3)
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { planQuery } from '../wikimedia/sparql.mjs';
import { matchHeadwords, parseRows } from './match.mjs';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const CACHE = `${ROOT}.wikimedia-cache`;
const ENDPOINT = 'https://query.wikidata.org/sparql';

const bindings = [];
for (const n of [1, 2, 3]) {
  const sparql = readFileSync(`${ROOT}tools/wikimedia/queries/wikidata-words-p${n}.rq`, 'utf8');
  const { cached, file } = planQuery(ENDPOINT, sparql, `${CACHE}/queries`);
  if (!cached) {
    console.error(`Cached response for page ${n} is missing. Run the query with --go first (see the header of this file).`);
    process.exit(1);
  }
  bindings.push(...JSON.parse(readFileSync(file, 'utf8')).results.bindings);
}

const rows = parseRows(bindings);
const topics = JSON.parse(readFileSync(`${ROOT}tools/deck/topics.json`, 'utf8'));
// Curation: lexeme ids the curator approved (weak matches, judged from their English glosses) or
// excluded (bad senses), each with a note, plus topicCategories (word types a topic may contain).
// The Malayalam and meanings always come from the dataset; curation only chooses among them.
const curationPath = `${ROOT}tools/deck/curation.json`;
const curation = existsSync(curationPath) ? JSON.parse(readFileSync(curationPath, 'utf8')) : {};
const approved = new Set(Object.keys(curation.approved ?? {}));
const excluded = new Set(Object.keys(curation.excluded ?? {}));
const topicCategories = curation.topicCategories ?? {};
const { selected, unmatched, ambiguous, weak } = matchHeadwords(rows, topics, { approved, excluded, topicCategories });

const vocab = selected.map((s) => ({
  id: s.lexeme,
  ml: s.ml,
  en: s.en,
  topic: s.topic,
  audio: `words/${s.lexeme}.${s.commonsFile.split('.').pop().toLowerCase()}`,
  commonsFile: s.commonsFile,
  speaker: s.speaker,
}));
writeFileSync(`${ROOT}src/data/vocab-data.json`, JSON.stringify(vocab, null, 2) + '\n');

const perTopic = {};
for (const v of vocab) perTopic[v.topic] = (perTopic[v.topic] ?? 0) + 1;
const report = [
  `Rows read: ${rows.length}`,
  `Selected: ${vocab.length} words`,
  ...Object.entries(topics).map(([t, h]) => `  ${t}: ${perTopic[t] ?? 0} of ${h.length}`),
  '',
  `Unmatched headwords (${unmatched.length}):`,
  ...unmatched.map((u) => `  [${u.topic}] ${u.headword}`),
  '',
  `Weak candidates needing review (${weak.length}); approve by adding the lexeme to curation.json:`,
  ...weak.map((w) => `  [${w.topic}] ${w.headword} -> ${w.lexeme} ${w.lemma} (${w.en.slice(0, 60)})`),
  '',
  `Ambiguous headwords (${ambiguous.length}), best one selected; candidates:`,
  ...ambiguous.map((a) => `  [${a.topic}] ${a.headword}: ${a.candidates.join(', ')}`),
].join('\n');
mkdirSync(CACHE, { recursive: true });
writeFileSync(`${CACHE}/vocab-report.txt`, report + '\n');
console.log(report);
