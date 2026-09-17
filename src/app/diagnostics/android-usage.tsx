import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import AndroidUsageDiagnostics, { type AndroidUsageEvent } from '../../../modules/android-usage';

const EVENT_WINDOW_MS = 10 * 60 * 1000;

export default function AndroidUsageDiagnosticsScreen() {
  const router = useRouter();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [events, setEvents] = useState<AndroidUsageEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    if (Platform.OS !== 'android' || !AndroidUsageDiagnostics) {
      setError('Ce diagnostic est disponible uniquement sur Android.');
      return;
    }

    try {
      const access = AndroidUsageDiagnostics.hasUsageAccess();
      setHasAccess(access);
      setEvents(access ? AndroidUsageDiagnostics.getRecentEvents(EVENT_WINDOW_MS) : []);
      setError(null);
    } catch (diagnosticError) {
      setError(
        diagnosticError instanceof Error ? diagnosticError.message : 'Diagnostic indisponible.',
      );
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} accessibilityLabel="Retour">
          <Text style={styles.back}>‹</Text>
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>PHASE B · ANDROID</Text>
          <Text style={styles.title}>Diagnostic d’usage</Text>
        </View>
      </View>

      <Text style={styles.intro}>
        Cet écran mesure uniquement les capacités Android. Il ne déclenche aucune révision,
        notification ou modification FSRS.
      </Text>

      <View style={styles.card}>
        <Text style={styles.label}>Accès aux statistiques d’utilisation</Text>
        <Text style={[styles.value, hasAccess ? styles.success : styles.warning]}>
          {hasAccess === null ? 'Lecture…' : hasAccess ? 'Autorisé' : 'Non autorisé'}
        </Text>
        {!hasAccess && (
          <Pressable
            style={styles.primaryButton}
            onPress={() => AndroidUsageDiagnostics?.openUsageAccessSettings()}
            disabled={!AndroidUsageDiagnostics}
          >
            <Text style={styles.primaryButtonText}>Ouvrir les réglages Android</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Événements des 10 dernières minutes</Text>
        <Text style={styles.value}>{events.length}</Text>
        {events.length === 0 ? (
          <Text style={styles.muted}>
            Aucun événement lisible. Autorise l’accès puis reviens sur cet écran.
          </Text>
        ) : (
          events
            .slice()
            .reverse()
            .map((event, index) => (
              <View key={`${event.timestamp}-${event.typeCode}-${index}`} style={styles.event}>
                <Text style={styles.eventType}>{event.type}</Text>
                <Text style={styles.eventDetails}>
                  {new Date(event.timestamp).toLocaleTimeString()} ·{' '}
                  {event.packageName ?? 'système'}
                </Text>
              </View>
            ))
        )}
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable style={styles.secondaryButton} onPress={refresh}>
        <Text style={styles.secondaryButtonText}>Actualiser</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#F7F9FC', flexGrow: 1, padding: 20 },
  header: { alignItems: 'center', flexDirection: 'row', paddingBottom: 22, paddingTop: 10 },
  back: { color: '#344054', fontSize: 36 },
  headerCopy: { paddingLeft: 14 },
  eyebrow: { color: '#667085', fontSize: 11, fontWeight: '800', letterSpacing: 1.6 },
  title: { color: '#101828', fontSize: 27, fontWeight: '800', marginTop: 4 },
  intro: { color: '#667085', fontSize: 15, lineHeight: 22, marginBottom: 18 },
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#EAECF0',
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    padding: 16,
  },
  label: { color: '#344054', fontSize: 15, fontWeight: '700' },
  value: { color: '#101828', fontSize: 24, fontWeight: '800', marginTop: 8 },
  success: { color: '#12B76A' },
  warning: { color: '#F79009' },
  muted: { color: '#667085', fontSize: 14, lineHeight: 20, marginTop: 10 },
  primaryButton: { backgroundColor: '#1687F8', borderRadius: 12, marginTop: 16, padding: 13 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800', textAlign: 'center' },
  event: { borderTopColor: '#EAECF0', borderTopWidth: 1, marginTop: 12, paddingTop: 10 },
  eventType: { color: '#14213D', fontSize: 14, fontWeight: '800' },
  eventDetails: { color: '#667085', fontSize: 12, marginTop: 3 },
  error: { color: '#B42318', fontSize: 14, marginBottom: 16 },
  secondaryButton: {
    alignItems: 'center',
    borderColor: '#B2DDFF',
    borderRadius: 12,
    borderWidth: 1,
    padding: 13,
  },
  secondaryButtonText: { color: '#1570EF', fontSize: 14, fontWeight: '800' },
});
