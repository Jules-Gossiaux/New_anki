import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ReviewCard } from '../../application/reviewCard';
import { applyDailyLimits, selectNextStudyCard } from '../../application/studyQueue';
import type { Card, ReviewRating } from '../../domain/cards';
import type { Note } from '../../domain/notes';
import { DEFAULT_REVIEW_SETTINGS, type ReviewSettings } from '../../domain/reviewSettings';
import type { SchedulingPreview } from '../../domain/scheduler';
import { CardRepository } from '../../infrastructure/repositories/cardRepository';
import { DeckRepository } from '../../infrastructure/repositories/deckRepository';
import { ReviewSettingsRepository } from '../../infrastructure/repositories/reviewSettingsRepository';
import { NoteRepository } from '../../infrastructure/repositories/noteRepository';
import { FsrsScheduler } from '../../infrastructure/scheduling/fsrsScheduler';

const ratings: { label: string; value: ReviewRating; color: string }[] = [
  { label: 'Again', value: 'again', color: '#D92D20' },
  { label: 'Hard', value: 'hard', color: '#F79009' },
  { label: 'Good', value: 'good', color: '#12B76A' },
  { label: 'Easy', value: 'easy', color: '#1687F8' },
];

function formatDue(iso: string, now = new Date()): string {
  const minutes = Math.max(1, Math.ceil((new Date(iso).getTime() - now.getTime()) / 60000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.ceil(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.ceil(hours / 24)}j`;
}

export default function StudyScreen() {
  const { deckId } = useLocalSearchParams<{ deckId: string }>();
  const db = useSQLiteContext();
  const router = useRouter();
  const cardRepository = useMemo(() => new CardRepository(db), [db]);
  const settingsRepository = useMemo(() => new ReviewSettingsRepository(db), [db]);
  const [settings, setSettings] = useState<ReviewSettings>(DEFAULT_REVIEW_SETTINGS);
  const scheduler = useMemo(() => new FsrsScheduler(settings), [settings]);
  const [deckName, setDeckName] = useState('Étude');
  const [cards, setCards] = useState<Card[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [isSubmitting, setSubmitting] = useState(false);
  const [isDailyLimitReached, setDailyLimitReached] = useState(false);
  const [clock, setClock] = useState(() => Date.now());
  const [previews, setPreviews] = useState<SchedulingPreview | null>(null);
  const [noteDetails, setNoteDetails] = useState<Note | null>(null);
  const now = new Date(clock);
  const selection = selectNextStudyCard(cards, now);
  const card = selection.card;
  const nextFutureCard = selection.isEarly ? card : undefined;
  const remainingSeconds = 0;

  const load = useCallback(async () => {
    if (!deckId) return;
    const deck = await new DeckRepository(db).getById(deckId);
    if (!deck) {
      router.back();
      return;
    }
    setDeckName(deck.name);
    const currentSettings = await settingsRepository.get();
    const currentNow = new Date();
    const [queue, progress] = await Promise.all([
      cardRepository.listStudyQueue(deckId, currentNow),
      cardRepository.getDailyStudyProgress(currentNow),
    ]);
    const limitedQueue = applyDailyLimits(queue, currentSettings, progress);
    setSettings(currentSettings);
    setCards(limitedQueue);
    setDailyLimitReached(queue.length > 0 && limitedQueue.length === 0);
    setRevealed(false);
  }, [cardRepository, db, deckId, router, settingsRepository]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setPreviews(card ? scheduler.preview(card, now) : null);
  }, [card?.id, now.getTime(), scheduler]);

  useEffect(() => {
    let active = true;
    if (!card) {
      setNoteDetails(null);
      return () => {
        active = false;
      };
    }
    void new NoteRepository(db).getById(card.noteId).then((note) => {
      if (active) setNoteDetails(note);
    });
    return () => {
      active = false;
    };
  }, [card?.id, card?.noteId, db]);

  const submitRating = async (rating: ReviewRating) => {
    if (!card || isSubmitting) return;
    setSubmitting(true);
    try {
      await new ReviewCard(db, scheduler).execute(card.id, rating);
      await load();
    } catch (error) {
      Alert.alert(
        'Impossible d’enregistrer la révision',
        error instanceof Error ? error.message : 'Erreur inconnue',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} accessibilityLabel="Retour">
            <Text style={styles.headerBack}>‹</Text>
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>ÉTUDE</Text>
            <Text style={styles.title}>{deckName}</Text>
          </View>
          <Text style={styles.counter}>
            {cards.length} restante{cards.length === 1 ? '' : 's'}
          </Text>
        </View>

        {!card ? (
          <View style={styles.empty}>
            {isDailyLimitReached ? (
              <>
                <Text style={styles.emptyIcon}>✓</Text>
                <Text style={styles.emptyTitle}>Limite quotidienne atteinte</Text>
                <Text style={styles.emptyText}>
                  Les cartes restantes seront disponibles demain selon tes réglages.
                </Text>
                <Pressable style={styles.secondaryButton} onPress={() => router.back()}>
                  <Text style={styles.secondaryButtonText}>Retour au deck</Text>
                </Pressable>
              </>
            ) : nextFutureCard ? (
              <>
                <Text style={styles.emptyTitle}>Prochaine carte dans {remainingSeconds}s</Text>
                <Text style={styles.emptyText}>
                  Elle reviendra automatiquement dans la session.
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.emptyIcon}>✓</Text>
                <Text style={styles.emptyTitle}>Tout est à jour</Text>
                <Text style={styles.emptyText}>Aucune carte nouvelle ou due dans ce deck.</Text>
                <Pressable style={styles.secondaryButton} onPress={() => router.back()}>
                  <Text style={styles.secondaryButtonText}>Retour au deck</Text>
                </Pressable>
              </>
            )}
          </View>
        ) : (
          <View style={styles.studyArea}>
            <Pressable style={styles.card} onPress={() => setRevealed((value) => !value)}>
              {selection.isEarly && <Text style={styles.earlyLabel}>PRÉVUE AUJOURD’HUI</Text>}
              <Text style={styles.front}>{card.front}</Text>
              {revealed ? (
                <>
                  <View style={styles.divider} />
                  <Text style={styles.back}>{card.back}</Text>
                  {noteDetails?.example && (
                    <Text style={styles.example}>{noteDetails.example}</Text>
                  )}
                  {noteDetails?.extra && <Text style={styles.extra}>{noteDetails.extra}</Text>}
                </>
              ) : (
                <Text style={styles.prompt}>Touchez l’écran pour révéler la réponse</Text>
              )}
            </Pressable>
            {revealed && (
              <View style={styles.ratingGrid}>
                {ratings.map((item) => (
                  <Pressable
                    key={item.value}
                    style={[styles.ratingButton, { borderColor: item.color }]}
                    onPress={() => void submitRating(item.value)}
                    disabled={isSubmitting}
                  >
                    <Text style={[styles.ratingDue, { color: item.color }]}>
                      {previews ? formatDue(previews[item.value].dueAt) : ''}
                    </Text>
                    <Text style={[styles.ratingText, { color: item.color }]}>{item.label}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F7F9FC' },
  container: { flex: 1, paddingHorizontal: 20 },
  header: { alignItems: 'center', flexDirection: 'row', paddingBottom: 24, paddingTop: 10 },
  headerBack: { color: '#344054', fontSize: 36, lineHeight: 38 },
  headerCopy: { flex: 1, paddingHorizontal: 14 },
  eyebrow: { color: '#667085', fontSize: 11, fontWeight: '800', letterSpacing: 1.6 },
  title: { color: '#101828', fontSize: 24, fontWeight: '800', marginTop: 4 },
  counter: { color: '#667085', fontSize: 13, fontWeight: '700' },
  studyArea: { flex: 1, justifyContent: 'center', paddingBottom: 40 },
  card: { alignItems: 'center', flex: 1, justifyContent: 'center', paddingHorizontal: 20 },
  front: { color: '#14213D', fontSize: 42, fontWeight: '800', textAlign: 'center' },
  earlyLabel: {
    color: '#D92D20',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginBottom: 24,
  },
  divider: { backgroundColor: '#D0D5DD', height: 1, marginVertical: 28, width: '65%' },
  back: { color: '#475467', fontSize: 28, fontWeight: '600', textAlign: 'center' },
  example: {
    color: '#344054',
    fontSize: 18,
    fontStyle: 'italic',
    marginTop: 22,
    textAlign: 'center',
  },
  extra: { color: '#667085', fontSize: 15, marginTop: 12, textAlign: 'center' },
  prompt: { color: '#98A2B3', fontSize: 15, marginTop: 92, textAlign: 'center' },
  ratingGrid: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  ratingButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.5,
    flex: 1,
    paddingVertical: 14,
  },
  ratingText: { fontSize: 14, fontWeight: '800' },
  ratingDue: { fontSize: 13, marginBottom: 4 },
  empty: { alignItems: 'center', flex: 1, justifyContent: 'center', paddingBottom: 80 },
  emptyIcon: { color: '#12B76A', fontSize: 42, marginBottom: 14 },
  emptyTitle: { color: '#14213D', fontSize: 23, fontWeight: '800', textAlign: 'center' },
  emptyText: { color: '#667085', fontSize: 15, marginTop: 8, textAlign: 'center' },
  secondaryButton: {
    backgroundColor: '#EAF4FF',
    borderRadius: 12,
    marginTop: 22,
    paddingHorizontal: 17,
    paddingVertical: 12,
  },
  secondaryButtonText: { color: '#1674D1', fontSize: 14, fontWeight: '800' },
});
