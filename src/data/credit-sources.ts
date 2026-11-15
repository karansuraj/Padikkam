/**
 * Everything third-party the app uses, for the Credits screen. The per-clip audio list is generated
 * separately from assets/audio manifests (audio-credits.json); this is the rest. Keep in step with
 * docs/third-party/README.md.
 */
export interface CreditSource {
  id: string;
  title: string;
  /** What the app uses it for, in plain words. */
  usedFor: string;
  /** Who made it. */
  by: string;
  licenses: { name: string; url: string }[];
  links: { label: string; url: string }[];
  note?: string;
}

export const CREDIT_SOURCES: CreditSource[] = [
  {
    id: 'wikidata',
    title: 'Word list and meanings',
    usedFor: 'The starter vocabulary: the Malayalam words and their English meanings, grouped by topic.',
    by: 'Wikidata contributors (lexemes)',
    licenses: [{ name: 'CC0 1.0', url: 'https://creativecommons.org/publicdomain/zero/1.0/' }],
    links: [{ label: 'Wikidata lexicographical data', url: 'https://www.wikidata.org/wiki/Wikidata:Lexicographical_data' }],
    note: 'Romanization is computed by the app, not taken from Wikidata.',
  },
  {
    id: 'noto-sans-malayalam',
    title: 'Letter shapes',
    usedFor: 'The faint guide letter you trace, and the line your tracing is compared with, are derived from this font.',
    by: 'Copyright 2022 The Noto Project Authors',
    licenses: [{ name: 'SIL Open Font License 1.1 (OFL)', url: 'https://openfontlicense.org/' }],
    links: [{ label: 'Noto Sans Malayalam', url: 'https://github.com/notofonts/malayalam' }],
  },
  {
    id: 'ut-austin-clips',
    title: "How-to-write clips",
    usedFor: "The short \"Watch how it's written\" videos. 50 of the 58 letters have one. Shown unchanged.",
    by: 'Donald R. Davis, Jr., University of Texas at Austin',
    licenses: [{ name: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/' }],
    links: [
      { label: 'The Malayalam Script', url: 'https://malayalam.la.utexas.edu/resources/the-malayalam-script/' },
    ],
  },
  {
    id: 'fsrs',
    title: 'Review scheduling',
    usedFor: 'Deciding when a letter or word comes back for review (the FSRS algorithm, through the ts-fsrs library).',
    by: 'Open Spaced Repetition contributors',
    licenses: [{ name: 'MIT', url: 'https://opensource.org/license/mit' }],
    links: [{ label: 'ts-fsrs', url: 'https://github.com/open-spaced-repetition/ts-fsrs' }],
  },
  {
    id: 'mlmash',
    title: 'Also consulted',
    usedFor: "A web app for learning to write Malayalam, read for ideas. No code or data from it is in this app.",
    by: 'Santhosh Thottingal and Swathanthra Malayalam Computing (SMC)',
    licenses: [{ name: 'MIT', url: 'https://opensource.org/license/mit' }],
    links: [{ label: 'SMC mlmash', url: 'https://gitlab.com/smc/mlmash' }],
  },
];
