// SPARQL over GET through the polite client, with every answer cached on disk
// so the same query is never sent twice.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

function describe(endpoint, sparql, cacheDir) {
  const url = `${endpoint}?${new URLSearchParams({ query: sparql, format: 'json' })}`;
  const key = createHash('sha256').update(`${endpoint}\n${sparql}`).digest('hex').slice(0, 24);
  return { url, file: join(cacheDir, `sparql-${key}.json`) };
}

/** What would be requested, and whether it is already cached. Makes no request. */
export function planQuery(endpoint, sparql, cacheDir) {
  const { url, file } = describe(endpoint, sparql, cacheDir);
  return { url, cached: existsSync(file), file };
}

/** Run a query (or read it from the cache). Needs an object with `request(url, init)`. */
export async function cachedQuery(client, endpoint, sparql, cacheDir) {
  const { url, file } = describe(endpoint, sparql, cacheDir);
  if (existsSync(file)) return JSON.parse(readFileSync(file, 'utf8'));
  const response = await client.request(url, { headers: { Accept: 'application/sparql-results+json' } });
  const text = await response.text();
  const parsed = JSON.parse(text); // throws before caching if the body is not JSON
  mkdirSync(cacheDir, { recursive: true });
  writeFileSync(file, text);
  return parsed;
}
