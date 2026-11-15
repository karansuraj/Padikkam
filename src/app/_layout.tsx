import { Stack } from 'expo-router';

export default function Layout() {
  return (
    <Stack screenOptions={{ title: 'Padikkam' }}>
      <Stack.Screen name="index" options={{ title: 'Padikkam' }} />
      <Stack.Screen name="letters" options={{ title: 'Letters' }} />
      <Stack.Screen name="lesson/[id]" options={{ title: 'Lesson' }} />
      <Stack.Screen name="words/index" options={{ title: 'Words' }} />
      <Stack.Screen name="words/[topic]" options={{ title: 'Words' }} />
      <Stack.Screen name="practice" options={{ title: 'Practice' }} />
      <Stack.Screen name="review" options={{ title: 'Review cards' }} />
      <Stack.Screen name="credits" options={{ title: 'Audio credits' }} />
    </Stack>
  );
}
