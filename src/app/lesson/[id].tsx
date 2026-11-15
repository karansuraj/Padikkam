import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { QuizView } from '../../components/QuizView';
import { buildLessonQuiz, scoreQuiz, unlockedLessonIds } from '../../core/lesson';
import { seededRng, type Question } from '../../core/quiz';
import { LESSONS } from '../../data/lessons';
import { LETTER_BY_ID } from '../../data/letters';
import { getPassedLessonIds, markLessonPassed } from '../../data/progress';
import { useGrading } from '../../hooks/useGrading';
import { useLetterAudio } from '../../hooks/useLetterAudio';

type Phase = 'loading' | 'intro' | 'quiz' | 'result';

export default function LessonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const lesson = LESSONS.find((l) => l.id === id);
  const lessonIndex = LESSONS.findIndex((l) => l.id === id);

  const { play } = useLetterAudio();
  const { load, onAnswer } = useGrading();
  const [phase, setPhase] = useState<Phase>('loading');
  const [step, setStep] = useState(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [result, setResult] = useState<{ correct: number; total: number; passed: boolean } | null>(null);
  const [quizRun, setQuizRun] = useState(0); // remounts QuizView on retry

  // Load saved state; a locked or unknown lesson goes back to the list.
  useEffect(() => {
    let cancelled = false;
    // The screen can be reused for another lesson ("Next lesson"), so start clean.
    setPhase('loading');
    setStep(0);
    setResult(null);
    (async () => {
      try {
        const [, passed] = await Promise.all([load(), getPassedLessonIds()]);
        if (cancelled) return;
        if (!lesson || !unlockedLessonIds(LESSONS, passed).has(lesson.id)) {
          router.dismissTo('/letters');
          return;
        }
        setPhase('intro');
      } catch (e) {
        console.warn('Could not load lesson state', e);
        if (!cancelled) router.dismissTo('/letters');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lesson, load]);

  const letter = lesson ? LETTER_BY_ID.get(lesson.letterIds[step]) : undefined;

  // Intro: play each letter's clip when it appears.
  useEffect(() => {
    if (phase === 'intro' && letter) play(letter.id);
  }, [phase, letter, play]);

  const startQuiz = useCallback(() => {
    if (!lesson) return;
    setQuestions(buildLessonQuiz(lesson, LESSONS, LETTER_BY_ID, seededRng(Date.now())));
    setQuizRun((n) => n + 1);
    setPhase('quiz');
  }, [lesson]);

  const onFinish = useCallback(
    async (answers: boolean[]) => {
      const score = scoreQuiz(answers);
      setResult(score);
      setPhase('result');
      if (score.passed && lesson) {
        try {
          await markLessonPassed(lesson.id);
        } catch (e) {
          console.warn('Could not save lesson progress', e);
        }
      }
    },
    [lesson],
  );

  if (phase === 'loading' || !lesson) {
    return <View style={styles.center}><Text>Loading…</Text></View>;
  }

  if (phase === 'intro' && letter) {
    const last = step + 1 >= lesson.letterIds.length;
    return (
      <View style={styles.container}>
        <Text style={styles.count}>{`${lesson.title}: letter ${step + 1} of ${lesson.letterIds.length}`}</Text>
        <View style={styles.card}>
          <Text style={styles.glyph}>{letter.ml}</Text>
          <Text style={styles.roman}>{letter.roman}</Text>
          <Text style={styles.en}>{letter.en}</Text>
          <Pressable style={styles.dark} onPress={() => play(letter.id)}>
            <Text style={styles.darkText}>Play sound</Text>
          </Pressable>
        </View>
        <View style={styles.row}>
          <Pressable
            style={[styles.light, step === 0 && styles.disabled]}
            disabled={step === 0}
            onPress={() => setStep(step - 1)}
          >
            <Text>Back</Text>
          </Pressable>
          <Pressable style={styles.darkFlex} onPress={() => (last ? startQuiz() : setStep(step + 1))}>
            <Text style={styles.darkText}>{last ? 'Start quiz' : 'Next'}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (phase === 'quiz') {
    return <QuizView key={quizRun} questions={questions} onAnswer={onAnswer} onFinish={onFinish} />;
  }

  const nextLesson = LESSONS[lessonIndex + 1];
  return (
    <ScrollView contentContainerStyle={styles.result}>
      <Text style={styles.resultTitle}>{result?.passed ? 'Lesson passed' : 'Not quite yet'}</Text>
      <Text style={styles.resultScore}>{`${result?.correct ?? 0} of ${result?.total ?? 0} correct`}</Text>
      <Text style={styles.en}>
        {result?.passed
          ? 'Letters you missed will come back in Practice.'
          : 'You need 80% to unlock the next lesson. Listen again and retry.'}
      </Text>
      {!result?.passed && (
        <Pressable style={styles.dark} onPress={() => { setStep(0); setPhase('intro'); }}>
          <Text style={styles.darkText}>Review the letters</Text>
        </Pressable>
      )}
      {!result?.passed && (
        <Pressable style={styles.dark} onPress={startQuiz}>
          <Text style={styles.darkText}>Try the quiz again</Text>
        </Pressable>
      )}
      {result?.passed && nextLesson && (
        <Pressable style={styles.dark} onPress={() => router.replace(`/lesson/${nextLesson.id}`)}>
          <Text style={styles.darkText}>{`Next: ${nextLesson.title}`}</Text>
        </Pressable>
      )}
      <Pressable style={styles.light} onPress={() => router.dismissTo('/letters')}>
        <Text>Back to lessons</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, gap: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  count: { textAlign: 'center', fontSize: 14, opacity: 0.6 },
  card: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  glyph: { fontSize: 96 },
  roman: { fontSize: 28 },
  en: { fontSize: 16, opacity: 0.8, textAlign: 'center' },
  row: { flexDirection: 'row', gap: 10 },
  dark: { padding: 14, borderRadius: 10, backgroundColor: '#222', alignItems: 'center' },
  darkFlex: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: '#222', alignItems: 'center' },
  darkText: { color: '#fff', fontWeight: '600' },
  light: { padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#ccc', alignItems: 'center' },
  disabled: { opacity: 0.4 },
  result: { padding: 20, gap: 14, alignItems: 'stretch' },
  resultTitle: { fontSize: 26, fontWeight: '700', textAlign: 'center', marginTop: 24 },
  resultScore: { fontSize: 18, textAlign: 'center' },
});
