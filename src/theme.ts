// Shared colours for buttons and tappable cards. Text on a filled surface always gets an
// explicit colour so it stays readable whatever the system theme is.
export const colors = {
  /** Filled primary button. White text on it. */
  primary: '#3a4bd0',
  onPrimary: '#ffffff',
  /** Plain raised surface, for secondary buttons and quiz options. */
  surface: '#ffffff',
  /** Soft tinted surface, for navigation cards and list rows. */
  tint: '#eef0ff',
  border: '#c4caf2',
  /** Text on surface and tint. */
  text: '#16192e',
  textMuted: '#4a4f6a',
  link: '#2b4fc0',
  /** Review grades. White text on each. */
  again: '#b3261e',
  hard: '#b45309',
  good: '#1f7a3a',
  easy: '#3a4bd0',
} as const;
