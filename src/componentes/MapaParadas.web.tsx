import { StyleSheet, Text, View } from 'react-native';
import type { MapaParadasProps } from './MapaParadas';
import { tema } from '../tema';

export function MapaParadas({ paradas }: MapaParadasProps) {
  return (
    <View style={styles.aviso}>
      <Text style={styles.texto}>
        El mapa interactivo está disponible en la aplicación móvil. Se muestran {paradas.length}{' '}
        paradas; desde esta página podés abrir cada una en Google Maps.
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
