import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { Deck } from '../domain/decks';
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
  const repository = useMemo(() => new DeckRepository(db), [db]);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [isModalVisible, setModalVisible] = useState(false);
  const [editingDeck, setEditingDeck] = useState<Deck | null>(null);
  const [draft, setDraft] = useState<Draft>({ name: '', parentId: null });

  const loadDecks = useCallback(async () => {
    setDecks(await repository.listAll());
  }, [repository]);

  useEffect(() => {
    void loadDecks();
  }, [loadDecks]);

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

  const saveDeck = async () => {
    try {
      if (editingDeck) await repository.update(editingDeck.id, draft);
      else await repository.create(draft);
      setEditingDeck(null);
      setModalVisible(false);
      await loadDecks();
    } catch (error) {
      Alert.alert(
        'Impossible d’enregistrer le deck',
        error instanceof Error ? error.message : 'Erreur inconnue',
      );
    }
  };

  const deleteDeck = (deck: Deck) => {
    Alert.alert('Supprimer le deck ?', deck.name, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            await repository.remove(deck.id);
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
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>VOCABULARY</Text>
          <Text style={styles.title}>Mes decks</Text>
        </View>
        <Button title="Nouveau" onPress={() => openCreate()} />
      </View>

      <FlatList
        data={visibleDecks}
        keyExtractor={(item) => item.id}
        contentContainerStyle={visibleDecks.length === 0 ? styles.emptyContent : styles.listContent}
        renderItem={({ item }) => (
          <View style={[styles.deckRow, { paddingLeft: 18 + item.depth * 24 }]}>
            <Pressable
              style={styles.deckCopy}
              onPress={() => openEdit(item)}
              accessibilityRole="button"
            >
              <Text style={styles.deckName}>{item.name}</Text>
              <Text style={styles.deckMeta}>
                {item.depth === 0 ? 'Deck principal' : 'Sous-deck'}
              </Text>
            </Pressable>
            <View style={styles.deckActions}>
              <Pressable
                accessibilityLabel={`Ajouter un sous-deck à ${item.name}`}
                onPress={() => openCreate(item.id)}
              >
                <Text style={styles.actionText}>+</Text>
              </Pressable>
              <Pressable
                accessibilityLabel={`Supprimer ${item.name}`}
                onPress={() => deleteDeck(item)}
              >
                <Text style={styles.deleteText}>Supprimer</Text>
              </Pressable>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Créez votre premier deck pour commencer.</Text>
        }
      />

      <Modal
        visible={isModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {editingDeck ? 'Modifier le deck' : 'Nouveau deck'}
            </Text>
            <TextInput
              autoFocus
              placeholder="Ex. Anglais professionnel"
              value={draft.name}
              onChangeText={(name) => setDraft((current) => ({ ...current, name }))}
              onSubmitEditing={() => void saveDeck()}
              style={styles.input}
              accessibilityLabel="Nom du deck"
            />
            <Text style={styles.parentLabel}>Parent</Text>
            <View style={styles.parentOptions}>
              <ParentOption
                label="Aucun"
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
            <View style={styles.modalActions}>
              <Button title="Annuler" onPress={() => setModalVisible(false)} />
              <Button title="Enregistrer" onPress={() => void saveDeck()} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
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
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', paddingTop: 64 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  eyebrow: { color: '#64748B', fontSize: 12, fontWeight: '700', letterSpacing: 1.5 },
  title: { color: '#0F172A', fontSize: 32, fontWeight: '700', marginTop: 6 },
  listContent: { padding: 24, gap: 12 },
  emptyContent: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyText: { color: '#64748B', fontSize: 16, textAlign: 'center' },
  deckRow: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 18,
    paddingRight: 18,
    paddingTop: 18,
  },
  deckCopy: { flex: 1 },
  deckName: { color: '#0F172A', fontSize: 17, fontWeight: '600' },
  deckMeta: { color: '#64748B', marginTop: 5 },
  deckActions: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  actionText: { color: '#175CD3', fontSize: 24, fontWeight: '600', paddingHorizontal: 4 },
  deleteText: { color: '#B42318', fontSize: 13, fontWeight: '600', paddingVertical: 8 },
  modalBackdrop: {
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: { backgroundColor: '#FFFFFF', borderRadius: 20, maxHeight: '85%', padding: 24 },
  modalTitle: { color: '#0F172A', fontSize: 22, fontWeight: '700', marginBottom: 16 },
  input: { borderColor: '#CBD5E1', borderRadius: 10, borderWidth: 1, fontSize: 16, padding: 12 },
  parentLabel: {
    color: '#344054',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 18,
    marginBottom: 8,
  },
  parentOptions: { gap: 8 },
  parentOption: { borderColor: '#CBD5E1', borderRadius: 8, borderWidth: 1, padding: 10 },
  parentOptionSelected: { backgroundColor: '#EFF8FF', borderColor: '#175CD3' },
  parentOptionText: { color: '#344054' },
  parentOptionTextSelected: { color: '#175CD3', fontWeight: '600' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 18, gap: 12 },
});
