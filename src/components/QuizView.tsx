import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { AnswerOption } from './AnswerOption';
import { FadeIn } from './FadeIn';
import { PressableScale } from './PressableScale';
import { isCorrect, type Question } from '../core/quiz';
import { LETTER_BY_ID } from '../data/letters';
import { useLetterAudio } from '../hooks/useLetterAudio';
import { makeStyles } from '../theme';
import { Text } from './Text';

interface Props {
  questions: Question[];
  /** Called once per question, the moment the learner picks an option. */
  onAnswer: (q: Question, correct: boolean) => void;
  /** Called after the last question, with one result per question in order. */
  onFinish: (answers: boolean[]) => void;
}

export function QuizView({ questions, onAnswer, onFinish }: Props) {
  const styles = useStyles();
  const { play } = useLetterAudio();
  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState<string | null>(null);
  const [answers, setAnswers] = useState<boolean[]>([]);
  // A ref, not state: a fast double tap must not grade the same question twice.
  const answered = useRef(false);

  const q = questions[index];

  // "Hear it, pick the glyph": play the clip as soon as the question appears.
  useEffect(() => {
    if (q?.kind === 'hear-pick-glyph') play(q.letterId);
  }, [q, play]);

  if (!q) return null;

  const choose = (id: string) => {
    if (answered.current) return;
    answered.current = true;
    const correct = isCorrect(q, id);
    setChosen(id);
    setAnswers((a) => [...a, correct]);
    onAnswer(q, correct);
    // "See it, pick the sound": reveal the sound only after the answer.
    if (q.kind === 'see-pick-sound') play(q.letterId);
  };

  const next = () => {
    if (!answered.current) return;
    if (index + 1 >= questions.length) {
      onFinish(answers);
      return;
    }
    answered.current = false;
    setChosen(null);
    setIndex(index + 1);
  };

  const target = LETTER_BY_ID.get(q.letterId);
  const isLast = index + 1 >= questions.length;

  return (
    <FadeIn key={index} style={styles.container}>
      <Text style={styles.count}>{`Question ${index + 1} of ${questions.length}`}</Text>

      <View style={styles.prompt}>
        {q.kind === 'hear-pick-glyph' ? (
          <>
            <Text style={styles.promptText}>Which letter is this?</Text>
            <PressableScale style={styles.replay} onPress={() => play(q.letterId)}>
              <Text style={styles.replayText}>Play sound</Text>
            </PressableScale>
          </>
        ) : (
          <>
            <Text style={styles.promptText}>What sound is this?</Text>
            <Text style={styles.bigGlyph}>{target?.ml}</Text>
            {chosen !== null && (
              <PressableScale style={styles.replay} onPress={() => play(q.letterId)}>
                <Text style={styles.replayText}>Play sound</Text>
              </PressableScale>
            )}
          </>
        )}
      </View>

      <View style={styles.options}>
        {q.optionIds.map((id) => {
          const entry = LETTER_BY_ID.get(id);
          const isAnswer = id === q.letterId;
          const state =
            chosen === null ? null : isAnswer ? styles.right : id === chosen ? styles.wrong : styles.dim;
          return (
            <AnswerOption
              key={id}
              style={[styles.option, state]}
              feedback={chosen === null}
              reaction={id === chosen ? (isAnswer ? 'pop' : 'shake') : null}
              onPress={() => choose(id)}
            >
              <Text style={q.kind === 'hear-pick-glyph' ? styles.optionGlyph : styles.optionRoman}>
                {q.kind === 'hear-pick-glyph' ? entry?.ml : entry?.roman}
              </Text>
            </AnswerOption>
          );
        })}
      </View>

      {chosen !== null && (
        <PressableScale style={styles.next} onPress={next}>
          <Text style={styles.nextText}>{isLast ? 'Finish' : 'Next'}</Text>
        </PressableScale>
      )}
    </FadeIn>
  );
}

const useStyles = makeStyles((c) => ({
  container: { flex: 1, padding: 20, gap: 16 },
  count: { textAlign: 'center', fontSize: 14, color: c.textMuted },
  prompt: { alignItems: 'center', gap: 12, paddingVertical: 12 },
  promptText: { fontSize: 18 },
  bigGlyph: { fontSize: 88 },
  replay: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 10, backgroundColor: c.primary },
  replayText: { color: c.onPrimary, fontWeight: '600' },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  option: {
    width: '48%',
    minHeight: 72,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  optionGlyph: { fontSize: 36, color: c.text },
  optionRoman: { fontSize: 22, color: c.text },
  right: { backgroundColor: c.correctBg, borderColor: c.correctBorder },
  wrong: { backgroundColor: c.wrongBg, borderColor: c.wrongBorder },
  dim: { opacity: 0.4 },
  next: { padding: 14, borderRadius: 10, backgroundColor: c.primary, alignItems: 'center' },
  nextText: { color: c.onPrimary, fontWeight: '600' },
}));
