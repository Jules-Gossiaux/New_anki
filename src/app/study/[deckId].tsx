import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ReviewCard } from '../../application/reviewCard';
import { CARD_STATES, type Card, type ReviewRating } from '../../domain/cards';
import { FsrsScheduler } from '../../infrastructure/scheduling/fsrsScheduler';
import { CardRepository } from '../../infrastructure/repositories/cardRepository';
import { DeckRepository } from '../../infrastructure/repositories/deckRepository';

const ratings: { label: string; value: ReviewRating; color: string }[] = [
  { label: 'Again', value: 'again', color: '#D92D20' },
  { label: 'Hard', value: 'hard', color: '#F79009' },
  { label: 'Good', value: 'good', color: '#12B76A' },
  { label: 'Easy', value: 'easy', color: '#1687F8' },
];

export default function StudyScreen() {
  const { deckId } = useLocalSearchParams<{ deckId: string }>();
  const db = useSQLiteContext();
  const router = useRouter();
  const cardRepository = useMemo(() => new CardRepository(db), [db]);
  const [deckName, setDeckName] = useState('Étude');
  const [cards, setCards] = useState<Card[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [isSubmitting, setSubmitting] = useState(false);
  const card = cards[0];

  const load = useCallback(async () => {
    if (!deckId) return;
    const deck = await new DeckRepository(db).getById(deckId);
    if (!deck) {
      router.back();
      return;
    }
    setDeckName(deck.name);
    setCards(await cardRepository.listDueForStudy(deckId, new Date()));
    setRevealed(false);
  }, [cardRepository, db, deckId, router]);

  useEffect(() => {
    void load();
  }, [load]);

  const submitRating = async (rating: ReviewRating) => {
    if (!card || isSubmitting) return;
    setSubmitting(true);
    try {
      await new ReviewCard(db, new FsrsScheduler()).execute(card.id, rating);
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
            <Text style={styles.emptyIcon}>✓</Text>
            <Text style={styles.emptyTitle}>Tout est à jour</Text>
            <Text style={styles.emptyText}>Aucune carte nouvelle ou due dans ce deck.</Text>
            <Pressable style={styles.secondaryButton} onPress={() => router.back()}>
              <Text style={styles.secondaryButtonText}>Retour au deck</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.studyArea}>
            <View style={styles.card}>
              <Text style={styles.state}>
                {card.state === CARD_STATES.new ? 'NOUVELLE' : 'À RÉVISER'}
              </Text>
              <Text style={styles.front}>{card.front}</Text>
              {revealed ? (
                <>
                  <View style={styles.divider} />
                  <Text style={styles.back}>{card.back}</Text>
                </>
              ) : (
                <Text style={styles.prompt}>Touchez le bouton pour révéler la réponse</Text>
              )}
            </View>
            {!revealed ? (
              <Pressable style={styles.revealButton} onPress={() => setRevealed(true)}>
                <Text style={styles.revealText}>Révéler la réponse</Text>
              </Pressable>
            ) : (
              <View style={styles.ratingGrid}>
                {ratings.map((item) => (
                  <Pressable
                    key={item.value}
                    style={[styles.ratingButton, { borderColor: item.color }]}
                    onPress={() => void submitRating(item.value)}
                    disabled={isSubmitting}
                  >
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
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#EEF2F6',
    borderRadius: 24,
    borderWidth: 1,
    minHeight: 300,
    padding: 24,
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
  },
  state: { color: '#1674D1', fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  front: { color: '#14213D', fontSize: 34, fontWeight: '800', marginTop: 70, textAlign: 'center' },
  divider: { backgroundColor: '#EEF2F6', height: 1, marginVertical: 28 },
  back: { color: '#475467', fontSize: 25, fontWeight: '600', textAlign: 'center' },
  prompt: { color: '#98A2B3', fontSize: 15, marginTop: 88, textAlign: 'center' },
  revealButton: {
    alignItems: 'center',
    backgroundColor: '#1687F8',
    borderRadius: 14,
    marginTop: 18,
    paddingVertical: 16,
  },
  revealText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  ratingGrid: { flexDirection: 'row', gap: 8, marginTop: 18 },
  ratingButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.5,
    flex: 1,
    paddingVertical: 14,
  },
  ratingText: { fontSize: 14, fontWeight: '800' },
  empty: { alignItems: 'center', flex: 1, justifyContent: 'center', paddingBottom: 80 },
  emptyIcon: { color: '#12B76A', fontSize: 42, marginBottom: 14 },
  emptyTitle: { color: '#14213D', fontSize: 23, fontWeight: '800' },
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
