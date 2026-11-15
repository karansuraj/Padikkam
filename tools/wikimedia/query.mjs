#!/usr/bin/env node
// Run one SPARQL query file against a Wikimedia query service, gently.
//   node tools/wikimedia/query.mjs <wdqs|lingualibre> <query.rq>        dry run, NO request
//   node tools/wikimedia/query.mjs <wdqs|lingualibre> <query.rq> --go   send it (cached afterwards)
import { readFileSync } from 'node:fs';
import { loadContact } from './contact.mjs';
import { fileURLToPath } from 'node:url';
import { PoliteClient } from './polite-client.mjs';
import { cachedQuery, planQuery } from './sparql.mjs';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const CACHE = `${ROOT}.wikimedia-cache`;
const ENDPOINTS = {
  wdqs: 'https://query.wikidata.org/sparql',
  lingualibre: 'https://lingualibre.org/bigdata/namespace/wdq/sparql',
};

const [, , which, queryFile, flag] = process.argv;
const endpoint = ENDPOINTS[which];
if (!endpoint || !queryFile) {
  console.error('usage: node tools/wikimedia/query.mjs <wdqs|lingualibre> <query.rq> [--go]');
  process.exit(2);
}
const sparql = readFileSync(queryFile, 'utf8');
const queries = `${CACHE}/queries`;
const plan = planQuery(endpoint, sparql, queries);

if (flag !== '--go') {
  console.log(`DRY RUN (no request made)\n  endpoint: ${endpoint}\n  cached:   ${plan.cached ? 'yes, would read from disk' : 'no, would send 1 request'}`);
  process.exit(0);
}

const client = new PoliteClient({ contact: loadContact(ROOT), dir: `${CACHE}/state` });
try {
  const result = await cachedQuery(client, endpoint, sparql, queries);
  console.log(JSON.stringify(result.results?.bindings ?? result, null, 2));
} catch (e) {
  console.error(`${e.name}: ${e.message}`);
  process.exit(1);
}
