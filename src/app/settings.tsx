import { View } from 'react-native';
import { FadeIn } from '../components/FadeIn';
import { PressableScale } from '../components/PressableScale';
import { Text } from '../components/Text';
import type { ThemePreference } from '../core/theme';
import { makeStyles, useTheme } from '../theme';

const OPTIONS: { value: ThemePreference; title: string; sub: string }[] = [
  { value: 'system', title: 'System', sub: "Follow your phone's light or dark setting" },
  { value: 'light', title: 'Light', sub: 'Always use the light theme' },
  { value: 'dark', title: 'Dark', sub: 'Always use the dark theme' },
];

export default function Settings() {
  const styles = useStyles();
  const { preference, setPreference, scheme } = useTheme();

  return (
    <FadeIn style={styles.container}>
      <Text style={styles.heading}>Appearance</Text>
      <View accessibilityRole="radiogroup" style={styles.group}>
        {OPTIONS.map((o) => {
          const selected = o.value === preference;
          return (
            <PressableScale
              key={o.value}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              style={[styles.row, selected && styles.rowSelected]}
              onPress={() => setPreference(o.value)}
            >
              <View style={styles.rowText}>
                <Text style={styles.title}>{o.title}</Text>
                <Text style={styles.sub}>{o.sub}</Text>
              </View>
              <View style={[styles.radio, selected && styles.radioSelected]}>
                {selected && <View style={styles.dot} />}
              </View>
            </PressableScale>
          );
        })}
      </View>
      <Text style={styles.note}>
        {preference === 'system' ? `Following your phone: currently ${scheme}.` : `Using the ${scheme} theme.`}
      </Text>
    </FadeIn>
  );
}

const useStyles = makeStyles((c) => ({
  container: { flex: 1, padding: 20, gap: 12 },
  heading: { fontSize: 14, color: c.textMuted, textTransform: 'uppercase' },
  group: { gap: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.tint,
    padding: 16,
    gap: 12,
  },
  rowSelected: { borderColor: c.link, borderWidth: 2, padding: 15 },
  rowText: { flex: 1, gap: 4 },
  title: { fontSize: 18, fontWeight: '600' },
  sub: { fontSize: 14, color: c.textMuted },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: c.link },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: c.link },
  note: { fontSize: 14, color: c.textMuted, marginTop: 4 },
}));
