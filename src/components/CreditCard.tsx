import { Linking, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';
import { PressableScale } from './PressableScale';

interface Props {
  title: string;
  usedFor: string;
  by: string;
  licenses: { name: string; url: string }[];
  links?: { label: string; url: string }[];
  note?: string;
}

const open = (url: string) => Linking.openURL(url).catch((e) => console.warn('Could not open link', e));

/** One source on the Credits screen: what it is for, who made it, its licence, and where to find it. */
export function CreditCard({ title, usedFor, by, licenses, links = [], note }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{usedFor}</Text>
      <Text style={styles.by}>{by}</Text>
      {licenses.map((l) => (
        <PressableScale key={l.name} raised={false} onPress={() => open(l.url)}>
          <Text style={styles.link}>{`Licence: ${l.name}`}</Text>
        </PressableScale>
      ))}
      {links.map((l) => (
        <PressableScale key={l.url} raised={false} onPress={() => open(l.url)}>
          <Text style={styles.link}>{l.label}</Text>
        </PressableScale>
      ))}
      {note ? <Text style={styles.note}>{note}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 4,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.tint,
  },
  title: { fontSize: 16, fontWeight: '700', color: colors.text },
  body: { fontSize: 14, color: colors.text },
  by: { fontSize: 14, color: colors.textMuted },
  link: { fontSize: 14, color: colors.link, paddingVertical: 2 },
  note: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
});
