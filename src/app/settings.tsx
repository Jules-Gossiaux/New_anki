import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useMemo, useRef, useState } from 'react';
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
  const [learningStepsText, setLearningStepsText] = useState(
    DEFAULT_REVIEW_SETTINGS.learningSteps.join(', '),
  );
  const [relearningStepsText, setRelearningStepsText] = useState(
    DEFAULT_REVIEW_SETTINGS.relearningSteps.join(', '),
  );
  const [isSaving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    void repository.get().then((loaded) => {
      setSettings(loaded);
      setLearningStepsText(loaded.learningSteps.join(', '));
      setRelearningStepsText(loaded.relearningSteps.join(', '));
    });
  }, [repository]);

  useEffect(() => {
    return () => {
      if (toastTimeout.current) clearTimeout(toastTimeout.current);
    };
  }, []);

  const showToast = (message: string) => {
    setToastMessage(message);
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    toastTimeout.current = setTimeout(() => setToastMessage(null), 2500);
  };

  const save = async () => {
    setSaving(true);
    try {
      await repository.save({
        ...settings,
        learningSteps: parseSteps(learningStepsText),
        relearningSteps: parseSteps(relearningStepsText),
      });
      showToast('Réglages enregistrés');
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
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Étapes d’apprentissage</Text>
          <InfoButton
            title="Étapes d’apprentissage"
            message="Après la première réponse, une nouvelle carte revient selon ces délais. Par exemple, 1m puis 10m signifie qu’elle revient après 1 minute, puis après 10 minutes."
          />
        </View>
        <Text style={styles.help}>Séparées par des virgules, par exemple 1m, 10m.</Text>
        <TextInput
          style={styles.input}
          value={learningStepsText}
          onChangeText={setLearningStepsText}
          autoCapitalize="none"
          accessibilityLabel="Étapes d’apprentissage"
        />
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Étapes de réapprentissage</Text>
          <InfoButton
            title="Étapes de réapprentissage"
            message="Après l’oubli d’une carte déjà connue, ces délais déterminent quand elle revient. Par défaut, elle revient après 10 minutes avant de reprendre sa programmation."
          />
        </View>
        <TextInput
          style={styles.input}
          value={relearningStepsText}
          onChangeText={setRelearningStepsText}
          autoCapitalize="none"
          accessibilityLabel="Étapes de réapprentissage"
        />
        <Pressable style={styles.saveButton} onPress={() => void save()} disabled={isSaving}>
          <Text style={styles.saveText}>{isSaving ? 'Enregistrement…' : 'Enregistrer'}</Text>
        </Pressable>
      </ScrollView>
      {toastMessage && (
        <View pointerEvents="none" style={styles.toast}>
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

function parseSteps(value: string): ReviewStep[] {
  const steps = value
    .split(',')
    .map((step) => step.trim())
    .filter(Boolean);
  if (steps.some((step) => !/^([1-9]\d*)(m|h|d)$/.test(step))) {
    throw new Error('Les étapes doivent être au format 1m, 1h ou 1d.');
  }
  return steps as ReviewStep[];
}

function InfoButton({ title, message }: { title: string; message: string }) {
  return (
    <Pressable
      onPress={() => Alert.alert(title, message)}
      accessibilityLabel={`Informations sur ${title}`}
      accessibilityRole="button"
      hitSlop={8}
    >
      <Text style={styles.infoIcon}>ⓘ</Text>
    </Pressable>
  );
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
  sectionHeader: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  sectionTitle: { color: '#14213D', fontSize: 17, fontWeight: '800', marginTop: 12 },
  infoIcon: { color: '#667085', fontSize: 19 },
  help: { color: '#667085', fontSize: 13, marginBottom: 8, marginTop: 5 },
  saveButton: {
    alignItems: 'center',
    backgroundColor: '#1687F8',
    borderRadius: 13,
    marginTop: 28,
    padding: 15,
  },
  saveText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  toast: {
    alignSelf: 'center',
    backgroundColor: '#344054',
    borderRadius: 22,
    bottom: 28,
    paddingHorizontal: 20,
    paddingVertical: 12,
    position: 'absolute',
  },
  toastText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});
