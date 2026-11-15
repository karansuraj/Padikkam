import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { FadeIn } from '../components/FadeIn';
import { PressableScale } from '../components/PressableScale';
import { unlockedLessonIds } from '../core/lesson';
import { LESSONS } from '../data/lessons';
import { LETTERS, LETTER_BY_ID } from '../data/letters';
import { getPassedLessonIds } from '../data/progress';
import { useLetterAudio } from '../hooks/useLetterAudio';

export default function Letters() {
  const [passed, setPassed] = useState<Set<string>>(new Set());
  const { play } = useLetterAudio();

  // Reload on focus so a lesson passed on the next screen shows up when you come back.
  useFocusEffect(
    useCallback(() => {
      getPassedLessonIds().then(setPassed).catch((e) => console.warn('Could not load progress', e));
    }, []),
  );

  const unlocked = unlockedLessonIds(LESSONS, passed);

  return (
    <FadeIn style={styles.fill}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.heading}>Lessons</Text>
        {LESSONS.map((lesson, i) => {
          const isPassed = passed.has(lesson.id);
          const isOpen = unlocked.has(lesson.id);
          const preview = lesson.letterIds.map((id) => LETTER_BY_ID.get(id)?.ml ?? '').join(' ');
          return (
            <PressableScale
              key={lesson.id}
              disabled={!isOpen}
              onPress={() => router.push(`/lesson/${lesson.id}`)}
              style={[styles.row, !isOpen && styles.locked]}
            >
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>{`${i + 1}. ${lesson.title}`}</Text>
                <Text style={styles.preview}>{preview}</Text>
              </View>
              <Text style={styles.status}>{isPassed ? 'Passed' : isOpen ? 'Start' : 'Locked'}</Text>
            </PressableScale>
          );
        })}

        <Text style={styles.heading}>All letters (tap to hear)</Text>
        <View style={styles.grid}>
          {LETTERS.map((l) => (
            <PressableScale key={l.id} style={styles.cell} onPress={() => play(l.id)}>
              <Text style={styles.glyph}>{l.ml}</Text>
              <Text style={styles.roman}>{l.roman}</Text>
            </PressableScale>
          ))}
        </View>
      </ScrollView>
    </FadeIn>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  container: { padding: 20, gap: 10, paddingBottom: 40 },
  heading: { fontSize: 14, opacity: 0.6, textTransform: 'uppercase', marginTop: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 14,
    gap: 12,
  },
  locked: { opacity: 0.4 },
  rowText: { flex: 1, gap: 4 },
  rowTitle: { fontSize: 16, fontWeight: '600' },
  preview: { fontSize: 20 },
  status: { fontSize: 13, opacity: 0.7 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cell: {
    width: '22%',
    aspectRatio: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: { fontSize: 28 },
  roman: { fontSize: 11, opacity: 0.6 },
});
