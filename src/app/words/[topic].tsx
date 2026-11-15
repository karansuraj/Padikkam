import { router, useLocalSearchParams } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import type { Entry } from '../../core/types';
import { AUDIO } from '../../data/audio';
import { TOPICS, VOCAB_BY_ID } from '../../data/vocab';
import { useLetterAudio } from '../../hooks/useLetterAudio';

export default function TopicScreen() {
  const { topic } = useLocalSearchParams<{ topic: string }>();
  const { play } = useLetterAudio();
  const found = TOPICS.find((t) => t.id === topic);

  if (!found) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Topic not found</Text>
        <Pressable style={styles.dark} onPress={() => router.dismissTo('/words')}>
          <Text style={styles.darkText}>Back to topics</Text>
        </Pressable>
      </View>
    );
  }

  const entries = found.entryIds.map((id) => VOCAB_BY_ID.get(id)).filter((e): e is Entry => e !== undefined);

  return (
    <FlatList
      data={entries}
      keyExtractor={(e) => e.id}
      contentContainerStyle={styles.list}
      ListHeaderComponent={<Text style={styles.heading}>{found.title}</Text>}
      renderItem={({ item }) => {
        // A word whose clip has not been downloaded yet simply has no play button.
        const hasClip = !!item.audio && AUDIO[item.audio] !== undefined;
        return (
          <Pressable style={styles.row} disabled={!hasClip} onPress={() => play(item.id)}>
            <View style={styles.text}>
              <Text style={styles.ml}>{item.ml}</Text>
              <Text style={styles.roman}>{item.roman}</Text>
              <Text style={styles.en} numberOfLines={2}>{item.en}</Text>
            </View>
            {hasClip && <Text style={styles.play}>Play</Text>}
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 20, gap: 10, paddingBottom: 40 },
  heading: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 14 },
  title: { fontSize: 20, fontWeight: '700' },
  dark: { padding: 14, borderRadius: 10, backgroundColor: '#222', alignItems: 'center', alignSelf: 'stretch' },
  darkText: { color: '#fff', fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: '#ccc', padding: 14, gap: 12 },
  text: { flex: 1, gap: 2 },
  ml: { fontSize: 26 },
  roman: { fontSize: 16 },
  en: { fontSize: 14, opacity: 0.7 },
  play: { fontSize: 14, fontWeight: '600', color: '#2b6cb0' },
});
