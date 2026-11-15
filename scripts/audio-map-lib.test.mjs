import { describe, expect, it } from 'vitest';
import { buildAudioFiles } from './audio-map-lib.mjs';

const letters = [
  { letter: 'ക', file: 'u0d15.wav', speaker: 'Vis M', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0', sourcePage: 'https://commons.wikimedia.org/wiki/File:a' },
  { letter: 'അ', file: 'u0d05.wav', speaker: 'Vis M', license: 'CC0', licenseUrl: 'http://creativecommons.org/publicdomain/zero/1.0/deed.en', sourcePage: 'https://commons.wikimedia.org/wiki/File:b' },
];
const words = [
  { id: 'L480', file: 'L480.wav', speaker: 'Vis M', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0', sourcePage: 'https://commons.wikimedia.org/wiki/File:c' },
];
const vocab = [{ id: 'L480', ml: 'അമ്മ' }];

describe('buildAudioFiles', () => {
  it('maps letters and words to literal require paths, sorted', () => {
    const { audioTs } = buildAudioFiles({ letters, words, vocab });
    expect(audioTs).toContain("'letters/u0d05.wav': require('../../assets/audio/letters/u0d05.wav'),");
    expect(audioTs).toContain("'words/L480.wav': require('../../assets/audio/words/L480.wav'),");
    expect(audioTs.indexOf('letters/u0d05')).toBeLessThan(audioTs.indexOf('letters/u0d15'));
    expect(audioTs).toMatch(/GENERATED/);
  });

  it('works with no word clips yet', () => {
    const { audioTs, credits } = buildAudioFiles({ letters, words: [], vocab });
    expect(audioTs).not.toContain('words/');
    expect(credits).toHaveLength(2);
  });

  it('credits: one per clip, labelled with the glyph or the word, with https licence links', () => {
    const { credits } = buildAudioFiles({ letters, words, vocab });
    expect(credits).toHaveLength(3);
    expect(credits.map((c) => c.label)).toEqual(['ക', 'അ', 'അമ്മ']);
    expect(credits.find((c) => c.label === 'അ').licenseUrl).toBe('https://creativecommons.org/publicdomain/zero/1.0/deed.en');
    expect(credits[2]).toMatchObject({ speaker: 'Vis M', license: 'CC BY-SA 4.0', sourcePage: 'https://commons.wikimedia.org/wiki/File:c' });
  });

  it('a word clip whose lexeme is not in the deck still gets a credit, labelled by its id', () => {
    const { credits } = buildAudioFiles({ letters: [], words, vocab: [] });
    expect(credits[0].label).toBe('L480');
  });
});
