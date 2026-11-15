import { StyleSheet, Text } from 'react-native';
import { tema } from '../tema';

export function AvisoCache({ actualizadoEn }: { actualizadoEn: string | null }) {
  if (!actualizadoEn) return null;
  return (
    <Text style={styles.texto}>
      Sin conexión · datos guardados {new Date(actualizadoEn).toLocaleString('es-AR')}
    </Text>
  );
}

const styles = StyleSheet.create({
  texto: {
    color: tema.alerta,
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 8,
  },
});
