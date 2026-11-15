// Generates src/data/audio.ts and src/data/audio-credits.json from the audio manifests
// (assets/audio/letters/manifest.json and, once downloaded, assets/audio/words/manifest.json).
// Run: npm run gen:audio
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildAudioFiles } from './audio-map-lib.mjs';

const root = new URL('../', import.meta.url);
const at = (rel) => fileURLToPath(new URL(rel, root));
const readJson = (rel, fallback) => (existsSync(at(rel)) ? JSON.parse(readFileSync(at(rel), 'utf8')) : fallback);

const letters = readJson('assets/audio/letters/manifest.json', []);
const words = readJson('assets/audio/words/manifest.json', []);
const vocab = readJson('src/data/vocab-data.json', []);

const { audioTs, credits } = buildAudioFiles({ letters, words, vocab });
writeFileSync(at('src/data/audio.ts'), audioTs);
writeFileSync(at('src/data/audio-credits.json'), JSON.stringify(credits, null, 2) + '\n');
console.log(`wrote src/data/audio.ts and audio-credits.json: ${letters.length} letter clips, ${words.length} word clips`);
