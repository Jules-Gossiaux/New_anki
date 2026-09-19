import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { UpdateVocabularyCard } from '../../application/updateVocabularyCard';
import {
  CARD_TEMPLATES,
  getCardSides,
  type Card,
  type TemplateSelection,
} from '../../domain/cards';
import type { Note } from '../../domain/notes';
import { normalizeTagName, type Tag } from '../../domain/tags';
import {
  formatCardSchedule,
  getCardDisplayStatus,
  type CardDisplayStatus,
} from '../../domain/cardStatus';
import { CardRepository, type StudyCounts } from '../../infrastructure/repositories/cardRepository';
import { DeckRepository } from '../../infrastructure/repositories/deckRepository';
import { ReviewSettingsRepository } from '../../infrastructure/repositories/reviewSettingsRepository';
import { NoteRepository } from '../../infrastructure/repositories/noteRepository';
import { TagRepository } from '../../infrastructure/repositories/tagRepository';

export default function DeckDetailScreen() {
  const { deckId } = useLocalSearchParams<{ deckId: string }>();
  const db = useSQLiteContext();
  const router = useRouter();
  const cardRepository = useMemo(() => new CardRepository(db), [db]);
  const deckRepository = useMemo(() => new DeckRepository(db), [db]);
  const settingsRepository = useMemo(() => new ReviewSettingsRepository(db), [db]);
  const [deckName, setDeckName] = useState('Deck');
  const [cards, setCards] = useState<Card[]>([]);
  const [cardsRefreshToken, setCardsRefreshToken] = useState(0);
  const [studyCounts, setStudyCounts] = useState<StudyCounts>({
    total: 0,
    new: 0,
    today: 0,
    future: 0,
  });
  const [isModalVisible, setModalVisible] = useState(false);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [example, setExample] = useState('');
  const [extra, setExtra] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState('');
  const [templateSelection, setTemplateSelection] = useState<TemplateSelection>('both');
  const [isLoadingEditDetails, setIsLoadingEditDetails] = useState(false);
  const editRequestId = useRef(0);

  const load = useCallback(async () => {
    if (!deckId) return;
    const deck = await deckRepository.getById(deckId);
    if (!deck) {
      router.back();
      return;
    }
    setDeckName(deck.name);
    setCards(await cardRepository.listByDeck(deckId));
    setCardsRefreshToken((value) => value + 1);
    const globalSettings = await settingsRepository.get();
    const limits = await deckRepository.getEffectiveDailyLimits(deckId, globalSettings);
    setStudyCounts(await cardRepository.getStudyCounts(deckId, new Date(), limits));
  }, [cardRepository, deckRepository, deckId, router, settingsRepository]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const closeModal = () => {
    editRequestId.current += 1;
    setModalVisible(false);
    setEditingCard(null);
    setFront('');
    setBack('');
    setExample('');
    setExtra('');
    setTags([]);
    setTagDraft('');
    setTemplateSelection('both');
    setIsLoadingEditDetails(false);
  };

  const openCreateModal = () => {
    editRequestId.current += 1;
    setEditingCard(null);
    setFront('');
    setBack('');
    setExample('');
    setExtra('');
    setTags([]);
    setTagDraft('');
    setTemplateSelection('both');
    setIsLoadingEditDetails(false);
    setModalVisible(true);
  };

  const openEditModal = (card: Card) => {
    const requestId = editRequestId.current + 1;
    editRequestId.current = requestId;
    setEditingCard(card);
    setFront(card.front);
    setBack(card.back);
    setExample('');
    setExtra('');
    setTags([]);
    setTagDraft('');
    setIsLoadingEditDetails(true);
    setModalVisible(true);

    void Promise.all([
      new NoteRepository(db).getById(card.noteId),
      new TagRepository(db).listByNote(card.noteId),
      cardRepository.listByNote(card.noteId),
    ])
      .then(([note, cardTags, noteCards]) => {
        if (editRequestId.current !== requestId || !note) return;
        setExample(note.example ?? '');
        setExtra(note.extra ?? '');
        setTags(cardTags.map((tag) => tag.name));
        setTemplateSelection(getTemplateSelection(noteCards));
      })
      .catch(() => {
        if (editRequestId.current === requestId) {
          Alert.alert(
            'Chargement impossible',
            'Les détails de la carte n’ont pas pu être chargés.',
          );
        }
      })
      .finally(() => {
        if (editRequestId.current === requestId) setIsLoadingEditDetails(false);
      });
  };

  const addTag = () => {
    const normalized = normalizeTagName(tagDraft);
    if (!normalized || tags.includes(normalized)) return;
    setTags([...tags, normalized]);
    setTagDraft('');
  };

  const createCard = async () => {
    if (!deckId) return;
    try {
      if (editingCard) {
        await new UpdateVocabularyCard(db).execute(
          editingCard.id,
          {
            front,
            back,
            example,
            extra,
            tags,
          },
          templateSelection,
        );
      } else {
        await new CreateVocabularyCard(db).execute(
          deckId,
          { front, back, example, extra, tags },
          templateSelection,
        );
      }
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
          <Pressable style={styles.addButton} onPress={openCreateModal} accessibilityRole="button">
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
                <Pressable style={styles.emptyButton} onPress={openCreateModal}>
                  <Text style={styles.emptyButtonText}>Ajouter une carte</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.cardList}>
                {cards.map((card) => (
                  <VocabularyCard
                    key={card.id}
                    card={card}
                    refreshToken={cardsRefreshToken}
                    onEdit={() => openEditModal(card)}
                    onDelete={() => deleteCard(card)}
                  />
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      </View>

      <Modal visible={isModalVisible} transparent animationType="slide" onRequestClose={closeModal}>
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            style={styles.modalCard}
            contentContainerStyle={styles.modalCardContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalEyebrow}>
                  {editingCard ? 'MODIFIER LA CARTE' : 'NOUVELLE CARTE'}
                </Text>
                <Text style={styles.modalTitle}>
                  {editingCard ? 'Modifier le vocabulaire' : 'Ajouter du vocabulaire'}
                </Text>
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
            <Text style={styles.fieldLabel}>Sens d’étude</Text>
            <View style={styles.templateOptions}>
              {templateOptions.map((option) => (
                <Pressable
                  key={option.value}
                  style={[
                    styles.templateOption,
                    templateSelection === option.value && styles.templateOptionSelected,
                  ]}
                  onPress={() => setTemplateSelection(option.value)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: templateSelection === option.value }}
                >
                  <Text
                    style={[
                      styles.templateOptionText,
                      templateSelection === option.value && styles.templateOptionTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.fieldLabel}>Exemple (facultatif)</Text>
            <TextInput
              placeholder="Ex. perseverance takes practice"
              placeholderTextColor="#98A2B3"
              value={example}
              onChangeText={setExample}
              style={styles.input}
              accessibilityLabel="Exemple de la carte"
            />
            <Text style={styles.fieldLabel}>Informations supplémentaires (facultatif)</Text>
            <TextInput
              placeholder="Notes personnelles"
              placeholderTextColor="#98A2B3"
              value={extra}
              onChangeText={setExtra}
              style={[styles.input, styles.multilineInput]}
              multiline
              accessibilityLabel="Informations supplémentaires de la carte"
            />
            <Text style={styles.fieldLabel}>Tags</Text>
            <View style={styles.tagInputRow}>
              <TextInput
                placeholder="Ex. travail"
                placeholderTextColor="#98A2B3"
                value={tagDraft}
                onChangeText={setTagDraft}
                onSubmitEditing={addTag}
                style={[styles.input, styles.tagInput]}
                accessibilityLabel="Nouveau tag"
              />
              <Pressable style={styles.addTagButton} onPress={addTag} accessibilityRole="button">
                <Text style={styles.addTagButtonText}>Ajouter</Text>
              </Pressable>
            </View>
            <View style={styles.tagList}>
              {tags.map((tag) => (
                <Pressable
                  key={tag}
                  style={styles.tagChip}
                  onPress={() => setTags(tags.filter((current) => current !== tag))}
                  accessibilityLabel={`Retirer le tag ${tag}`}
                >
                  <Text style={styles.tagText}>#{tag} ×</Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              style={[styles.saveButton, isLoadingEditDetails && styles.saveButtonDisabled]}
              onPress={() => void createCard()}
              disabled={isLoadingEditDetails}
            >
              <Text style={styles.saveButtonText}>
                {editingCard ? 'Enregistrer les modifications' : 'Ajouter la carte'}
              </Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const templateOptions: ReadonlyArray<{ value: TemplateSelection; label: string }> = [
  { value: 'both', label: 'Les deux sens' },
  { value: 'forward', label: 'Mot → traduction' },
  { value: 'reverse', label: 'Traduction → mot' },
];

function getTemplateSelection(cards: Card[]): TemplateSelection {
  const hasForward = cards.some((card) => card.templateKey === CARD_TEMPLATES.forward);
  const hasReverse = cards.some((card) => card.templateKey === CARD_TEMPLATES.reverse);
  if (hasForward && hasReverse) return 'both';
  return hasForward ? 'forward' : 'reverse';
}

function VocabularyCard({
  card,
  refreshToken,
  onEdit,
  onDelete,
}: {
  card: Card;
  refreshToken: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const db = useSQLiteContext();
  const [note, setNote] = useState<Note | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const status = getCardDisplayStatus(card, new Date());
  const cardSides = getCardSides(card);

  useEffect(() => {
    let active = true;
    setNote(null);
    setTags([]);
    void Promise.all([
      new NoteRepository(db).getById(card.noteId),
      new TagRepository(db).listByNote(card.noteId),
    ]).then(([loadedNote, loadedTags]) => {
      if (active) {
        setNote(loadedNote);
        setTags(loadedTags);
      }
    });
    return () => {
      active = false;
    };
  }, [card.noteId, db, refreshToken]);

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
      <Text style={[styles.front, stylesByStatus[status].front]}>{cardSides.prompt}</Text>
      <Text style={styles.schedule}>{formatCardSchedule(card, new Date())}</Text>
      <View style={[styles.divider, stylesByStatus[status].divider]} />
      <Text style={styles.back}>{cardSides.answer}</Text>
      {note?.example && <Text style={styles.cardExample}>{note.example}</Text>}
      {note?.extra && <Text style={styles.cardExtra}>{note.extra}</Text>}
      {tags.length > 0 && (
        <View style={styles.cardTags}>
          {tags.map((tag) => (
            <Text key={tag.id} style={styles.cardTag}>
              #{tag.name}
            </Text>
          ))}
        </View>
      )}
      <Pressable style={styles.cardEditAction} onPress={onEdit} accessibilityRole="button">
        <Text style={styles.cardEditText}>Modifier la carte</Text>
      </Pressable>
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
  schedule: { color: '#667085', fontSize: 13, marginTop: 8 },
  cardExample: { color: '#344054', fontSize: 15, fontStyle: 'italic', marginTop: 12 },
  cardExtra: { color: '#667085', fontSize: 14, marginTop: 6 },
  cardTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  cardTag: { color: '#667085', fontSize: 12 },
  cardDeleteAction: { alignSelf: 'flex-start', marginTop: 17 },
  cardEditAction: { alignSelf: 'flex-start', marginTop: 17 },
  cardEditText: { color: '#1674D1', fontSize: 13, fontWeight: '700' },
  cardDeleteText: { color: '#B42318', fontSize: 13, fontWeight: '700' },
  multilineInput: { minHeight: 72, textAlignVertical: 'top' },
  tagInputRow: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  tagInput: { flex: 1 },
  addTagButton: {
    backgroundColor: '#EAF4FF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  addTagButtonText: { color: '#1674D1', fontSize: 13, fontWeight: '800' },
  tagList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  tagChip: {
    backgroundColor: '#F2F4F7',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  tagText: { color: '#344054', fontSize: 12, fontWeight: '700' },
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
    maxHeight: '92%',
    overflow: 'hidden',
    width: '100%',
  },
  modalCardContent: { padding: 24, paddingBottom: 32 },
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
  templateOptions: { gap: 8 },
  templateOption: {
    backgroundColor: '#F8FAFC',
    borderColor: '#D0D5DD',
    borderRadius: 11,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  templateOptionSelected: { backgroundColor: '#EAF4FF', borderColor: '#1687F8' },
  templateOptionText: { color: '#475467', fontSize: 14, fontWeight: '700' },
  templateOptionTextSelected: { color: '#1674D1' },
  saveButton: {
    alignItems: 'center',
    backgroundColor: '#1687F8',
    borderRadius: 13,
    marginTop: 24,
    paddingVertical: 15,
  },
  saveButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  saveButtonDisabled: { opacity: 0.55 },
});
