import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, useWindowDimensions, View } from 'react-native';
import { InfoModal } from '../components/InfoModal';
import { PressableScale } from '../components/PressableScale';
import { StrokeClip, hasStrokeClip } from '../components/StrokeClip';
import { TraceCanvas } from '../components/TraceCanvas';
import {
  DEFAULT_TRACE_OPTIONS,
  MEMORY_TRACE_OPTIONS,
  fitToTarget,
  scoreTrace,
  type Stroke,
  type TraceFeedback,
  type TraceResult,
} from '../core/trace';
import { buildWriteSession, letterIdsOfPassedLessons, writeCardId } from '../core/write';
import { LESSONS } from '../data/lessons';
import { LETTER_BY_ID } from '../data/letters';
import { getGlyph } from '../data/glyphs';
import { getPassedLessonIds } from '../data/progress';
import { useLetterAudio } from '../hooks/useLetterAudio';
import { useWriteGrading } from '../hooks/useWriteGrading';
import { makeStyles } from '../theme';
import { Text } from '../components/Text';

type Phase = 'loading' | 'empty' | 'write' | 'result' | 'done';
type Mode = 'trace' | 'memory';

const FEEDBACK: Record<TraceFeedback, string> = {
  empty: 'Draw the letter first.',
  'too-short': 'That was too short to judge. Trace the whole letter.',
  strayed: 'Some of your line wandered away from the letter. Try again, a little slower.',
  incomplete: 'Good start, but part of the letter is missing. Trace all of it.',
  good: 'Nice. That is close enough.',
  great: 'Great trace!',
};

