import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, FlatList, Modal, StyleSheet, Text, TextInput, View } from 'react-native';
import { CreateVocabularyCard } from '../../application/createVocabularyCard';
import type { Card } from '../../domain/cards';
import { CardRepository } from '../../infrastructure/repositories/cardRepository';
import { DeckRepository } from '../../infrastructure/repositories/deckRepository';

export default function DeckDetailScreen() {
  const { deckId } = useLocalSearchParams<{ deckId: string }>();
  const db = useSQLiteContext();
  const router = useRouter();
  const [deckName, setDeckName] = useState('Deck');
  const [cards, setCards] = useState<Card[]>([]);
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
    setCards(await new CardRepository(db).listByDeck(deckId));
  }, [db, deckId, router]);

  useEffect(() => {
    void load();
  }, [load]);

  const createCard = async () => {
    if (!deckId) return;
    try {
      await new CreateVocabularyCard(db).execute(deckId, { front, back });
      setFront('');
      setBack('');
      setModalVisible(false);
      await load();
    } catch (error) {
      Alert.alert(
        'Impossible de créer la carte',
        error instanceof Error ? error.message : 'Erreur inconnue',
      );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Button title="Retour" onPress={() => router.back()} />
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>DECK</Text>
          <Text style={styles.title}>{deckName}</Text>
        </View>
        <Button title="Ajouter" onPress={() => setModalVisible(true)} />
      </View>
      <FlatList
        data={cards}
        keyExtractor={(item) => item.id}
        contentContainerStyle={cards.length === 0 ? styles.emptyContent : styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.cardRow}>
            <View style={styles.cardCopy}>
              <Text style={styles.front}>{item.front}</Text>
              <Text style={styles.back}>{item.back}</Text>
            </View>
            <Text style={styles.state}>Nouvelle</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>Aucune carte dans ce deck.</Text>}
      />
      <Modal
        visible={isModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Nouvelle carte</Text>
            <TextInput
              autoFocus
              placeholder="Mot ou expression"
              value={front}
              onChangeText={setFront}
              style={styles.input}
              accessibilityLabel="Question de la carte"
            />
            <TextInput
              placeholder="Traduction"
              value={back}
              onChangeText={setBack}
              style={[styles.input, styles.secondInput]}
              accessibilityLabel="Réponse de la carte"
            />
            <View style={styles.modalActions}>
              <Button title="Annuler" onPress={() => setModalVisible(false)} />
              <Button title="Créer" onPress={() => void createCard()} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', paddingTop: 56 },
  header: { alignItems: 'center', flexDirection: 'row', paddingHorizontal: 16 },
  headerCopy: { flex: 1, paddingHorizontal: 12 },
  eyebrow: { color: '#64748B', fontSize: 12, fontWeight: '700', letterSpacing: 1.5 },
  title: { color: '#0F172A', fontSize: 24, fontWeight: '700', marginTop: 4 },
  listContent: { gap: 12, padding: 24 },
  emptyContent: { alignItems: 'center', flexGrow: 1, justifyContent: 'center', padding: 24 },
  emptyText: { color: '#64748B', fontSize: 16, textAlign: 'center' },
  cardRow: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 18,
  },
  cardCopy: { flex: 1 },
  front: { color: '#0F172A', fontSize: 17, fontWeight: '600' },
  back: { color: '#475467', fontSize: 15, marginTop: 6 },
  state: { color: '#64748B', fontSize: 12 },
  modalBackdrop: {
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 24 },
  modalTitle: { color: '#0F172A', fontSize: 22, fontWeight: '700', marginBottom: 16 },
  input: { borderColor: '#CBD5E1', borderRadius: 10, borderWidth: 1, fontSize: 16, padding: 12 },
  secondInput: { marginTop: 12 },
  modalActions: { flexDirection: 'row', gap: 12, justifyContent: 'flex-end', marginTop: 18 },
});
