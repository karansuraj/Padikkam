import { useAudioPlayer } from 'expo-audio';
import { useCallback } from 'react';
import { AUDIO } from '../data/audio';
import { LETTER_BY_ID } from '../data/letters';
import { VOCAB_BY_ID } from '../data/vocab';

/**
 * Play the recorded clip for a letter or a vocabulary word (by entry id). Never throws: a missing or failed clip is
 * logged and ignored so a quiz or lesson screen keeps working without sound.
 */
export function useLetterAudio(): { play: (entryId: string) => void } {
  const player = useAudioPlayer();

  const play = useCallback(
    (entryId: string) => {
      try {
        const audioPath = (LETTER_BY_ID.get(entryId) ?? VOCAB_BY_ID.get(entryId))?.audio;
        const source = audioPath ? AUDIO[audioPath] : undefined;
        if (source === undefined) {
          console.warn(`No audio clip for ${entryId}`);
          return;
        }
        player.replace(source);
        player.play();
      } catch (e) {
        console.warn(`Could not play ${entryId}`, e);
      }
    },
    [player],
  );

  return { play };
}
