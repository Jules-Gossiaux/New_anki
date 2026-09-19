import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useState } from 'react';
import {
  PermissionsAndroid,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AndroidUsageDiagnostics, { type AndroidUsageEvent } from '../../../modules/android-usage';
import { CardRepository } from '../../infrastructure/repositories/cardRepository';
import { DeckRepository } from '../../infrastructure/repositories/deckRepository';
import { ReviewSettingsRepository } from '../../infrastructure/repositories/reviewSettingsRepository';

const EVENT_WINDOW_MS = 10 * 60 * 1000;

export default function AndroidUsageDiagnosticsScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const deckRepository = useMemo(() => new DeckRepository(db), [db]);
  const cardRepository = useMemo(() => new CardRepository(db), [db]);
  const settingsRepository = useMemo(() => new ReviewSettingsRepository(db), [db]);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [events, setEvents] = useState<AndroidUsageEvent[]>([]);
  const [remindersEnabled, setRemindersEnabled] = useState(false);
  const [reminderCardCount, setReminderCardCount] = useState<number | null>(null);
  const [isConfiguring, setConfiguring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getAvailableCardCount = useCallback(async () => {
    const decks = await deckRepository.listAll();
    const rootDecks = decks.filter((deck) => deck.parentId === null);
    const globalSettings = await settingsRepository.get();
    const counts = await Promise.all(
      rootDecks.map(async (deck) => {
        const limits = await deckRepository.getEffectiveDailyLimits(deck.id, globalSettings);
        return cardRepository.getStudyCounts(deck.id, new Date(), limits);
      }),
    );
    return counts.reduce((total, count) => total + count.new + count.today, 0);
  }, [cardRepository, deckRepository, settingsRepository]);

  const refresh = useCallback(async () => {
    if (Platform.OS !== 'android' || !AndroidUsageDiagnostics) {
      setError('Ce diagnostic est disponible uniquement sur Android.');
      return;
    }

    try {
      const access = AndroidUsageDiagnostics.hasUsageAccess();
      setHasAccess(access);
      setEvents(access ? AndroidUsageDiagnostics.getRecentEvents(EVENT_WINDOW_MS) : []);
      const enabled = AndroidUsageDiagnostics.isReminderEnabled();
      if (enabled) {
        const availableCards = await getAvailableCardCount();
        AndroidUsageDiagnostics.setReminderConfiguration(availableCards > 0, availableCards);
        setRemindersEnabled(availableCards > 0);
        setReminderCardCount(availableCards);
      } else {
        setRemindersEnabled(false);
        setReminderCardCount(null);
      }
      setError(null);
    } catch (diagnosticError) {
      setError(
        diagnosticError instanceof Error ? diagnosticError.message : 'Diagnostic indisponible.',
      );
    }
  }, [getAvailableCardCount]);

  const configureReminders = async () => {
    if (!AndroidUsageDiagnostics || !hasAccess || isConfiguring) return;
    setConfiguring(true);
    try {
      const permission = await PermissionsAndroid.request('android.permission.POST_NOTIFICATIONS');
      if (permission !== PermissionsAndroid.RESULTS.GRANTED) {
        throw new Error('Les notifications Android sont nécessaires pour activer les rappels.');
      }
      const dueCardCount = await getAvailableCardCount();
      AndroidUsageDiagnostics.setReminderConfiguration(dueCardCount > 0, dueCardCount);
      setRemindersEnabled(dueCardCount > 0);
      setReminderCardCount(dueCardCount);
      setError(
        dueCardCount > 0
          ? `Rappels activés pour ${dueCardCount} carte${dueCardCount === 1 ? '' : 's'}.`
          : 'Aucune carte disponible : les rappels restent désactivés.',
      );
    } catch (configurationError) {
      setError(
        configurationError instanceof Error
          ? configurationError.message
          : 'Activation des rappels impossible.',
      );
    } finally {
      setConfiguring(false);
    }
  };

  const disableReminders = () => {
    if (!AndroidUsageDiagnostics) return;
    AndroidUsageDiagnostics.setReminderConfiguration(false, 0);
    setRemindersEnabled(false);
    setReminderCardCount(null);
    setError('Rappels Android désactivés.');
  };

  useFocusEffect(
    useCallback(() => {
      void refresh();
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
        Cet écran mesure les capacités Android. Les rappels restent désactivés par défaut et
        n’ouvrent jamais l’application par-dessus une autre application.
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
        <Text style={styles.label}>Rappels Android expérimentaux</Text>
        <Text style={styles.muted}>
          En mode test, le déverrouillage envoie une notification pour 3 cartes et 10 secondes
          continues dans une autre application envoient une notification pour 5 cartes. Lorsque les
          rappels sont actifs, Android affiche aussi une notification persistante : elle maintient
          le service nécessaire aux tests en arrière-plan. Le comportement cible est de 3 minutes.
          Le compteur est mémorisé au moment de l’activation et doit être réactualisé après une
          session d’étude.
        </Text>
        {remindersEnabled ? (
          <Pressable style={styles.secondaryButton} onPress={disableReminders}>
            <Text style={styles.secondaryButtonText}>Désactiver les rappels</Text>
          </Pressable>
        ) : (
          <Pressable
            style={styles.primaryButton}
            onPress={() => void configureReminders()}
            disabled={isConfiguring || !hasAccess}
          >
            <Text style={styles.primaryButtonText}>
              {isConfiguring ? 'Activation…' : 'Activer les rappels expérimentaux'}
            </Text>
          </Pressable>
        )}
        {reminderCardCount !== null && (
          <Text style={styles.muted}>
            Instantané actif : {reminderCardCount} carte{reminderCardCount === 1 ? '' : 's'}{' '}
            disponible
            {reminderCardCount === 1 ? '' : 's'}.
          </Text>
        )}
        <Pressable
          style={styles.testButton}
          onPress={() => AndroidUsageDiagnostics?.sendTestNotification()}
          disabled={!AndroidUsageDiagnostics}
        >
          <Text style={styles.testButtonText}>Envoyer une notification de test</Text>
        </Pressable>
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
  testButton: { marginTop: 12, padding: 10 },
  testButtonText: { color: '#667085', fontSize: 13, fontWeight: '700', textAlign: 'center' },
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
