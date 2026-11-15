import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { FadeIn } from '../components/FadeIn';
import { PressableScale } from '../components/PressableScale';
import { colors } from '../theme';
import { unlockedLessonIds } from '../core/lesson';
import { LESSONS } from '../data/lessons';
import { LETTERS, LETTER_BY_ID } from '../data/letters';
import { getPassedLessonIds } from '../data/progress';
import { useLetterAudio } from '../hooks/useLetterAudio';

const COLUMNS = 4;
const GRID_GAP = 8;
const PAGE_PADDING = 20;

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

  // Square cells sized from the screen width, so a short last row does not stretch.
  const { width } = useWindowDimensions();
  const cellSize = Math.floor((width - PAGE_PADDING * 2 - GRID_GAP * (COLUMNS - 1)) / COLUMNS);

  // The letter grid is a virtualised list (58 cells) so the screen mounts quickly and the
  // button that opened it can finish its release animation.
  return (
    <FadeIn style={styles.fill}>
      <FlatList
        data={LETTERS}
        numColumns={COLUMNS}
        keyExtractor={(l) => l.id}
        contentContainerStyle={styles.container}
        columnWrapperStyle={styles.gridRow}
        initialNumToRender={12}
        windowSize={7}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.heading}>Lessons</Text>
            {LESSONS.map((lesson, i) => {
              const isPassed = passed.has(lesson.id);
              const isOpen = unlocked.has(lesson.id);
              const preview = lesson.letterIds.map((id) => LETTER_BY_ID.get(id)?.ml ?? '').join(' ');
              return (
                <PressableScale
                  key={lesson.id}
                  disabled={!isOpen}
                  deferPress
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
          </View>
        }
        renderItem={({ item: l }) => (
          <PressableScale style={[styles.cell, { width: cellSize }]} onPress={() => play(l.id)}>
            <Text style={styles.glyph}>{l.ml}</Text>
            <Text style={styles.roman}>{l.roman}</Text>
          </PressableScale>
        )}
      />
    </FadeIn>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  container: { padding: PAGE_PADDING, gap: GRID_GAP, paddingBottom: 40 },
  header: { gap: 10 },
  heading: { fontSize: 14, opacity: 0.6, textTransform: 'uppercase', marginTop: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.tint,
    padding: 14,
    gap: 12,
  },
  locked: { opacity: 0.4 },
  rowText: { flex: 1, gap: 4 },
  rowTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  preview: { fontSize: 20, color: colors.text },
  status: { fontSize: 13, fontWeight: '600', color: colors.link },
  gridRow: { gap: GRID_GAP },
  cell: {
    aspectRatio: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: { fontSize: 28, color: colors.text },
  roman: { fontSize: 11, color: colors.textMuted },
});
