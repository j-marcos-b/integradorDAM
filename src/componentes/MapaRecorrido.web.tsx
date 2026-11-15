import { StyleSheet, Text, View } from 'react-native';
import type { MapaRecorridoProps } from './MapaRecorrido';
import { tema } from '../tema';

export function MapaRecorrido({ trazado }: MapaRecorridoProps) {
  return (
    <View style={styles.aviso}>
      <Text style={styles.texto}>
        El mapa del recorrido está disponible en la aplicación móvil ({trazado.length} puntos del
        trazado).
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  aviso: {
    backgroundColor: tema.primarioSuave,
    borderRadius: 16,
    marginBottom: 14,
    padding: 14,
  },
  texto: {
    color: tema.primario,
    fontSize: 12,
    lineHeight: 18,
  },
});
