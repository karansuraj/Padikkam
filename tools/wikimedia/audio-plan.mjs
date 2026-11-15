// Planning, lookup, verification and the gentle download loop for word audio.
// All network access goes through the PoliteClient passed in (never fetch directly).
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';

const BATCH = 10;
const STOP_ERRORS = new Set(['BlockedError', 'CapReachedError', 'StoppedError']);

const extOf = (file) => file.split('.').pop().toLowerCase();

/** Which vocab items still need a clip. Pure apart from the injected `exists`. */
export function planDownloads(vocab, destDir, exists = existsSync) {
  const todo = [];
  const done = [];
  for (const e of vocab) {
    const item = { id: e.id, commonsFile: e.commonsFile, speaker: e.speaker ?? null, dest: join(destDir, `${e.id}.${extOf(e.commonsFile)}`) };
    (exists(item.dest) ? done : todo).push(item);
  }
  return { todo, done };
}

function writeAtomic(path, text) {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, text);
  renameSync(tmp, path);
}

const readJson = (path, fallback) => {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return fallback;
  }
};

const stripHtml = (s) => s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * Look up url, checksum, type and licence for Commons files: one request per 10
 * titles, only the properties we need, and everything cached so a rerun asks
 * for nothing it already knows. Returns Map(commonsFile -> info | { missing: true }).
 */
export async function resolveFiles(client, commonsFiles, cachePath) {
  const cache = readJson(cachePath, {});
  const unique = [...new Set(commonsFiles)];
  const missing = unique.filter((f) => !(f in cache));
  for (let i = 0; i < missing.length; i += BATCH) {
    const batch = missing.slice(i, i + BATCH);
    const url = `https://commons.wikimedia.org/w/api.php?${new URLSearchParams({
      action: 'query',
      format: 'json',
      prop: 'imageinfo',
      iiprop: 'url|sha1|size|mime|extmetadata',
      iiextmetadatafilter: 'LicenseShortName|LicenseUrl|Artist',
      maxlag: '5',
      titles: batch.map((f) => `File:${f}`).join('|'),
    })}`;
    const response = await client.request(url);
    const json = await response.json();
    if (json.error) throw new Error(`Commons API: ${json.error.code}. Try again later.`);
    const byTitle = new Map(Object.values(json.query?.pages ?? {}).map((p) => [p.title.replace(/^File:/, ''), p]));
    for (const f of batch) {
      const page = byTitle.get(f);
      const info = page?.imageinfo?.[0];
      cache[f] = info
        ? {
            url: info.url,
            sha1: info.sha1,
            size: info.size,
            mime: info.mime,
            license: info.extmetadata?.LicenseShortName?.value ?? '',
            licenseUrl: info.extmetadata?.LicenseUrl?.value ?? '',
            artist: stripHtml(info.extmetadata?.Artist?.value ?? ''),
          }
        : { missing: true };
    }
    writeAtomic(cachePath, JSON.stringify(cache, null, 2));
  }
  return new Map(commonsFiles.map((f) => [f, cache[f]]));
}

/** Is this really the audio file we asked for? (Not an error page, not corrupted.) */
export function verifyAudio(bytes, mime, sha1) {
  const head = (a, b) => new TextDecoder('latin1').decode(bytes.subarray(a, b));
  if (mime === 'audio/wav' || mime === 'audio/x-wav') {
    if (head(0, 4) !== 'RIFF' || head(8, 12) !== 'WAVE') return { ok: false, reason: 'not a WAV file' };
  } else if (mime === 'application/ogg' || mime === 'audio/ogg') {
    if (head(0, 4) !== 'OggS') return { ok: false, reason: 'not an Ogg file' };
  } else {
    return { ok: false, reason: `unexpected type ${mime}` };
  }
  if (createHash('sha1').update(bytes).digest('hex') !== sha1) return { ok: false, reason: 'sha1 mismatch' };
  return { ok: true };
}

/**
 * Download up to `limit` missing clips, one at a time through the client.
 * Stops at once on a block, a cap or a STOP file. Finished clips are recorded in
 * the manifest as they land, so an interrupted run loses nothing.
 */
export async function fetchAll({ client, vocab, destDir, manifestPath, metaPath, limit = 25 }) {
  const { todo, done } = planDownloads(vocab, destDir);
  const batch = todo.slice(0, limit);
  const result = { downloaded: 0, skipped: done.length, failed: [] };
  if (batch.length === 0) return result;

  let infos;
  try {
    infos = await resolveFiles(client, batch.map((i) => i.commonsFile), metaPath);
  } catch (e) {
    return { ...result, stoppedBy: STOP_ERRORS.has(e.name) ? e.name : 'ApiError', message: e.message };
  }

  for (const item of batch) {
    const info = infos.get(item.commonsFile);
    if (!info || info.missing) {
      result.failed.push({ id: item.id, reason: 'not on Commons' });
      continue;
    }
    let bytes;
    try {
      const response = await client.request(info.url);
      bytes = new Uint8Array(await response.arrayBuffer());
    } catch (e) {
      if (STOP_ERRORS.has(e.name)) return { ...result, stoppedBy: e.name, message: e.message };
      result.failed.push({ id: item.id, reason: e.message });
      continue;
    }
    const check = verifyAudio(bytes, info.mime, info.sha1);
    if (!check.ok) {
      result.failed.push({ id: item.id, reason: check.reason });
      continue;
    }
    mkdirSync(dirname(item.dest), { recursive: true });
    const tmp = `${item.dest}.tmp`;
    writeFileSync(tmp, bytes);
    renameSync(tmp, item.dest);

    const manifest = readJson(manifestPath, []).filter((m) => m.id !== item.id);
    manifest.push({
      id: item.id,
      file: basename(item.dest),
      commonsFile: item.commonsFile,
      speaker: item.speaker,
      license: info.license,
      licenseUrl: info.licenseUrl,
      artist: info.artist,
      sourcePage: `https://commons.wikimedia.org/wiki/File:${encodeURI(item.commonsFile.replace(/ /g, '_'))}`,
      sha1: info.sha1,
      bytes: bytes.length,
    });
    writeAtomic(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
    result.downloaded++;
  }
  return result;
}
