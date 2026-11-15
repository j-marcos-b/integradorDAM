import { StyleSheet, Text, View } from 'react-native';
import { tema } from '../tema';

const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000').replace(
  /\/+$/,
  '',
);

export type VideoAvisoProps = { url: string };

export function validarUrlDeVideo(url: string): string | null {
  try {
    const urlValidada = new URL(url);
    if (urlValidada.protocol !== 'http:' && urlValidada.protocol !== 'https:') return null;

    if (['localhost', '127.0.0.1', '[::1]'].includes(urlValidada.hostname)) {
      const base = new URL(API_BASE_URL);
      urlValidada.protocol = base.protocol;
      urlValidada.host = base.host;
    }
    return urlValidada.toString();
  } catch {
    return null;
  }
}

export function MensajeVideoAviso({ children }: { children: string }) {
  return (
    <View style={styles.contenedor}>
      <Text style={styles.mensaje}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    backgroundColor: tema.primarioSuave,
    borderRadius: 14,
    marginTop: 12,
    overflow: 'hidden',
  },
  mensaje: {
    color: tema.primario,
    fontSize: 12,
    lineHeight: 18,
    padding: 12,
  },
});
