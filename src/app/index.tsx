import { Link } from 'expo-router';
import { View } from 'react-native';
import { FadeIn } from '../components/FadeIn';
import { PressableScale } from '../components/PressableScale';
import { makeStyles } from '../theme';
import { Text } from '../components/Text';

const ITEMS: { href: '/letters' | '/words' | '/practice' | '/write' | '/review' | '/credits' | '/settings'; title: string; sub: string }[] = [
  { href: '/letters', title: 'Letters', sub: 'Learn the script, lesson by lesson, with audio' },
  { href: '/words', title: 'Words', sub: 'Starter vocabulary by topic, with romanization and audio' },
  { href: '/practice', title: 'Practice', sub: 'Quiz yourself on letters that are due' },
  { href: '/write', title: 'Writing practice', sub: 'Trace the letters with your finger and get feedback' },
  { href: '/review', title: 'Review cards', sub: 'Flashcards from the starter words' },
  { href: '/credits', title: 'Credits', sub: 'Who recorded the clips and made the letter shapes, and under what licence' },
  { href: '/settings', title: 'Settings', sub: 'Appearance: light, dark or follow your phone' },
];

export default function Home() {
  const styles = useStyles();
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

const useStyles = makeStyles((c) => ({
  container: { flex: 1, padding: 20, gap: 12 },
  card: { borderRadius: 14, borderWidth: 1, borderColor: c.border, backgroundColor: c.tint, padding: 18, gap: 4 },
  title: { fontSize: 20, fontWeight: '600', color: c.text },
  sub: { fontSize: 14, color: c.textMuted },
}));
