import * as SQLite from 'expo-sqlite';
import { DEFAULT_THEME_PREFERENCE, parseThemePreference, type ThemePreference } from '../core/theme';

// Settings live in their own tiny database, opened synchronously, so the saved theme is known
// before the first frame and the app never flashes the wrong scheme. It is a separate file from
// padikkam.db on purpose: that one switches to WAL mode during its async setup, which must not
// race with a connection that stays open here.
let db: SQLite.SQLiteDatabase | null = null;

function open(): SQLite.SQLiteDatabase {
  if (!db) {
    const opened = SQLite.openDatabaseSync('padikkam-settings.db');
    opened.execSync('CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);');
    db = opened;
  }
  return db;
}

const THEME_KEY = 'theme';

/** The saved theme choice. System when nothing is saved, the value is unknown, or storage fails. */
export function loadThemePreference(): ThemePreference {
  try {
    const row = open().getFirstSync<{ value: string }>('SELECT value FROM settings WHERE key = ?', THEME_KEY);
    return parseThemePreference(row?.value);
  } catch (e) {
    console.warn('Could not read the theme setting', e);
    return DEFAULT_THEME_PREFERENCE;
  }
}

export function saveThemePreference(pref: ThemePreference): void {
  try {
    open().runSync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', THEME_KEY, pref);
  } catch (e) {
    console.warn('Could not save the theme setting', e);
  }
}
