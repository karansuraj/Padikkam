import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { FadeIn } from '../components/FadeIn';
import { PressableScale } from '../components/PressableScale';
import { colors } from '../theme';
import { QuizView } from '../components/QuizView';
import { buildPracticeQuiz, scoreQuiz } from '../core/lesson';
import { seededRng, type Question } from '../core/quiz';
import { isDue } from '../core/srs';
import { LESSONS } from '../data/lessons';
import { LETTERS, LETTER_BY_ID } from '../data/letters';
import { getPassedLessonIds } from '../data/progress';
import { useGrading } from '../hooks/useGrading';

type Phase = 'loading' | 'empty' | 'quiz' | 'result';

export default function Practice() {
  const { load, onAnswer } = useGrading();
  const [phase, setPhase] = useState<Phase>('loading');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [run, setRun] = useState(0); // remounts QuizView for each session
  const [score, setScore] = useState<{ correct: number; total: number } | null>(null);

  const start = useCallback(async () => {
    setPhase('loading');
    try {
      const [states, passed] = await Promise.all([load(), getPassedLessonIds()]);
      const now = new Date();
      const dueIds = LETTERS.filter((l) => {
        const s = states.get(l.id);
        return s !== undefined && isDue(s, now);
      }).map((l) => l.id);
      const qs = buildPracticeQuiz(dueIds, LESSONS, passed, LETTER_BY_ID, seededRng(Date.now()));
      if (qs.length === 0) {
        setPhase('empty');
      } else {
        setQuestions(qs);
        setRun((n) => n + 1);
        setPhase('quiz');
      }
    } catch (e) {
      console.warn('Could not start practice', e);
      setPhase('empty');
    }
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      start();
    }, [start]),
  );

  if (phase === 'loading') {
    return <View style={styles.center}><Text>Loading…</Text></View>;
  }

  if (phase === 'empty') {
    return (
      <FadeIn style={styles.center}>
        <Text style={styles.title}>Nothing to practise right now</Text>
        <Text style={styles.sub}>
          Practice covers letters from lessons you have passed, once they are due again.
        </Text>
        <PressableScale style={styles.dark} deferPress onPress={() => router.replace('/letters')}>
          <Text style={styles.darkText}>Go to Letters</Text>
        </PressableScale>
      </FadeIn>
    );
  }

  if (phase === 'quiz') {
    return (
      <QuizView
        key={run}
        questions={questions}
        onAnswer={onAnswer}
        onFinish={(answers) => {
          const { correct, total } = scoreQuiz(answers);
          setScore({ correct, total });
          setPhase('result');
        }}
      />
    );
  }

  return (
    <FadeIn style={styles.center}>
      <Text style={styles.title}>Practice done</Text>
      <Text style={styles.sub}>{`${score?.correct ?? 0} of ${score?.total ?? 0} correct`}</Text>
      <PressableScale style={styles.dark} onPress={start}>
        <Text style={styles.darkText}>Practise again</Text>
      </PressableScale>
      <PressableScale style={styles.light} deferPress onPress={() => router.dismissTo('/')}>
        <Text style={styles.lightText}>Home</Text>
      </PressableScale>
    </FadeIn>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 14 },
  title: { fontSize: 22, fontWeight: '700', textAlign: 'center' },
  sub: { fontSize: 16, opacity: 0.7, textAlign: 'center' },
  dark: { padding: 14, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center', alignSelf: 'stretch' },
  darkText: { color: colors.onPrimary, fontWeight: '600' },
  light: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  lightText: { color: colors.text, fontWeight: '600' },
});
