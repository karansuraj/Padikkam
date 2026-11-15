import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { summarizeCredits } from '../core/credits';
import creditsData from '../data/audio-credits.json';

interface Clip {
  label: string;
  speaker: string;
  license: string;
  licenseUrl: string;
  sourcePage: string;
}

const clips = creditsData as Clip[];
const { speakers, licenses } = summarizeCredits(clips);

const open = (url: string) => Linking.openURL(url).catch((e) => console.warn('Could not open link', e));

export default function Credits() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Audio credits</Text>
      <Text style={styles.body}>
        {`Letter and word sounds recorded by ${speakers.join(', ')} for Lingua Libre and published on Wikimedia Commons.`}
      </Text>
      {licenses.map((l) => (
        <Pressable key={l.name} onPress={() => open(l.url)}>
          <Text style={styles.link}>{`Licence: ${l.name} (tap to read)`}</Text>
        </Pressable>
      ))}
      <Text style={styles.note}>
        The clips are learning aids. They have not been checked by a native speaker, so treat them as unverified.
      </Text>
      <View style={styles.list}>
        {clips.map((c) => (
          <Pressable key={`${c.label}|${c.sourcePage}`} style={styles.row} onPress={() => open(c.sourcePage)}>
            <Text style={styles.glyph} numberOfLines={1}>{c.label}</Text>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>{`${c.speaker}, ${c.license}`}</Text>
              <Text style={styles.link}>Source page on Wikimedia Commons</Text>
            </View>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 12, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '700' },
  body: { fontSize: 16 },
  note: { fontSize: 14, opacity: 0.7 },
  list: { gap: 8, marginTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#ccc', borderRadius: 10, padding: 10 },
  glyph: { fontSize: 28, width: 56, textAlign: 'center' },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 14 },
  link: { fontSize: 13, color: '#2b6cb0' },
});
