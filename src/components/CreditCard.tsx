import { Linking, View } from 'react-native';
import { makeStyles } from '../theme';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

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
  const styles = useStyles();
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

const useStyles = makeStyles((c) => ({
  card: {
    gap: 4,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.tint,
  },
  title: { fontSize: 16, fontWeight: '700', color: c.text },
  body: { fontSize: 14, color: c.text },
  by: { fontSize: 14, color: c.textMuted },
  link: { fontSize: 14, color: c.link, paddingVertical: 2 },
  note: { fontSize: 13, color: c.textMuted, marginTop: 2 },
}));
