import { Modal, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';
import { PressableScale } from './PressableScale';

interface Props {
  visible: boolean;
  title: string;
  /** One short sentence per line. */
  lines: string[];
  onClose: () => void;
}

/** A small popup for the "good to know" text that does not belong on the screen itself. */
export function InfoModal({ visible, title, lines, onClose }: Props) {
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

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  sheet: { width: '100%', backgroundColor: colors.surface, borderRadius: 16, padding: 18, gap: 10 },
  title: { fontSize: 18, fontWeight: '700', color: colors.text },
  line: { fontSize: 15, color: colors.text },
  close: { padding: 14, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center', marginTop: 4 },
  closeText: { color: colors.onPrimary, fontWeight: '600' },
});
