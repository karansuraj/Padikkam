import { mkdtempSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { cachedQuery, planQuery } from './sparql.mjs';

const ENDPOINT = 'https://query.wikidata.org/sparql';
const QUERY = 'SELECT (COUNT(*) AS ?n) WHERE { ?s ?p ?o } LIMIT 1';

function setup() {
  const calls = [];
  const client = {
    request: async (url, init) => {
      calls.push({ url, init });
      return new Response(JSON.stringify({ head: {}, results: { bindings: [{ n: { value: '7' } }] } }), { status: 200 });
    },
  };
  return { client, calls, cacheDir: mkdtempSync(join(tmpdir(), 'sparql-')) };
}

describe('cachedQuery', () => {
  it('sends one GET with the query and a JSON Accept header, and returns parsed results', async () => {
    const { client, calls, cacheDir } = setup();
    const out = await cachedQuery(client, ENDPOINT, QUERY, cacheDir);
    expect(calls).toHaveLength(1);
    const u = new URL(calls[0].url);
    expect(u.origin + u.pathname).toBe(ENDPOINT);
    expect(u.searchParams.get('query')).toBe(QUERY);
    expect(u.searchParams.get('format')).toBe('json');
    expect(calls[0].init.headers.Accept).toBe('application/sparql-results+json');
    expect(out.results.bindings[0].n.value).toBe('7');
  });

  it('never asks twice for the same query: the second call is served from disk', async () => {
    const { client, calls, cacheDir } = setup();
    await cachedQuery(client, ENDPOINT, QUERY, cacheDir);
    const again = await cachedQuery(client, ENDPOINT, QUERY, cacheDir);
    expect(calls).toHaveLength(1);
    expect(again.results.bindings).toHaveLength(1);
    expect(readdirSync(cacheDir).filter((f) => f.endsWith('.json'))).toHaveLength(1);
  });

  it('asks again for a different query', async () => {
    const { client, calls, cacheDir } = setup();
    await cachedQuery(client, ENDPOINT, QUERY, cacheDir);
    await cachedQuery(client, ENDPOINT, QUERY + ' ', cacheDir);
    expect(calls).toHaveLength(2);
  });
});

describe('planQuery', () => {
  it('reports the request and whether it is cached, without making any request', async () => {
    const { client, calls, cacheDir } = setup();
    expect(planQuery(ENDPOINT, QUERY, cacheDir)).toMatchObject({ cached: false });
    await cachedQuery(client, ENDPOINT, QUERY, cacheDir);
    expect(planQuery(ENDPOINT, QUERY, cacheDir)).toMatchObject({ cached: true });
    expect(calls).toHaveLength(1);
  });
});
