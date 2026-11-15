import { router, useLocalSearchParams } from 'expo-router';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { FadeIn } from '../../components/FadeIn';
import { PressableScale } from '../../components/PressableScale';
import type { Entry } from '../../core/types';
import { AUDIO } from '../../data/audio';
import { TOPICS, VOCAB_BY_ID } from '../../data/vocab';
import { useLetterAudio } from '../../hooks/useLetterAudio';
import { colors } from '../../theme';

export default function TopicScreen() {
  const { topic } = useLocalSearchParams<{ topic: string }>();
  const { play } = useLetterAudio();
  const found = TOPICS.find((t) => t.id === topic);

  if (!found) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Topic not found</Text>
        <PressableScale style={styles.dark} deferPress onPress={() => router.dismissTo('/words')}>
          <Text style={styles.darkText}>Back to topics</Text>
        </PressableScale>
      </View>
    );
  }

  const entries = found.entryIds.map((id) => VOCAB_BY_ID.get(id)).filter((e): e is Entry => e !== undefined);

  return (
    <FadeIn style={styles.fill}>
      <FlatList
        data={entries}
        keyExtractor={(e) => e.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={<Text style={styles.heading}>{found.title}</Text>}
        renderItem={({ item }) => {
          // A word whose clip has not been downloaded yet simply has no play button.
          const hasClip = !!item.audio && AUDIO[item.audio] !== undefined;
          return (
            <PressableScale style={styles.row} disabled={!hasClip} onPress={() => play(item.id)}>
              <View style={styles.text}>
                <Text style={styles.ml}>{item.ml}</Text>
                <Text style={styles.roman}>{item.roman}</Text>
                <Text style={styles.en} numberOfLines={2}>{item.en}</Text>
              </View>
              {hasClip && <Text style={styles.play}>Play</Text>}
            </PressableScale>
          );
        }}
      />
    </FadeIn>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  list: { padding: 20, gap: 10, paddingBottom: 40 },
  heading: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 14 },
  title: { fontSize: 20, fontWeight: '700' },
  dark: { padding: 14, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center', alignSelf: 'stretch' },
  darkText: { color: colors.onPrimary, fontWeight: '600' },
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
  text: { flex: 1, gap: 2 },
  ml: { fontSize: 26, color: colors.text },
  roman: { fontSize: 16, color: colors.text },
  en: { fontSize: 14, color: colors.textMuted },
  play: { fontSize: 14, fontWeight: '600', color: colors.link },
});
