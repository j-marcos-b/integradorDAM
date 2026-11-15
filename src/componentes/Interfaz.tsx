import type { PropsWithChildren } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Linea } from '../tipos';
import { tema } from '../tema';

export function CintaDeMuestra() {
  return (
    <View style={styles.cinta}>
      <Text style={styles.cintaTexto}>DATOS DE DEMOSTRACIÓN DE LA API</Text>
    </View>
  );
}

export function Cabecera({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <View style={styles.cabecera}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.titulo}>{title}</Text>
      {description ? <Text style={styles.descripcion}>{description}</Text> : null}
    </View>
  );
}

export function TituloSeccion({
  children,
  detalle,
}: PropsWithChildren<{ detalle?: string }>) {
  return (
    <View style={styles.tituloSeccion}>
      <Text style={styles.tituloSeccionTexto}>{children}</Text>
      {detalle ? <Text style={styles.detalle}>{detalle}</Text> : null}
    </View>
  );
}

export function TarjetaLinea({
  linea,
  detalle,
  onPress,
}: {
  linea: Linea;
  detalle: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.tarjetaLinea, pressed && styles.presionada]}
    >
      <View style={[styles.marcaLinea, { backgroundColor: linea.color }]} />
      <View style={styles.textosLinea}>
        <Text style={styles.numeroLinea}>Línea {linea.numero}</Text>
        <Text numberOfLines={1} style={styles.detalleLinea}>
          {detalle}
        </Text>
      </View>
      <Text style={styles.flecha}>›</Text>
    </Pressable>
  );
}

export function MensajeEstado({ children }: PropsWithChildren) {
  return (
    <View style={styles.estado}>
      <Text style={styles.estadoTexto}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cinta: {
    alignSelf: 'flex-start',
    backgroundColor: tema.avisoFondo,
    borderRadius: 999,
    marginBottom: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  cintaTexto: {
    color: tema.avisoTexto,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  cabecera: {
    marginBottom: 24,
  },
  eyebrow: {
    color: tema.primario,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  titulo: {
    color: tema.tinta,
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -1,
    lineHeight: 39,
  },
  descripcion: {
    color: tema.secundaria,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 10,
  },
  tituloSeccion: {
    alignItems: 'baseline',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    marginTop: 10,
  },
  tituloSeccionTexto: {
    color: tema.tinta,
    fontSize: 19,
    fontWeight: '800',
  },
  detalle: {
    color: tema.secundaria,
    fontSize: 12,
  },
  tarjetaLinea: {
    alignItems: 'center',
    backgroundColor: tema.superficie,
    borderColor: tema.borde,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 9,
    minHeight: 76,
    overflow: 'hidden',
    paddingRight: 16,
  },
  presionada: {
    opacity: 0.76,
  },
  marcaLinea: {
    alignSelf: 'stretch',
    marginRight: 15,
    width: 6,
  },
  textosLinea: {
    flex: 1,
    paddingVertical: 13,
  },
  numeroLinea: {
    color: tema.tinta,
    fontSize: 16,
    fontWeight: '800',
  },
  detalleLinea: {
    color: tema.secundaria,
    fontSize: 13,
    marginTop: 4,
  },
  flecha: {
    color: tema.primario,
    fontSize: 25,
    marginLeft: 8,
  },
  estado: {
    backgroundColor: tema.superficie,
    borderColor: tema.borde,
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
  },
  estadoTexto: {
    color: tema.secundaria,
    fontSize: 14,
    lineHeight: 21,
  },
});
