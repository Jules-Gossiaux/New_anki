import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { initializeDatabase } from '../infrastructure/database/database';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SQLiteProvider databaseName="vocabulary.db" onInit={initializeDatabase}>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }} />
      </SQLiteProvider>
    </SafeAreaProvider>
  );
}
