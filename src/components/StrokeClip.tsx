import { useVideoPlayer, VideoView } from 'expo-video';
import { useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { clipFor } from '../data/stroke-clips';
import { colors } from '../theme';
import { PressableScale } from './PressableScale';

function Player({ source }: { source: number }) {
  const player = useVideoPlayer(source, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });
  return <VideoView player={player} style={styles.video} contentFit="contain" nativeControls={false} />;
}

/**
 * "Watch how it's written": a short looping clip of the letter being written by hand, in a modal so the
 * writing screen never has to scroll. Shows nothing for letters without a clip. A reference only; the app
 * does not check stroke order.
 */
export function StrokeClip({ letterId }: { letterId: string }) {
  const [open, setOpen] = useState(false);
  const source = clipFor(letterId);
  if (source === undefined) return null;
  return (
    <>
      <PressableScale style={styles.toggle} onPress={() => setOpen(true)}>
        <Text style={styles.toggleText}>Watch how it's written</Text>
      </PressableScale>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <Player source={source} />
            <Text style={styles.note}>How the letter is written by hand. The app does not check stroke order.</Text>
            <PressableScale style={styles.close} onPress={() => setOpen(false)}>
              <Text style={styles.closeText}>Close</Text>
            </PressableScale>
          </View>
        </View>
      </Modal>
    </>
  );
}

/** True when `letterId` has a clip to show. */
export const hasStrokeClip = (letterId: string): boolean => clipFor(letterId) !== undefined;

const styles = StyleSheet.create({
  toggle: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  toggleText: { fontWeight: '600', color: colors.text },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  sheet: { width: '100%', backgroundColor: colors.surface, borderRadius: 16, padding: 16, gap: 12 },
  video: { width: '100%', aspectRatio: 502 / 270, backgroundColor: '#f4f4f4', borderRadius: 10 },
  note: { fontSize: 13, color: colors.textMuted },
  close: { padding: 14, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center' },
  closeText: { color: colors.onPrimary, fontWeight: '600' },
});
