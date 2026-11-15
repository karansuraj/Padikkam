import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SEED } from '../data/seed';
import { getAllCardStates, saveCardState } from '../data/db';
import { isDue, newCardState, review } from '../core/srs';
import type { CardState, Entry, Grade } from '../core/types';

const GRADES: { grade: Grade; label: string }[] = [
  { grade: 'again', label: 'Again' },
  { grade: 'hard', label: 'Hard' },
  { grade: 'good', label: 'Good' },
  { grade: 'easy', label: 'Easy' },
];

export default function Review() {
  const [states, setStates] = useState<Map<string, CardState> | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    getAllCardStates().then(setStates);
  }, []);

  const queue = useMemo<Entry[]>(() => {
    if (!states) return [];
    const now = new Date();
    return SEED.filter((e) => {
      const s = states.get(e.id);
      return !s || isDue(s, now);
    });
  }, [states]);

  const current = queue[0];

  const grade = useCallback(
    async (g: Grade) => {
      if (!current || !states) return;
      const prev = states.get(current.id) ?? newCardState(current.id);
      const next = review(prev, g);
      await saveCardState(next);
      setStates(new Map(states).set(current.id, next));
      setRevealed(false);
    },
    [current, states],
  );

  if (!states) return <View style={styles.center}><Text>Loading…</Text></View>;
  if (!current) {
    return (
      <View style={styles.center}>
        <Text style={styles.done}>Nothing due. Come back later.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.count}>{queue.length} due</Text>
      <Pressable style={styles.card} onPress={() => setRevealed(true)}>
        <Text style={styles.ml}>{current.ml}</Text>
        <Text style={styles.badge}>{current.register}</Text>
        {revealed ? (
          <>
            <Text style={styles.roman}>{current.roman}</Text>
            <Text style={styles.en}>{current.en}</Text>
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
  row: { flexDirection: 'row', gap: 8 },
  btn: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: '#222', alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '600' },
});
