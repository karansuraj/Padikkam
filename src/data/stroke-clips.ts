/**
 * Short hand-writing clips that show how each letter is written, one per letter.
 * Source: University of Texas at Austin, Malayalam (https://malayalam.la.utexas.edu/resources/the-malayalam-script/),
 * Donald R. Davis, Jr., licensed CC BY 4.0. See docs/third-party/README.md.
 *
 * These are a reference only. Nothing here is scored. Each clip was matched to its
 * letter by comparing the clip's final frame with the glyph. The chillu letters and
 * the rare letters ഩ ഺ റ്റ have no clip, so they are absent from this table.
 * Metro needs literal paths in `require`.
 */
export const STROKE_CLIPS: Record<string, number> = {
  'letter:0d05': require('../../assets/video/strokes/a.mp4'), // അ a
  'letter:0d06': require('../../assets/video/strokes/aa.mp4'), // ആ aa
  'letter:0d07': require('../../assets/video/strokes/i.mp4'), // ഇ i
  'letter:0d08': require('../../assets/video/strokes/ii.mp4'), // ഈ ii
  'letter:0d09': require('../../assets/video/strokes/u.mp4'), // ഉ u
  'letter:0d0a': require('../../assets/video/strokes/uu.mp4'), // ഊ uu
  'letter:0d0b': require('../../assets/video/strokes/ri.mp4'), // ഋ ru
  'letter:0d0e': require('../../assets/video/strokes/e.mp4'), // എ e
  'letter:0d0f': require('../../assets/video/strokes/ee.mp4'), // ഏ ee
  'letter:0d10': require('../../assets/video/strokes/ai.mp4'), // ഐ ai
  'letter:0d12': require('../../assets/video/strokes/o.mp4'), // ഒ o
  'letter:0d13': require('../../assets/video/strokes/oo.mp4'), // ഓ oo
  'letter:0d14': require('../../assets/video/strokes/au.mp4'), // ഔ au
  'letter:0d05_0d02': require('../../assets/video/strokes/am.mp4'), // അം am
  'letter:0d15': require('../../assets/video/strokes/ka.mp4'), // ക ka
  'letter:0d16': require('../../assets/video/strokes/kha.mp4'), // ഖ kha
  'letter:0d17': require('../../assets/video/strokes/ga.mp4'), // ഗ ga
  'letter:0d18': require('../../assets/video/strokes/gha.mp4'), // ഘ gha
  'letter:0d19': require('../../assets/video/strokes/nra.mp4'), // ങ nga
  'letter:0d1a': require('../../assets/video/strokes/ca.mp4'), // ച cha
  'letter:0d1b': require('../../assets/video/strokes/cha.mp4'), // ഛ chha
  'letter:0d1c': require('../../assets/video/strokes/ja.mp4'), // ജ ja
  'letter:0d1d': require('../../assets/video/strokes/jha.mp4'), // ഝ jha
  'letter:0d1e': require('../../assets/video/strokes/nya.mp4'), // ഞ nja
  'letter:0d1f': require('../../assets/video/strokes/tra.mp4'), // ട Ta
  'letter:0d20': require('../../assets/video/strokes/trha.mp4'), // ഠ Tha
  'letter:0d21': require('../../assets/video/strokes/dra.mp4'), // ഡ Da
  'letter:0d22': require('../../assets/video/strokes/drha.mp4'), // ഢ Dha
  'letter:0d23': require('../../assets/video/strokes/nna.mp4'), // ണ Na
  'letter:0d24': require('../../assets/video/strokes/ta.mp4'), // ത ta
  'letter:0d25': require('../../assets/video/strokes/tha.mp4'), // ഥ tha
  'letter:0d26': require('../../assets/video/strokes/da.mp4'), // ദ da
  'letter:0d27': require('../../assets/video/strokes/dha.mp4'), // ധ dha
  'letter:0d28': require('../../assets/video/strokes/na.mp4'), // ന na
  'letter:0d2a': require('../../assets/video/strokes/pa.mp4'), // പ pa
  'letter:0d2b': require('../../assets/video/strokes/pha.mp4'), // ഫ pha
  'letter:0d2c': require('../../assets/video/strokes/ba.mp4'), // ബ ba
  'letter:0d2d': require('../../assets/video/strokes/bha.mp4'), // ഭ bha
  'letter:0d2e': require('../../assets/video/strokes/ma.mp4'), // മ ma
  'letter:0d2f': require('../../assets/video/strokes/ya.mp4'), // യ ya
  'letter:0d30': require('../../assets/video/strokes/ra.mp4'), // ര ra
  'letter:0d32': require('../../assets/video/strokes/la.mp4'), // ല la
  'letter:0d35': require('../../assets/video/strokes/va.mp4'), // വ va
  'letter:0d36': require('../../assets/video/strokes/sha.mp4'), // ശ sha
  'letter:0d37': require('../../assets/video/strokes/shha.mp4'), // ഷ Sha
  'letter:0d38': require('../../assets/video/strokes/sa.mp4'), // സ sa
  'letter:0d39': require('../../assets/video/strokes/ha.mp4'), // ഹ ha
  'letter:0d33': require('../../assets/video/strokes/lra.mp4'), // ള La
  'letter:0d34': require('../../assets/video/strokes/lla.mp4'), // ഴ zha
  'letter:0d31': require('../../assets/video/strokes/raa.mp4'), // റ Ra
};

/** The clip for a letter id, or undefined when there is none. */
export function clipFor(letterId: string): number | undefined {
  return STROKE_CLIPS[letterId];
}
