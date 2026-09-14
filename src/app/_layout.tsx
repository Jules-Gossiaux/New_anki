import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { initializeDatabase } from '../infrastructure/database/database';

export default function RootLayout() {
  return (
    <SQLiteProvider databaseName="vocabulary.db" onInit={initializeDatabase}>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }} />
    </SQLiteProvider>
  );
}
