import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CreateVocabularyCard } from '../../application/createVocabularyCard';
import type { Card } from '../../domain/cards';
import { getCardDisplayStatus, type CardDisplayStatus } from '../../domain/cardStatus';
import { CardRepository, type StudyCounts } from '../../infrastructure/repositories/cardRepository';
import { DeckRepository } from '../../infrastructure/repositories/deckRepository';

export default function DeckDetailScreen() {
  const { deckId } = useLocalSearchParams<{ deckId: string }>();
  const db = useSQLiteContext();
  const router = useRouter();
  const cardRepository = useMemo(() => new CardRepository(db), [db]);
  const [deckName, setDeckName] = useState('Deck');
  const [cards, setCards] = useState<Card[]>([]);
  const [studyCounts, setStudyCounts] = useState<StudyCounts>({
    total: 0,
    new: 0,
    today: 0,
    future: 0,
  });
  const [isModalVisible, setModalVisible] = useState(false);
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');

  const load = useCallback(async () => {
    if (!deckId) return;
    const deck = await new DeckRepository(db).getById(deckId);
    if (!deck) {
      router.back();
      return;
    }
    setDeckName(deck.name);
    setCards(await cardRepository.listByDeck(deckId));
    setStudyCounts(await cardRepository.getStudyCounts(deckId, new Date()));
  }, [cardRepository, db, deckId, router]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const closeModal = () => {
    setModalVisible(false);
    setFront('');
    setBack('');
  };

  const createCard = async () => {
    if (!deckId) return;
    try {
      await new CreateVocabularyCard(db).execute(deckId, { front, back });
      closeModal();
      await load();
    } catch (error) {
      Alert.alert(
        'Impossible de creer la carte',
        error instanceof Error ? error.message : 'Erreur inconnue',
      );
    }
  };

  const deleteCard = (card: Card) => {
    Alert.alert('Supprimer cette carte ?', card.front, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            await cardRepository.remove(card.id);
            await load();
          } catch (error) {
            Alert.alert(
              'Suppression impossible',
              error instanceof Error ? error.message : 'Erreur inconnue',
            );
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.back()}
            accessibilityLabel="Retour"
          >
            <Text style={styles.backIcon}>‹</Text>
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>DECK</Text>
            <Text style={styles.title} numberOfLines={1}>
              {deckName}
            </Text>
          </View>
          <Pressable
            style={styles.addButton}
            onPress={() => setModalVisible(true)}
            accessibilityRole="button"
          >
            <Text style={styles.addButtonText}>+ Carte</Text>
          </Pressable>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryTitle}>Vos cartes</Text>
          <View style={styles.summaryCounts}>
            <Text style={styles.summaryCount}>{cards.length} total</Text>
            <Text style={styles.dueCount}>
              <Text style={styles.newCount}>{studyCounts.new}</Text>
              <Text style={styles.todayCount}> {studyCounts.today}</Text>
              <Text style={styles.futureCount}> {studyCounts.future}</Text>
            </Text>
          </View>
        </View>

        <View style={styles.content}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {cards.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>＋</Text>
                <Text style={styles.emptyTitle}>Aucune carte pour le moment</Text>
                <Text style={styles.emptyText}>
                  Ajoutez votre premier mot pour commencer votre collection.
                </Text>
                <Pressable style={styles.emptyButton} onPress={() => setModalVisible(true)}>
                  <Text style={styles.emptyButtonText}>Ajouter une carte</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.cardList}>
                {cards.map((card) => (
                  <VocabularyCard key={card.id} card={card} onDelete={() => deleteCard(card)} />
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      </View>

      <Modal visible={isModalVisible} transparent animationType="slide" onRequestClose={closeModal}>
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalEyebrow}>NOUVELLE CARTE</Text>
                <Text style={styles.modalTitle}>Ajouter du vocabulaire</Text>
              </View>
              <Pressable onPress={closeModal} accessibilityLabel="Fermer">
                <Text style={styles.closeText}>×</Text>
              </Pressable>
            </View>
            <Text style={styles.fieldLabel}>Mot ou expression</Text>
            <TextInput
              autoFocus
              placeholder="Ex. perseverance"
              placeholderTextColor="#98A2B3"
              value={front}
              onChangeText={setFront}
              style={styles.input}
              accessibilityLabel="Question de la carte"
            />
            <Text style={styles.fieldLabel}>Traduction</Text>
            <TextInput
              placeholder="Ex. perseverance"
              placeholderTextColor="#98A2B3"
              value={back}
              onChangeText={setBack}
              style={styles.input}
              accessibilityLabel="Reponse de la carte"
            />
            <Pressable style={styles.saveButton} onPress={() => void createCard()}>
              <Text style={styles.saveButtonText}>Ajouter la carte</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function VocabularyCard({ card, onDelete }: { card: Card; onDelete: () => void }) {
  const status = getCardDisplayStatus(card, new Date());

  return (
    <View style={[styles.vocabularyCard, stylesByStatus[status].card]}>
      <View style={styles.cardTopRow}>
        <View style={[styles.cardBadge, stylesByStatus[status].badge]}>
          <Text style={[styles.cardBadgeText, stylesByStatus[status].badgeText]}>
            {statusLabels[status]}
          </Text>
        </View>
        <Pressable onPress={onDelete} accessibilityLabel={`Supprimer ${card.front}`} hitSlop={8}>
          <Text style={styles.deleteIcon}>•••</Text>
        </Pressable>
      </View>
      <Text style={[styles.front, stylesByStatus[status].front]}>{card.front}</Text>
      <View style={[styles.divider, stylesByStatus[status].divider]} />
      <Text style={styles.back}>{card.back}</Text>
      <Pressable style={styles.cardDeleteAction} onPress={onDelete} accessibilityRole="button">
        <Text style={styles.cardDeleteText}>Supprimer la carte</Text>
      </Pressable>
    </View>
  );
}

const statusLabels: Record<CardDisplayStatus, string> = {
  new: 'NOUVELLE',
  today: 'À RÉVISER',
  future: 'À VENIR',
};

const stylesByStatus: Record<
  CardDisplayStatus,
  { card: object; badge: object; badgeText: object; front: object; divider: object }
> = {
  new: {
    card: { backgroundColor: '#F8FBFF', borderColor: '#CFE5FF' },
    badge: { backgroundColor: '#EAF4FF' },
    badgeText: { color: '#1674D1' },
    front: { color: '#14213D' },
    divider: { backgroundColor: '#DDEEFF' },
  },
  today: {
    card: { backgroundColor: '#FFF8F7', borderColor: '#F5C5C0' },
    badge: { backgroundColor: '#FEECEC' },
    badgeText: { color: '#B42318' },
    front: { color: '#14213D' },
    divider: { backgroundColor: '#F9D9D5' },
  },
  future: {
    card: { backgroundColor: '#F5FCF8', borderColor: '#B7E4C7' },
    badge: { backgroundColor: '#E7F7ED' },
    badgeText: { color: '#087443' },
    front: { color: '#14213D' },
    divider: { backgroundColor: '#D4F0DD' },
  },
};

const styles = StyleSheet.create({
  safeArea: { backgroundColor: '#F7F9FC', flex: 1 },
  container: { flex: 1, paddingHorizontal: 20 },
  header: { alignItems: 'center', flexDirection: 'row', paddingBottom: 19, paddingTop: 10 },
  backButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#EEF2F6',
    borderRadius: 12,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  backIcon: { color: '#344054', fontSize: 32, fontWeight: '300', lineHeight: 35, marginLeft: -2 },
  headerCopy: { flex: 1, paddingHorizontal: 13 },
  eyebrow: { color: '#667085', fontSize: 11, fontWeight: '800', letterSpacing: 1.7 },
  title: { color: '#101828', fontSize: 24, fontWeight: '800', letterSpacing: -0.5, marginTop: 4 },
  addButton: {
    backgroundColor: '#1687F8',
    borderRadius: 11,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  addButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  summaryRow: {
    alignItems: 'baseline',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 15,
    paddingTop: 5,
  },
  summaryTitle: { color: '#14213D', fontSize: 19, fontWeight: '800' },
  summaryCount: { color: '#667085', fontSize: 13, fontWeight: '600' },
  summaryCounts: { alignItems: 'flex-end', gap: 3 },
  dueCount: { color: '#D92D20', fontSize: 13, fontWeight: '800' },
  newCount: { color: '#1687F8' },
  todayCount: { color: '#D92D20' },
  futureCount: { color: '#12B76A' },
  content: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: 28 },
  cardList: { gap: 14, paddingBottom: 28 },
  vocabularyCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#EEF2F6',
    borderRadius: 22,
    borderWidth: 1,
    padding: 19,
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 2,
  },
  cardTopRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  cardBadge: {
    backgroundColor: '#EAF4FF',
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  cardBadgeText: { color: '#1674D1', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  deleteIcon: {
    color: '#98A2B3',
    fontSize: 17,
    letterSpacing: 2,
    transform: [{ rotate: '90deg' }],
  },
  front: { color: '#14213D', fontSize: 24, fontWeight: '800', marginTop: 17 },
  divider: { backgroundColor: '#EEF2F6', height: 1, marginVertical: 15 },
  back: { color: '#475467', fontSize: 18, fontWeight: '500' },
  cardDeleteAction: { alignSelf: 'flex-start', marginTop: 17 },
  cardDeleteText: { color: '#B42318', fontSize: 13, fontWeight: '700' },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 120,
  },
  emptyIcon: { color: '#1687F8', fontSize: 38, marginBottom: 14 },
  emptyTitle: { color: '#14213D', fontSize: 20, fontWeight: '800', textAlign: 'center' },
  emptyText: { color: '#667085', fontSize: 15, lineHeight: 22, marginTop: 8, textAlign: 'center' },
  emptyButton: {
    backgroundColor: '#EAF4FF',
    borderRadius: 12,
    marginTop: 22,
    paddingHorizontal: 17,
    paddingVertical: 12,
  },
  emptyButtonText: { color: '#1674D1', fontSize: 14, fontWeight: '800' },
  modalBackdrop: { backgroundColor: 'rgba(16, 24, 40, 0.42)', flex: 1, justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 32,
  },
  modalHandle: {
    alignSelf: 'center',
    backgroundColor: '#D0D5DD',
    borderRadius: 4,
    height: 5,
    marginBottom: 22,
    width: 42,
  },
  modalHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalEyebrow: { color: '#667085', fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  modalTitle: { color: '#101828', fontSize: 24, fontWeight: '800', marginTop: 5 },
  closeText: { color: '#667085', fontSize: 31, fontWeight: '300', lineHeight: 28 },
  fieldLabel: { color: '#344054', fontSize: 13, fontWeight: '800', marginBottom: 8, marginTop: 12 },
  input: {
    backgroundColor: '#F8FAFC',
    borderColor: '#D0D5DD',
    borderRadius: 13,
    borderWidth: 1,
    color: '#101828',
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  saveButton: {
    alignItems: 'center',
    backgroundColor: '#1687F8',
    borderRadius: 13,
    marginTop: 24,
    paddingVertical: 15,
  },
  saveButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
});
