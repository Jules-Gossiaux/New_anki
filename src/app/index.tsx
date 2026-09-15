import { StyleSheet, Text, View } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Vocabulary</Text>
      <Text style={styles.subtitle}>The learning foundation is ready.</Text>
      <Text style={styles.caption}>Phase 0 · Local-first · FSRS planned</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 32, fontWeight: '700' },
  subtitle: { marginTop: 12, fontSize: 17, textAlign: 'center' },
  caption: { marginTop: 24, color: '#667085', textAlign: 'center' },
});