export default function Write() {
  const styles = useStyles();
  const { letter: letterParam } = useLocalSearchParams<{ letter?: string }>();
  const { width, height } = useWindowDimensions();
  // Fit the canvas, the buttons and the notes on one screen: the page does not scroll while you write.
  const size = Math.max(220, Math.min(width - 40, height - 400, 380));
  const { play } = useLetterAudio();
  const { load, onResult } = useWriteGrading();

  const [phase, setPhase] = useState<Phase>('loading');
  const [queue, setQueue] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [mode, setMode] = useState<Mode>('trace');
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [shown, setShown] = useState<Stroke[]>([]); // what the result screen draws
  const [result, setResult] = useState<TraceResult | null>(null);
  const [memoryTries, setMemoryTries] = useState<boolean[]>([]);
  const [infoOpen, setInfoOpen] = useState(false);
  // Letters written before start in From memory; new ones start with the guide.
  const seen = useRef(new Set<string>());
  // Only the first From-memory Check on each letter in a session is graded: retries do not stack
  // "again" reviews, and copying the guide does not count as remembering.
  const graded = useRef(new Set<string>());

  useEffect(() => {
    let cancelled = false;
    setPhase('loading');
    (async () => {
      try {
        let ids: string[];
        if (letterParam) {
          if (!LETTER_BY_ID.has(letterParam) || !getGlyph(letterParam)) {
            router.replace('/');
            return;
          }
          const states = await load();
          if (cancelled) return;
          seen.current = new Set(states.has(writeCardId(letterParam)) ? [letterParam] : []);
          ids = [letterParam];
        } else {
          const [states, passed] = await Promise.all([load(), getPassedLessonIds()]);
          if (cancelled) return;
          ids = buildWriteSession(letterIdsOfPassedLessons(LESSONS, passed), states, new Date()).filter(
            (id) => getGlyph(id) !== undefined,
          );
          seen.current = new Set(ids.filter((id) => states.has(writeCardId(id))));
        }
        if (ids.length === 0) {
          setPhase('empty');
          return;
        }
        graded.current = new Set();
        setQueue(ids);
        setIndex(0);
        setMode(seen.current.has(ids[0]) ? 'memory' : 'trace');
        setMemoryTries([]);
        setStrokes([]);
        setResult(null);
        setPhase('write');
      } catch (e) {
        console.warn('Could not start writing practice', e);
        if (!cancelled) setPhase('empty');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [letterParam, load]);

  const letterId = queue[index];
  const entry = letterId ? LETTER_BY_ID.get(letterId) : undefined;
  const glyph = letterId ? getGlyph(letterId) : undefined;

  // Say the letter when it first appears, not again on every retry.
  useEffect(() => {
    if (letterId) play(letterId);
  }, [letterId, play]);

  const check = useCallback(() => {
    if (!glyph || !letterId) return;
    const memory = mode === 'memory';
    const drawn = memory ? fitToTarget(strokes, glyph.target) : strokes;
    const r = scoreTrace(glyph.target, drawn, memory ? MEMORY_TRACE_OPTIONS : DEFAULT_TRACE_OPTIONS);
    setShown(drawn);
    setResult(r);
    setPhase('result');
    if (memory && !graded.current.has(letterId)) {
      graded.current.add(letterId);
      setMemoryTries((t) => [...t, r.passed]);
      onResult(letterId, r.passed);
    }
  }, [glyph, letterId, mode, strokes, onResult]);

  const backToWrite = (nextMode: Mode) => {
    setMode(nextMode);
    setStrokes([]);
    setResult(null);
    setPhase('write');
  };

  const next = () => {
    if (index + 1 >= queue.length) {
      // Opened from a lesson: go back to it. From the home screen: show a summary.
      if (letterParam) router.back();
      else setPhase('done');
      return;
    }
    const id = queue[index + 1];
    setIndex(index + 1);
    backToWrite(seen.current.has(id) ? 'memory' : 'trace');
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setStrokes([]);
  };

  if (phase === 'loading') {
    return <View style={styles.center}><Text style={styles.text}>Loading…</Text></View>;
  }

  if (phase === 'empty') {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Nothing to write right now</Text>
        <Text style={styles.sub}>
          Writing practice uses letters from lessons you have passed, once they are due. You can also tap
          "Trace it" on any letter inside a lesson.
        </Text>
        <PressableScale style={styles.dark} deferPress onPress={() => router.replace('/letters')}>
          <Text style={styles.darkText}>Go to Letters</Text>
        </PressableScale>
      </View>
    );
  }

  if (phase === 'done') {
    const passed = memoryTries.filter(Boolean).length;
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Done</Text>
        <Text style={styles.sub}>
          {memoryTries.length === 0
            ? `${queue.length} ${queue.length === 1 ? 'letter' : 'letters'} traced. Try them from memory next time to schedule them.`
            : `${passed} of ${memoryTries.length} written correctly from memory on the first try.`}
        </Text>
        <PressableScale style={styles.dark} deferPress onPress={() => router.dismissTo('/')}>
          <Text style={styles.darkText}>Back to home</Text>
        </PressableScale>
      </View>
    );
  }

  if (!entry || !glyph) return null;

  const showResult = phase === 'result' && result !== null;
  const showGuide = mode === 'trace' || showResult;
  const last = index + 1 >= queue.length;
  const clip = hasStrokeClip(entry.id);

  return (
    // Scrolling is only for the result screen; while writing, a finger moving on the canvas must never scroll the page.
    <ScrollView contentContainerStyle={styles.container} scrollEnabled={showResult}>
      <Text style={styles.count}>
        {queue.length > 1 ? `Letter ${index + 1} of ${queue.length}` : 'Writing practice'}
      </Text>
      <View style={styles.header}>
        <Text style={styles.roman}>{entry.roman}</Text>
        <View style={styles.headerButtons}>
          <PressableScale style={styles.light} onPress={() => play(entry.id)}>
            <Text style={styles.lightText}>Play sound</Text>
          </PressableScale>
          <PressableScale
            style={styles.info}
            accessibilityLabel="How writing practice works"
            onPress={() => setInfoOpen(true)}
          >
            <Text style={styles.lightText}>i</Text>
          </PressableScale>
        </View>
      </View>

      <View style={styles.modes}>
        {(['trace', 'memory'] as Mode[]).map((m) => (
          <PressableScale
            key={m}
            raised={false}
            style={[styles.mode, mode === m && styles.modeOn]}
            onPress={() => switchMode(m)}
            disabled={showResult}
          >
            <Text style={mode === m ? styles.darkText : styles.lightText}>{m === 'trace' ? 'Trace' : 'From memory'}</Text>
          </PressableScale>
        ))}
      </View>

      <View style={styles.canvasWrap}>
        <TraceCanvas
          size={size}
          strokes={showResult ? shown : strokes}
          onChange={setStrokes}
          guidePath={showGuide ? glyph.d : undefined}
          overlay={showResult ? glyph.target.strokes : undefined}
          disabled={showResult}
        />
      </View>

      {showResult ? (
        <View style={styles.resultBox}>
          <Text style={styles.score}>{`${result.score}`}</Text>
          <Text style={styles.sub}>{FEEDBACK[result.feedback]}</Text>
          {mode === 'trace' && result.passed ? (
            <PressableScale style={styles.dark} onPress={() => backToWrite('memory')}>
              <Text style={styles.darkText}>Now try it from memory</Text>
            </PressableScale>
          ) : null}
          <View style={styles.row}>
            <PressableScale style={styles.lightFlex} onPress={() => backToWrite(mode)}>
              <Text style={styles.lightText}>Try again</Text>
            </PressableScale>
            <PressableScale style={styles.darkFlex} onPress={next}>
              <Text style={styles.darkText}>{last ? 'Finish' : 'Next letter'}</Text>
            </PressableScale>
          </View>
        </View>
      ) : (
        <View style={styles.row}>
          <PressableScale
            style={[styles.lightFlex, strokes.length === 0 && styles.disabled]}
            disabled={strokes.length === 0}
            onPress={() => setStrokes([])}
          >
            <Text style={styles.lightText}>Clear</Text>
          </PressableScale>
          <PressableScale
            style={[styles.darkFlex, strokes.length === 0 && styles.disabled]}
            disabled={strokes.length === 0}
            onPress={check}
          >
            <Text style={styles.darkText}>Check</Text>
          </PressableScale>
        </View>
      )}

      {/* From memory the clip would give the answer away, so it waits until after Check. */}
      {mode === 'trace' || showResult ? <StrokeClip letterId={entry.id} /> : null}
      <InfoModal
        visible={infoOpen}
        title="How writing practice works"
        lines={[
          'Trace follows the faint letter. From memory hides it and checks your shape after you finish.',
          'Only From memory is scheduled for review. Tracing is practice.',
          'The faint letter is the printed form. The app does not check stroke order or direction.',
          ...(clip ? ["The clip shows how the letter is written by hand."] : ['There is no handwriting clip for this letter.']),
        ]}
        onClose={() => setInfoOpen(false)}
      />
    </ScrollView>
  );
}

const useStyles = makeStyles((c) => ({
  container: { padding: 20, gap: 12, paddingBottom: 24 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 14 },
  text: { color: c.text },
  title: { fontSize: 22, fontWeight: '700', textAlign: 'center', color: c.text },
  sub: { fontSize: 16, textAlign: 'center', color: c.textMuted },
  count: { textAlign: 'center', fontSize: 14, color: c.textMuted },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerButtons: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  info: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roman: { fontSize: 30, fontWeight: '600', color: c.text },
  modes: { flexDirection: 'row', gap: 8 },
  mode: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
    alignItems: 'center',
  },
  modeOn: { backgroundColor: c.primary, borderColor: c.primary },
  canvasWrap: { alignItems: 'center' },
  row: { flexDirection: 'row', gap: 10 },
  dark: { padding: 14, borderRadius: 10, backgroundColor: c.primary, alignItems: 'center' },
  darkFlex: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: c.primary, alignItems: 'center' },
  darkText: { color: c.onPrimary, fontWeight: '600' },
  light: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
    alignItems: 'center',
  },
  lightFlex: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
    alignItems: 'center',
  },
  lightText: { color: c.text, fontWeight: '600' },
  disabled: { opacity: 0.4 },
  resultBox: { gap: 10, alignItems: 'stretch' },
  score: { fontSize: 44, fontWeight: '700', textAlign: 'center', color: c.text },
}));
