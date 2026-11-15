import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useTheme } from '../theme';

function ThemedStack() {
  const { colors, isDark } = useTheme();
  const barStyle = isDark ? 'light' : 'dark';
  return (
    <>
      <StatusBar style={barStyle} />
      <Stack
        screenOptions={{
          title: 'Padikkam',
          statusBarStyle: barStyle,
          headerStyle: { backgroundColor: colors.header },
          headerTintColor: colors.text,
          headerTitleStyle: { color: colors.text },
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Padikkam' }} />
        <Stack.Screen name="letters" options={{ title: 'Letters' }} />
        <Stack.Screen name="lesson/[id]" options={{ title: 'Lesson' }} />
        <Stack.Screen name="words/index" options={{ title: 'Words' }} />
        <Stack.Screen name="words/[topic]" options={{ title: 'Words' }} />
        <Stack.Screen name="practice" options={{ title: 'Practice' }} />
        <Stack.Screen name="write" options={{ title: 'Writing practice' }} />
        <Stack.Screen name="review" options={{ title: 'Review cards' }} />
        <Stack.Screen name="credits" options={{ title: 'Credits' }} />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
      </Stack>
    </>
  );
}

export default function Layout() {
  return (
    <ThemeProvider>
      <ThemedStack />
    </ThemeProvider>
  );
}
