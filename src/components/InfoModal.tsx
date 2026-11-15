import { Modal, View } from 'react-native';
import { makeStyles } from '../theme';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

interface Props {
  visible: boolean;
  title: string;
  /** One short sentence per line. */
  lines: string[];
  onClose: () => void;
}

/** A small popup for the "good to know" text that does not belong on the screen itself. */
export function InfoModal({ visible, title, lines, onClose }: Props) {
  const styles = useStyles();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{title}</Text>
          {lines.map((l) => (
            <Text key={l} style={styles.line}>{`•  ${l}`}</Text>
          ))}
          <PressableScale style={styles.close} onPress={onClose}>
            <Text style={styles.closeText}>Got it</Text>
          </PressableScale>
        </View>
      </View>
    </Modal>
  );
}

const useStyles = makeStyles((c) => ({
  backdrop: { flex: 1, backgroundColor: c.scrim, alignItems: 'center', justifyContent: 'center', padding: 20 },
  sheet: { width: '100%', backgroundColor: c.surface, borderRadius: 16, padding: 18, gap: 10 },
  title: { fontSize: 18, fontWeight: '700', color: c.text },
  line: { fontSize: 15, color: c.text },
  close: { padding: 14, borderRadius: 10, backgroundColor: c.primary, alignItems: 'center', marginTop: 4 },
  closeText: { color: c.onPrimary, fontWeight: '600' },
}));
