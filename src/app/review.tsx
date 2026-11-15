import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { buildReviewQueue } from '../core/review-queue';
import { newCardState, review } from '../core/srs';
import type { CardState, Entry, Grade } from '../core/types';
import { AUDIO } from '../data/audio';
import { getAllCardStates, saveCardState } from '../data/db';
import { SEED } from '../data/seed';
import { VOCAB } from '../data/vocab';
import { useLetterAudio } from '../hooks/useLetterAudio';

const DECK: Entry[] = [...SEED, ...VOCAB];

const GRADES: { grade: Grade; label: string }[] = [
  { grade: 'again', label: 'Again' },
  { grade: 'hard', label: 'Hard' },
  { grade: 'good', label: 'Good' },
  { grade: 'easy', label: 'Easy' },
];

export default function Review() {
  const { play } = useLetterAudio();
  // The session's cards are chosen once, so the cap on new cards holds for the whole session.
  const [queue, setQueue] = useState<Entry[] | null>(null);
  const [states, setStates] = useState<Map<string, CardState>>(new Map());
  const [revealed, setRevealed] = useState(false);
  // A fast double tap must not grade the same card twice (which would also skip the next one).
  const grading = useRef(false);

  useEffect(() => {
    getAllCardStates()
      .then((loaded) => {
        setStates(loaded);
        setQueue(buildReviewQueue(DECK, loaded, new Date()));
      })
      .catch((e) => {
        console.warn('Could not load review state', e);
        setQueue([]);
      });
  }, []);

  const current = queue?.[0];
  useEffect(() => {
    grading.current = false; // a new card is on screen
  }, [current]);

  const grade = useCallback(
    async (g: Grade) => {
      if (!current || grading.current) return;
      grading.current = true;
      const prev = states.get(current.id) ?? newCardState(current.id);
      const next = review(prev, g);
      setStates(new Map(states).set(current.id, next));
      setQueue((q) => (q ? q.slice(1) : q));
      setRevealed(false);
      try {
        await saveCardState(next);
      } catch (e) {
        console.warn('Could not save review', e);
      }
    },
    [current, states],
  );

  if (!queue) return <View style={styles.center}><Text>Loading…</Text></View>;
  if (!current) {
    return (
      <View style={styles.center}>
        <Text style={styles.done}>Nothing due. Come back later.</Text>
      </View>
    );
  }

  const hasClip = !!current.audio && AUDIO[current.audio] !== undefined;

  return (
    <View style={styles.container}>
      <Text style={styles.count}>{`${queue.length} left`}</Text>
      <Pressable style={styles.card} onPress={() => setRevealed(true)}>
        <Text style={styles.ml}>{current.ml}</Text>
        <Text style={styles.badge}>{current.register}</Text>
        {revealed ? (
          <>
            <Text style={styles.roman}>{current.roman}</Text>
            <Text style={styles.en}>{current.en}</Text>
            {hasClip && (
              <Pressable style={styles.play} onPress={() => play(current.id)}>
                <Text style={styles.playText}>Play sound</Text>
              </Pressable>
            )}
          </>
        ) : (
          <Text style={styles.hint}>Tap to reveal</Text>
        )}
      </Pressable>
      {revealed && (
        <View style={styles.row}>
          {GRADES.map(({ grade: g, label }) => (
            <Pressable key={g} style={styles.btn} onPress={() => grade(g)}>
              <Text style={styles.btnText}>{label}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, gap: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  done: { fontSize: 18 },
  count: { fontSize: 14, opacity: 0.6, textAlign: 'center' },
  card: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  ml: { fontSize: 64 },
  badge: { fontSize: 12, opacity: 0.5, textTransform: 'uppercase' },
  roman: { fontSize: 24 },
  en: { fontSize: 18, opacity: 0.8, textAlign: 'center' },
  hint: { opacity: 0.5 },
  play: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 10, backgroundColor: '#222' },
  playText: { color: '#fff', fontWeight: '600' },
  row: { flexDirection: 'row', gap: 8 },
  btn: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: '#222', alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '600' },
});
