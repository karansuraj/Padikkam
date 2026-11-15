import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { fetchAll, planDownloads, resolveFiles, verifyAudio } from './audio-plan.mjs';
import { BlockedError, LockTimeoutError, StateCorruptError } from './polite-client.mjs';

const sha1 = (bytes) => createHash('sha1').update(bytes).digest('hex');
const wav = (seed) => {
  const b = new Uint8Array(64);
  b.set(new TextEncoder().encode('RIFF'), 0);
  b.set(new TextEncoder().encode('WAVE'), 8);
  b[20] = seed;
  return b;
};
const tmp = () => mkdtempSync(join(tmpdir(), 'audio-plan-'));

/** n vocab items whose files exist on a fake Commons. */
function world(n, { corrupt = [] } = {}) {
  const vocab = [];
  const catalog = {};
  const files = {};
  for (let i = 1; i <= n; i++) {
    const name = `LL-Q36236 (mal)-Vis M-word${i}.wav`;
    const bytes = wav(i);
    const url = `https://upload.wikimedia.org/x/${i}.wav`;
    vocab.push({ id: `L${i}`, ml: `w${i}`, commonsFile: name, speaker: 'Vis M' });
    catalog[name] = { url, sha1: sha1(bytes), size: bytes.length, mime: 'audio/wav', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0', artist: 'Vis M' };
    files[url] = corrupt.includes(i) ? new TextEncoder().encode('<html>429</html>') : bytes;
  }
  return { vocab, catalog, files };
}

/** A fake PoliteClient: answers Commons API lookups and file downloads, and counts calls. */
function fakeClient({ catalog, files }, { blockOnDownload = null } = {}) {
  const log = { api: [], downloads: [] };
  return {
    log,
    request: async (url) => {
      if (url.startsWith('https://commons.wikimedia.org/w/api.php')) {
        log.api.push(url);
        const titles = new URL(url).searchParams.get('titles').split('|').map((t) => t.replace(/^File:/, ''));
        const pages = {};
        titles.forEach((t, i) => {
          const c = catalog[t];
          pages[i] = c
            ? {
                title: `File:${t}`,
                imageinfo: [
                  {
                    url: c.url, sha1: c.sha1, size: c.size, mime: c.mime,
                    extmetadata: {
                      LicenseShortName: { value: c.license },
                      LicenseUrl: { value: c.licenseUrl },
                      Artist: { value: `<a href="x">${c.artist}</a>` },
                    },
                  },
                ],
              }
            : { title: `File:${t}`, missing: '' };
        });
        return new Response(JSON.stringify({ query: { pages } }), { status: 200 });
      }
      log.downloads.push(url);
      if (blockOnDownload !== null && log.downloads.length === blockOnDownload) {
        throw new BlockedError(Date.now() + 1000, 'test');
      }
      return new Response(files[url], { status: 200 });
    },
  };
}

describe('planDownloads', () => {
  it('skips files already on disk', () => {
    const { vocab } = world(3);
    const plan = planDownloads(vocab, '/dest', (p) => p.endsWith('L2.wav'));
    expect(plan.done.map((i) => i.id)).toEqual(['L2']);
    expect(plan.todo.map((i) => i.id)).toEqual(['L1', 'L3']);
    expect(plan.todo[0].dest).toBe('/dest/L1.wav');
  });
});

describe('resolveFiles', () => {
  it('sends one request per 10 titles, with File: prefixes', async () => {
    const w = world(25);
    const c = fakeClient(w);
    const out = await resolveFiles(c, w.vocab.map((v) => v.commonsFile), join(tmp(), 'meta.json'));
    expect(c.log.api).toHaveLength(3);
    expect(new URL(c.log.api[0]).searchParams.get('titles').split('|')).toHaveLength(10);
    expect(new URL(c.log.api[0]).searchParams.get('titles')).toMatch(/^File:/);
    expect(out.size).toBe(25);
    expect(out.get(w.vocab[0].commonsFile)).toMatchObject({ sha1: w.catalog[w.vocab[0].commonsFile].sha1, license: 'CC BY-SA 4.0', artist: 'Vis M' });
  });

  it('asks for nothing it already knows: a second call sends no request', async () => {
    const w = world(12);
    const c = fakeClient(w);
    const cache = join(tmp(), 'meta.json');
    await resolveFiles(c, w.vocab.map((v) => v.commonsFile), cache);
    const before = c.log.api.length;
    await resolveFiles(c, w.vocab.map((v) => v.commonsFile), cache);
    expect(c.log.api.length).toBe(before);
  });

  it('only asks for the titles missing from the cache', async () => {
    const w = world(15);
    const c = fakeClient(w);
    const cache = join(tmp(), 'meta.json');
    await resolveFiles(c, w.vocab.slice(0, 10).map((v) => v.commonsFile), cache);
    await resolveFiles(c, w.vocab.map((v) => v.commonsFile), cache);
    expect(c.log.api).toHaveLength(2);
    expect(new URL(c.log.api[1]).searchParams.get('titles').split('|')).toHaveLength(5);
  });
});

describe('verifyAudio', () => {
  it('accepts a matching WAV', () => {
    const b = wav(1);
    expect(verifyAudio(b, 'audio/wav', sha1(b))).toEqual({ ok: true });
  });
  it('rejects an HTML error page saved as .wav', () => {
    const b = new TextEncoder().encode('<html>Too many requests</html>');
    expect(verifyAudio(b, 'audio/wav', sha1(b))).toMatchObject({ ok: false, reason: expect.stringMatching(/WAV/) });
  });
  it('rejects a checksum mismatch and an unexpected type', () => {
    expect(verifyAudio(wav(1), 'audio/wav', 'deadbeef')).toMatchObject({ ok: false, reason: expect.stringMatching(/sha1/) });
    expect(verifyAudio(wav(1), 'text/html', sha1(wav(1)))).toMatchObject({ ok: false });
  });
  it('accepts an Ogg file by its magic bytes', () => {
    const b = new Uint8Array([0x4f, 0x67, 0x67, 0x53, 1, 2, 3]);
    expect(verifyAudio(b, 'application/ogg', sha1(b))).toEqual({ ok: true });
  });
});

describe('fetchAll', () => {
  const setup = (n, opts, clientOpts) => {
    const w = world(n, opts);
    const dir = tmp();
    const c = fakeClient(w, clientOpts);
    const args = { client: c, vocab: w.vocab, destDir: join(dir, 'words'), manifestPath: join(dir, 'words', 'manifest.json'), metaPath: join(dir, 'meta.json') };
    return { w, dir, c, args };
  };

  it('downloads at most `limit` files', async () => {
    const { c, args } = setup(5);
    const r = await fetchAll({ ...args, limit: 2 });
    expect(r.downloaded).toBe(2);
    expect(c.log.downloads).toHaveLength(2);
    expect(c.log.api).toHaveLength(1);
  });

  it('writes verified files and a manifest with speaker, licence and source page', async () => {
    const { args } = setup(2);
    await fetchAll({ ...args, limit: 5 });
    expect(existsSync(join(args.destDir, 'L1.wav'))).toBe(true);
    const manifest = JSON.parse(readFileSync(args.manifestPath, 'utf8'));
    expect(manifest).toHaveLength(2);
    expect(manifest[0]).toMatchObject({
      id: 'L1', file: 'L1.wav', speaker: 'Vis M', license: 'CC BY-SA 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0', bytes: 64,
    });
    expect(manifest[0].sourcePage).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
    expect(manifest[0].sha1).toHaveLength(40);
  });

  it('does not save a corrupt file, reports it, and carries on', async () => {
    const { args } = setup(3, { corrupt: [2] });
    const r = await fetchAll({ ...args, limit: 5 });
    expect(r.downloaded).toBe(2);
    expect(r.failed).toEqual([{ id: 'L2', reason: expect.stringMatching(/WAV|sha1/) }]);
    expect(existsSync(join(args.destDir, 'L2.wav'))).toBe(false);
    expect(existsSync(join(args.destDir, 'L3.wav'))).toBe(true);
  });

  it('a second run does not request files it already has', async () => {
    const { c, args } = setup(4);
    await fetchAll({ ...args, limit: 2 });
    const first = [...c.log.downloads];
    const r = await fetchAll({ ...args, limit: 10 });
    expect(r.skipped).toBe(2);
    expect(r.downloaded).toBe(2);
    for (const url of first) expect(c.log.downloads.filter((u) => u === url)).toHaveLength(1);
    expect(JSON.parse(readFileSync(args.manifestPath, 'utf8'))).toHaveLength(4);
  });

  it('a BlockedError mid-run stops at once and keeps the finished clips in the manifest', async () => {
    const { c, args } = setup(5, {}, { blockOnDownload: 2 });
    const r = await fetchAll({ ...args, limit: 5 });
    expect(r.stoppedBy).toBe('BlockedError');
    expect(r.downloaded).toBe(1);
    expect(c.log.downloads).toHaveLength(2); // the blocked attempt, then nothing more
    expect(JSON.parse(readFileSync(args.manifestPath, 'utf8')).map((m) => m.id)).toEqual(['L1']);
  });

  it('a corrupt state file or a lock timeout stops the whole run, not one clip at a time', async () => {
    for (const make of [() => new StateCorruptError('state.json'), () => new LockTimeoutError()]) {
      const { c, args } = setup(4);
      const original = c.request;
      let downloads = 0;
      c.request = async (url) => {
        if (!url.startsWith('https://commons.wikimedia.org/')) {
          downloads++;
          throw make();
        }
        return original(url);
      };
      const r = await fetchAll({ ...args, limit: 4 });
      expect(r.stoppedBy).toBe(make().name);
      expect(downloads).toBe(1); // it stopped at the first one
      expect(r.failed).toEqual([]);
    }
  });

  it('a file missing on Commons is reported, not fatal', async () => {
    const { w, args } = setup(2);
    delete w.catalog[w.vocab[0].commonsFile];
    const r = await fetchAll({ ...args, limit: 5 });
    expect(r.failed).toEqual([{ id: 'L1', reason: expect.stringMatching(/not on Commons/) }]);
    expect(r.downloaded).toBe(1);
  });
});
