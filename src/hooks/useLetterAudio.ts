import { useAudioPlayer } from 'expo-audio';
import { useCallback } from 'react';
import { AUDIO } from '../data/audio';
import { LETTER_BY_ID } from '../data/letters';

/**
 * Play a letter's recorded clip. Never throws: a missing or failed clip is
 * logged and ignored so a quiz or lesson screen keeps working without sound.
 */
export function useLetterAudio(): { play: (letterId: string) => void } {
  const player = useAudioPlayer();

  const play = useCallback(
    (letterId: string) => {
      try {
        const audioPath = LETTER_BY_ID.get(letterId)?.audio;
        const source = audioPath ? AUDIO[audioPath] : undefined;
        if (source === undefined) {
          console.warn(`No audio clip for ${letterId}`);
          return;
        }
        player.replace(source);
        player.play();
      } catch (e) {
        console.warn(`Could not play ${letterId}`, e);
      }
    },
    [player],
  );

  return { play };
}
