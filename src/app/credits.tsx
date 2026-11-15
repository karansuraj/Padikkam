import { FlatList, Linking, StyleSheet, Text, View } from 'react-native';
import { FadeIn } from '../components/FadeIn';
import { CreditCard } from '../components/CreditCard';
import { PressableScale } from '../components/PressableScale';
import { colors } from '../theme';
import { summarizeCredits } from '../core/credits';
import creditsData from '../data/audio-credits.json';
import { CREDIT_SOURCES } from '../data/credit-sources';

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
  // A list, not a ScrollView of every row, so the screen mounts quickly and the button that
  // opened it can finish its release animation.
  return (
    <FadeIn style={styles.fill}>
      <FlatList
        data={clips}
        keyExtractor={(c) => `${c.label}|${c.sourcePage}`}
        contentContainerStyle={styles.container}
        initialNumToRender={12}
        windowSize={7}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Credits</Text>
            <Text style={styles.body}>Padikkam is built on other people's open work. Thank you to everyone below.</Text>
            <CreditCard
              title="Letter and word audio"
              usedFor="The recorded sound for every letter and word."
              by={`Recorded by ${speakers.join(', ')} for Lingua Libre, published on Wikimedia Commons.`}
              licenses={licenses}
              links={[
                { label: 'Lingua Libre', url: 'https://lingualibre.org/' },
                { label: 'Wikimedia Commons', url: 'https://commons.wikimedia.org/' },
              ]}
              note="The clips have not been checked by a native speaker, so treat them as unverified."
            />
            {CREDIT_SOURCES.map((c) => (
              <CreditCard key={c.id} {...c} />
            ))}
            <Text style={styles.section}>Every audio clip</Text>
          </View>
        }
        renderItem={({ item: c }) => (
          <PressableScale style={styles.row} onPress={() => open(c.sourcePage)}>
            <Text style={styles.glyph} numberOfLines={1}>{c.label}</Text>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>{`${c.speaker}, ${c.license}`}</Text>
              <Text style={styles.link}>Source page on Wikimedia Commons</Text>
            </View>
          </PressableScale>
        )}
      />
    </FadeIn>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  container: { padding: 20, gap: 8, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '700', color: colors.text },
  body: { fontSize: 16, color: colors.text },
  section: { fontSize: 14, textTransform: 'uppercase', color: colors.textMuted, marginTop: 8 },
  header: { gap: 12, marginBottom: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.tint,
    borderRadius: 10,
    padding: 10,
  },
  glyph: { fontSize: 28, width: 56, textAlign: 'center', color: colors.text },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 14, color: colors.text },
  link: { fontSize: 13, color: colors.link },
});
