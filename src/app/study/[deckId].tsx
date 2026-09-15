import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ReviewCard } from '../../application/reviewCard';
import type { Card, ReviewRating } from '../../domain/cards';
import type { SchedulingPreview } from '../../domain/scheduler';
import { CardRepository } from '../../infrastructure/repositories/cardRepository';
import { DeckRepository } from '../../infrastructure/repositories/deckRepository';
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
  const scheduler = useMemo(() => new FsrsScheduler(), []);
  const [deckName, setDeckName] = useState('Étude');
  const [cards, setCards] = useState<Card[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [isSubmitting, setSubmitting] = useState(false);
  const [nextDueAt, setNextDueAt] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [previews, setPreviews] = useState<SchedulingPreview | null>(null);
  const card = cards[0];

  const load = useCallback(async () => {
    if (!deckId) return;
    const deck = await new DeckRepository(db).getById(deckId);
    if (!deck) {
      router.back();
      return;
    }
    setDeckName(deck.name);
    const dueCards = await cardRepository.listDueForStudy(deckId, new Date());
    setCards(dueCards);
    setPreviews(dueCards[0] ? scheduler.preview(dueCards[0], new Date()) : null);
    setRevealed(false);
  }, [cardRepository, db, deckId, router, scheduler]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!nextDueAt) return undefined;
    const refresh = () => {
      const seconds = Math.max(0, Math.ceil((new Date(nextDueAt).getTime() - Date.now()) / 1000));
      setRemainingSeconds(seconds);
      if (seconds === 0) {
        setNextDueAt(null);
        void load();
      }
    };
    refresh();
    const timer = setInterval(refresh, 1000);
    return () => clearInterval(timer);
  }, [load, nextDueAt]);

  const submitRating = async (rating: ReviewRating) => {
    if (!card || isSubmitting) return;
    setSubmitting(true);
    try {
      const result = await new ReviewCard(db, scheduler).execute(card.id, rating);
      if (result.decision.state === 1 || result.decision.state === 3) {
        setNextDueAt(result.decision.dueAt);
      }
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
            {nextDueAt ? (
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
              <Text style={styles.front}>{card.front}</Text>
              {revealed ? (
                <>
                  <View style={styles.divider} />
                  <Text style={styles.back}>{card.back}</Text>
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
  divider: { backgroundColor: '#D0D5DD', height: 1, marginVertical: 28, width: '65%' },
  back: { color: '#475467', fontSize: 28, fontWeight: '600', textAlign: 'center' },
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
