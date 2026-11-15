import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { FadeIn } from '../components/FadeIn';
import { PressableScale } from '../components/PressableScale';
import { colors } from '../theme';

const ITEMS: { href: '/letters' | '/words' | '/practice' | '/review' | '/credits'; title: string; sub: string }[] = [
  { href: '/letters', title: 'Letters', sub: 'Learn the script, lesson by lesson, with audio' },
  { href: '/words', title: 'Words', sub: 'Starter vocabulary by topic, with romanization and audio' },
  { href: '/practice', title: 'Practice', sub: 'Quiz yourself on letters that are due' },
  { href: '/review', title: 'Review cards', sub: 'Flashcards from the starter words' },
  { href: '/credits', title: 'Audio credits', sub: 'Who recorded the clips, and under what licence' },
];

export default function Home() {
  return (
    <View style={styles.container}>
      {ITEMS.map((item, i) => (
        <FadeIn key={item.href} delay={i * 40}>
          <Link href={item.href} asChild>
            <PressableScale style={styles.card} deferPress>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.sub}>{item.sub}</Text>
            </PressableScale>
          </Link>
        </FadeIn>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, gap: 12 },
  card: { borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.tint, padding: 18, gap: 4 },
  title: { fontSize: 20, fontWeight: '600', color: colors.text },
  sub: { fontSize: 14, color: colors.textMuted },
});
