import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { tema } from '../src/tema';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Página no encontrada' }} />
      <View style={styles.container}>
        <Text style={styles.title}>No encontramos esta página</Text>
        <Text style={styles.description}>La dirección puede haber cambiado o no estar disponible.</Text>
        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>Volver al inicio</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: tema.fondo,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    color: tema.tinta,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  description: {
    color: tema.secundaria,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 10,
    textAlign: 'center',
  },
  link: {
    backgroundColor: tema.primarioSuave,
    borderRadius: 999,
    marginTop: 20,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  linkText: {
    color: tema.primario,
    fontSize: 14,
    fontWeight: '800',
  },
});
