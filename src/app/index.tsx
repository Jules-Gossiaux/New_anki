import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Deck } from '../domain/decks';
import { CardRepository, type StudyCounts } from '../infrastructure/repositories/cardRepository';
import { DeckRepository } from '../infrastructure/repositories/deckRepository';

type Draft = { name: string; parentId: string | null };
type VisibleDeck = Deck & { depth: number };

function flattenDecks(decks: Deck[]): VisibleDeck[] {
  const result: VisibleDeck[] = [];
  const visit = (parentId: string | null, depth: number) => {
    for (const deck of decks.filter((candidate) => candidate.parentId === parentId)) {
      result.push({ ...deck, depth });
      visit(deck.id, depth + 1);
    }
  };
  visit(null, 0);
  return result;
}

export default function DecksScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const repository = useMemo(() => new DeckRepository(db), [db]);
  const cardRepository = useMemo(() => new CardRepository(db), [db]);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [studyCounts, setStudyCounts] = useState<Record<string, StudyCounts>>({});
  const [isModalVisible, setModalVisible] = useState(false);
  const [editingDeck, setEditingDeck] = useState<Deck | null>(null);
  const [draft, setDraft] = useState<Draft>({ name: '', parentId: null });

  const loadDecks = useCallback(async () => {
    const nextDecks = await repository.listAll();
    setDecks(nextDecks);
    const counts = await Promise.all(
      nextDecks.map(
        async (deck) =>
          [deck.id, await cardRepository.getStudyCounts(deck.id, new Date())] as const,
      ),
    );
    setStudyCounts(Object.fromEntries(counts));
  }, [cardRepository, repository]);

  useFocusEffect(
    useCallback(() => {
      void loadDecks();
    }, [loadDecks]),
  );

  const visibleDecks = useMemo(() => flattenDecks(decks), [decks]);

  const openCreate = (parentId: string | null = null) => {
    setEditingDeck(null);
    setDraft({ name: '', parentId });
    setModalVisible(true);
  };

  const openEdit = (deck: Deck) => {
    setEditingDeck(deck);
    setDraft({ name: deck.name, parentId: deck.parentId });
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingDeck(null);
  };

  const saveDeck = async () => {
    try {
      if (editingDeck) await repository.update(editingDeck.id, draft);
      else await repository.create(draft);
      closeModal();
      await loadDecks();
    } catch (error) {
      Alert.alert(
        'Impossible d enregistrer le deck',
        error instanceof Error ? error.message : 'Erreur inconnue',
      );
    }
  };

  const deleteDeck = () => {
    if (!editingDeck) return;
    const deck = editingDeck;
    Alert.alert('Supprimer ce deck ?', deck.name, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            await repository.remove(deck.id);
            closeModal();
            await loadDecks();
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
          <View>
            <Text style={styles.eyebrow}>VOCABULARY</Text>
            <Text style={styles.title}>Mes decks</Text>
          </View>
          <Pressable
            style={styles.primaryButton}
            onPress={() => openCreate()}
            accessibilityRole="button"
          >
            <Text style={styles.primaryButtonText}>Nouveau</Text>
          </Pressable>
        </View>

        <FlatList
          data={visibleDecks}
          keyExtractor={(item) => item.id}
          contentContainerStyle={
            visibleDecks.length === 0 ? styles.emptyContent : styles.listContent
          }
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <DeckCard
              deck={item}
              counts={studyCounts[item.id]}
              onOpen={() =>
                router.push({ pathname: '/study/[deckId]', params: { deckId: item.id } })
              }
              onManageCards={() =>
                router.push({ pathname: '/deck/[deckId]', params: { deckId: item.id } })
              }
              onEdit={() => openEdit(item)}
              onAddChild={() => openCreate(item.id)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>✦</Text>
              <Text style={styles.emptyTitle}>Votre espace de revision</Text>
              <Text style={styles.emptyText}>Creez un deck pour commencer a apprendre.</Text>
              <Pressable style={styles.emptyButton} onPress={() => openCreate()}>
                <Text style={styles.emptyButtonText}>Creer mon premier deck</Text>
              </Pressable>
            </View>
          }
        />

        <Pressable
          style={({ pressed }) => [styles.settingsButton, pressed && styles.pressed]}
          onPress={() => router.push('./settings')}
          accessibilityLabel="Ouvrir les reglages"
          accessibilityRole="button"
        >
          <Text style={styles.settingsIcon}>⚙</Text>
        </Pressable>
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
                <Text style={styles.modalEyebrow}>{editingDeck ? 'DECK' : 'NOUVEAU DECK'}</Text>
                <Text style={styles.modalTitle}>
                  {editingDeck ? 'Modifier le deck' : 'Creer un deck'}
                </Text>
              </View>
              <Pressable onPress={closeModal} accessibilityLabel="Fermer">
                <Text style={styles.closeText}>×</Text>
              </Pressable>
            </View>
            <Text style={styles.fieldLabel}>Nom du deck</Text>
            <TextInput
              autoFocus
              placeholder="Ex. Anglais professionnel"
              placeholderTextColor="#98A2B3"
              value={draft.name}
              onChangeText={(name) => setDraft((current) => ({ ...current, name }))}
              onSubmitEditing={() => void saveDeck()}
              style={styles.input}
              accessibilityLabel="Nom du deck"
            />
            <Text style={styles.fieldLabel}>Deck parent</Text>
            <View style={styles.parentOptions}>
              <ParentOption
                label="Aucun parent"
                selected={draft.parentId === null}
                onPress={() => setDraft((current) => ({ ...current, parentId: null }))}
              />
              {decks
                .filter((deck) => deck.id !== editingDeck?.id)
                .map((deck) => (
                  <ParentOption
                    key={deck.id}
                    label={deck.name}
                    selected={draft.parentId === deck.id}
                    onPress={() => setDraft((current) => ({ ...current, parentId: deck.id }))}
                  />
                ))}
            </View>
            <Pressable style={styles.saveButton} onPress={() => void saveDeck()}>
              <Text style={styles.saveButtonText}>
                {editingDeck ? 'Enregistrer' : 'Creer le deck'}
              </Text>
            </Pressable>
            {editingDeck && (
              <Pressable style={styles.deleteButton} onPress={deleteDeck}>
                <Text style={styles.deleteButtonText}>Supprimer ce deck</Text>
              </Pressable>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function DeckCard({
  deck,
  counts,
  onOpen,
  onManageCards,
  onEdit,
  onAddChild,
}: {
  deck: VisibleDeck;
  counts?: StudyCounts;
  onOpen: () => void;
  onManageCards: () => void;
  onEdit: () => void;
  onAddChild: () => void;
}) {
  return (
    <Pressable
      style={[styles.deckCard, { marginLeft: deck.depth * 12 }]}
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={`Étudier ${deck.name}`}
    >
      <View style={styles.deckCardHeader}>
        <Pressable style={styles.deckMainAction} onPress={onOpen} accessibilityRole="button">
          <Text style={styles.deckName} numberOfLines={2}>
            {deck.name}
          </Text>
          <Text style={styles.deckMeta}>{deck.depth === 0 ? 'Deck principal' : 'Sous-deck'}</Text>
          <Text style={styles.deckCounts}>
            <Text style={styles.newCount}>{counts?.new ?? 0}</Text>
            <Text style={styles.todayCount}> {counts?.today ?? 0}</Text>
            <Text style={styles.futureCount}> {counts?.future ?? 0}</Text>
          </Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
          onPress={(event) => {
            event.stopPropagation();
            onEdit();
          }}
          accessibilityLabel={`Modifier ${deck.name}`}
        >
          <Text style={styles.pencilIcon}>✎</Text>
        </Pressable>
      </View>
      <Pressable
        style={styles.addCardsAction}
        onPress={(event) => {
          event.stopPropagation();
          onManageCards();
        }}
        accessibilityRole="button"
      >
        <Text style={styles.addCardsText}>
          {counts && counts.total > 0 ? 'Modifier les cartes du deck' : 'Ajouter des cartes'}
        </Text>
        <Text style={styles.chevron}>›</Text>
      </Pressable>
      {deck.depth === 0 && (
        <Pressable
          style={styles.subdeckAction}
          onPress={(event) => {
            event.stopPropagation();
            onAddChild();
          }}
          accessibilityLabel={`Ajouter un sous-deck a ${deck.name}`}
        >
          <Text style={styles.subdeckText}>+ Sous-deck</Text>
        </Pressable>
      )}
    </Pressable>
  );
}

function ParentOption({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.parentOption, selected && styles.parentOptionSelected]}
    >
      <Text style={selected ? styles.parentOptionTextSelected : styles.parentOptionText}>
        {label}
      </Text>
      {selected && <Text style={styles.checkmark}>✓</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F7F9FC' },
  container: { flex: 1, paddingHorizontal: 20 },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 22,
    paddingTop: 14,
  },
  eyebrow: { color: '#667085', fontSize: 11, fontWeight: '800', letterSpacing: 1.8 },
  title: { color: '#101828', fontSize: 34, fontWeight: '800', letterSpacing: -1, marginTop: 5 },
  primaryButton: {
    backgroundColor: '#1687F8',
    borderRadius: 11,
    elevation: 3,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#1687F8',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  listContent: { gap: 14, paddingBottom: 100, paddingTop: 6 },
  emptyContent: { flexGrow: 1, paddingBottom: 100 },
  deckCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#EEF2F6',
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 17,
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 2,
  },
  deckCardHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  deckMainAction: { flex: 1, paddingRight: 14 },
  deckName: { color: '#14213D', fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  deckMeta: { color: '#667085', fontSize: 13, marginTop: 5 },
  deckCounts: { color: '#12B76A', fontSize: 12, fontWeight: '700', marginTop: 8 },
  newCount: { color: '#1687F8' },
  todayCount: { color: '#D92D20' },
  futureCount: { color: '#12B76A' },
  iconButton: {
    alignItems: 'center',
    backgroundColor: '#F1F7FF',
    borderRadius: 11,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  pencilIcon: { color: '#1687F8', fontSize: 22, fontWeight: '700', marginTop: -3 },
  addCardsAction: {
    alignItems: 'center',
    borderTopColor: '#F0F2F5',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 17,
    paddingTop: 14,
  },
  addCardsText: { color: '#1674D1', fontSize: 15, fontWeight: '700' },
  chevron: { color: '#1687F8', fontSize: 27, fontWeight: '300', lineHeight: 25 },
  subdeckAction: { alignSelf: 'flex-start', marginTop: 10 },
  subdeckText: { color: '#667085', fontSize: 13, fontWeight: '700' },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
    paddingTop: 90,
  },
  emptyIcon: { color: '#1687F8', fontSize: 34, marginBottom: 14 },
  emptyTitle: { color: '#14213D', fontSize: 20, fontWeight: '800' },
  emptyText: { color: '#667085', fontSize: 15, lineHeight: 22, marginTop: 8, textAlign: 'center' },
  emptyButton: {
    backgroundColor: '#EAF4FF',
    borderRadius: 12,
    marginTop: 22,
    paddingHorizontal: 17,
    paddingVertical: 12,
  },
  emptyButtonText: { color: '#1674D1', fontSize: 14, fontWeight: '800' },
  settingsButton: {
    alignItems: 'center',
    backgroundColor: '#1687F8',
    borderColor: '#FFFFFF',
    borderRadius: 30,
    borderWidth: 4,
    bottom: 22,
    elevation: 6,
    height: 58,
    justifyContent: 'center',
    position: 'absolute',
    right: 4,
    shadowColor: '#1687F8',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.28,
    shadowRadius: 9,
    width: 58,
  },
  settingsIcon: { color: '#FFFFFF', fontSize: 26 },
  pressed: { opacity: 0.72 },
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
    marginBottom: 22,
  },
  modalEyebrow: { color: '#667085', fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  modalTitle: { color: '#101828', fontSize: 25, fontWeight: '800', marginTop: 5 },
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
  parentOptions: { gap: 8 },
  parentOption: {
    alignItems: 'center',
    borderColor: '#E4E7EC',
    borderRadius: 11,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  parentOptionSelected: { backgroundColor: '#EFF8FF', borderColor: '#1687F8' },
  parentOptionText: { color: '#475467', fontSize: 14 },
  parentOptionTextSelected: { color: '#1674D1', fontSize: 14, fontWeight: '800' },
  checkmark: { color: '#1687F8', fontSize: 17, fontWeight: '800' },
  saveButton: {
    alignItems: 'center',
    backgroundColor: '#1687F8',
    borderRadius: 13,
    marginTop: 24,
    paddingVertical: 15,
  },
  saveButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  deleteButton: { alignItems: 'center', marginTop: 16, paddingVertical: 8 },
  deleteButtonText: { color: '#D92D20', fontSize: 14, fontWeight: '700' },
});
