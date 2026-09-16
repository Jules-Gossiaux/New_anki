import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  DEFAULT_REVIEW_SETTINGS,
  type ReviewSettings,
  type ReviewStep,
} from '../domain/reviewSettings';
import { ReviewSettingsRepository } from '../infrastructure/repositories/reviewSettingsRepository';

export default function SettingsScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const repository = useMemo(() => new ReviewSettingsRepository(db), [db]);
  const [settings, setSettings] = useState<ReviewSettings>(DEFAULT_REVIEW_SETTINGS);
  const [isSaving, setSaving] = useState(false);

  useEffect(() => {
    void repository.get().then(setSettings);
  }, [repository]);

  const save = async () => {
    setSaving(true);
    try {
      await repository.save(settings);
      Alert.alert('Réglages enregistrés', 'Les limites seront appliquées à la prochaine session.');
    } catch (error) {
      Alert.alert('Réglages invalides', error instanceof Error ? error.message : 'Erreur inconnue');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} accessibilityLabel="Retour">
            <Text style={styles.back}>‹</Text>
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>RÉVISION</Text>
            <Text style={styles.title}>Réglages</Text>
          </View>
        </View>
        <Text style={styles.intro}>
          Ces limites sont globales à toute l’application et se réinitialisent chaque jour.
        </Text>
        <SettingField
          label="Nouvelles cartes par jour"
          value={settings.newCardsPerDay}
          onChange={(value) => setSettings({ ...settings, newCardsPerDay: value })}
        />
        <SettingField
          label="Cartes à réviser par jour"
          value={settings.reviewsPerDay}
          onChange={(value) => setSettings({ ...settings, reviewsPerDay: value })}
        />
        <Text style={styles.sectionTitle}>Étapes d’apprentissage</Text>
        <Text style={styles.help}>Séparées par des virgules, par exemple 1m, 10m.</Text>
        <TextInput
          style={styles.input}
          value={settings.learningSteps.join(', ')}
          onChangeText={(value) => setSettings({ ...settings, learningSteps: parseSteps(value) })}
          autoCapitalize="none"
          accessibilityLabel="Étapes d’apprentissage"
        />
        <Text style={styles.sectionTitle}>Étapes de réapprentissage</Text>
        <TextInput
          style={styles.input}
          value={settings.relearningSteps.join(', ')}
          onChangeText={(value) => setSettings({ ...settings, relearningSteps: parseSteps(value) })}
          autoCapitalize="none"
          accessibilityLabel="Étapes de réapprentissage"
        />
        <Pressable style={styles.saveButton} onPress={() => void save()} disabled={isSaving}>
          <Text style={styles.saveText}>{isSaving ? 'Enregistrement…' : 'Enregistrer'}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function parseSteps(value: string): ReviewStep[] {
  return value
    .split(',')
    .map((step) => step.trim())
    .filter((step): step is ReviewStep => /^([1-9]\d*)(m|h|d)$/.test(step));
}

function SettingField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        keyboardType="number-pad"
        value={String(value)}
        onChangeText={(text) => onChange(Number(text.replace(/\D/g, '')) || 0)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: '#F7F9FC', flex: 1 },
  container: { padding: 20 },
  header: { alignItems: 'center', flexDirection: 'row', paddingBottom: 22, paddingTop: 10 },
  back: { color: '#344054', fontSize: 36 },
  headerCopy: { paddingLeft: 14 },
  eyebrow: { color: '#667085', fontSize: 11, fontWeight: '800', letterSpacing: 1.6 },
  title: { color: '#101828', fontSize: 30, fontWeight: '800', marginTop: 4 },
  intro: { color: '#667085', fontSize: 15, lineHeight: 22, marginBottom: 22 },
  field: { marginBottom: 18 },
  label: { color: '#344054', fontSize: 15, fontWeight: '700', marginBottom: 8 },
  input: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D0D5DD',
    borderRadius: 12,
    borderWidth: 1,
    color: '#101828',
    fontSize: 16,
    padding: 13,
  },
  sectionTitle: { color: '#14213D', fontSize: 17, fontWeight: '800', marginTop: 12 },
  help: { color: '#667085', fontSize: 13, marginBottom: 8, marginTop: 5 },
  saveButton: {
    alignItems: 'center',
    backgroundColor: '#1687F8',
    borderRadius: 13,
    marginTop: 28,
    padding: 15,
  },
  saveText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
});
