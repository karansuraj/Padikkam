export interface ClipCredit {
  speaker: string;
  license: string;
  licenseUrl: string;
}

export interface CreditSummary {
  speakers: string[];
  licenses: { name: string; url: string }[];
}

/**
 * Distinct speakers and licences (with a link each) for the credits screen.
 * CC BY-SA asks for a link to the licence, and the CC pages are served over
 * https, so an http link from the metadata is upgraded.
 */
export function summarizeCredits(clips: ClipCredit[]): CreditSummary {
  const speakers = [...new Set(clips.map((c) => c.speaker))];
  const seen = new Map<string, string>();
  for (const c of clips) {
    if (!seen.has(c.license)) seen.set(c.license, c.licenseUrl.replace(/^http:\/\//, 'https://'));
  }
  return { speakers, licenses: [...seen].map(([name, url]) => ({ name, url })) };
}
