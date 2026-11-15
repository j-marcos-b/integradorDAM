import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  Cabecera,
  CintaDeMuestra,
  MensajeEstado,
  TituloSeccion,
} from '../../src/componentes/Interfaz';
import { AvisoCache } from '../../src/componentes/AvisoCache';
import { fechaActualizacionCache, mensajeDeError } from '../../src/servicios/api';
import { obtenerParadas } from '../../src/servicios/lineas';
import { tema } from '../../src/tema';
import type { Parada } from '../../src/tipos';

export default function ParadasScreen() {
  const router = useRouter();
  const [paradas, setParadas] = useState<Parada[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actualizadoEn, setActualizadoEn] = useState<string | null>(null);

  useEffect(() => {
    let activa = true;
    obtenerParadas()
      .then((resultado) => {
        if (!activa) return;
        setParadas(resultado);
        setActualizadoEn(fechaActualizacionCache(resultado));
      })
      .catch((cause: unknown) => {
        if (activa) setError(mensajeDeError(cause, 'No pudimos cargar las paradas.'));
      })
      .finally(() => {
        if (activa) setCargando(false);
      });
    return () => {
      activa = false;
    };
  }, []);

  const paradasFiltradas = useMemo(() => {
    const consulta = busqueda.trim().toLocaleLowerCase('es-AR');
    return consulta
      ? paradas.filter((parada) => parada.nombre.toLocaleLowerCase('es-AR').includes(consulta))
      : paradas;
  }, [busqueda, paradas]);

  return (
    <ScrollView contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
      <CintaDeMuestra />
      <Cabecera
        eyebrow="A un toque de distancia"
        title="Paradas"
        description="Buscá una parada y consultá los horarios de las líneas que pasan por ella."
      />
      <View style={styles.acciones}>
        <Pressable onPress={() => router.push('/mapa')} style={styles.accion}>
          <Text style={styles.accionTexto}>Paradas cercanas</Text>
        </Pressable>
        <Pressable onPress={() => router.push('/qr')} style={styles.accion}>
          <Text style={styles.accionTexto}>Escanear QR</Text>
        </Pressable>
      </View>
      <TextInput
        accessibilityLabel="Buscar una parada por nombre o calle"
        onChangeText={(texto) => {
          setBusqueda(texto);
          setCargando(true);
          setError(null);
        }}
        placeholder="Buscar una parada"
        placeholderTextColor="#829095"
        style={styles.busqueda}
        value={busqueda}
      />
      <View style={styles.lista}>
        <TituloSeccion detalle={`${paradasFiltradas.length} resultados`}>Paradas disponibles</TituloSeccion>
        <AvisoCache actualizadoEn={actualizadoEn} />
        {cargando ? <MensajeEstado>Cargando paradas…</MensajeEstado> : null}
        {error ? <MensajeEstado>{error}</MensajeEstado> : null}
        {!cargando && !error && !paradasFiltradas.length ? (
          <MensajeEstado>No encontramos paradas con ese nombre.</MensajeEstado>
        ) : null}
        {!error
          ? paradasFiltradas.map((parada) => (
              <PressableParada
                key={parada.id}
                parada={parada}
                onPress={() =>
                  router.push({ pathname: '/parada/[id]', params: { id: parada.id } })
                }
              />
            ))
          : null}
      </View>
    </ScrollView>
  );
}

function PressableParada({ parada, onPress }: { parada: Parada; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.tarjeta, pressed && styles.presionada]}
    >
      <View style={styles.icono}><Text style={styles.iconoTexto}>P</Text></View>
      <View style={styles.textos}>
        <Text style={styles.nombre}>{parada.nombre}</Text>
        <Text style={styles.detalle}>{parada.refugio ? 'Con refugio' : 'Sin refugio'} · líneas {parada.lineaIds.length}</Text>
      </View>
      <Text style={styles.flecha}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  contenido: {
    backgroundColor: tema.fondo,
    flexGrow: 1,
    paddingBottom: 36,
    paddingHorizontal: 22,
    paddingTop: 22,
  },
  busqueda: {
    backgroundColor: tema.superficie,
    borderColor: tema.borde,
    borderRadius: 16,
    borderWidth: 1,
    color: tema.tinta,
    fontSize: 15,
    minHeight: 54,
    paddingHorizontal: 16,
  },
  acciones: {
    flexDirection: 'row',
    marginBottom: 8,
    marginTop: 13,
  },
  accion: {
    backgroundColor: tema.primarioSuave,
    borderRadius: 999,
    marginRight: 8,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  accionTexto: {
    color: tema.primario,
    fontSize: 11,
    fontWeight: '800',
  },
  lista: {
    marginTop: 18,
  },
  tarjeta: {
    alignItems: 'center',
    backgroundColor: tema.superficie,
    borderColor: tema.borde,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 9,
    minHeight: 76,
    paddingHorizontal: 14,
  },
  presionada: {
    opacity: 0.75,
  },
  icono: {
    alignItems: 'center',
    backgroundColor: tema.primarioSuave,
    borderRadius: 13,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  iconoTexto: {
    color: tema.primario,
    fontSize: 16,
    fontWeight: '900',
  },
  textos: {
    flex: 1,
    marginLeft: 12,
  },
  nombre: {
    color: tema.tinta,
    fontSize: 14,
    fontWeight: '800',
  },
  detalle: {
    color: tema.secundaria,
    fontSize: 12,
    marginTop: 4,
  },
  flecha: {
    color: tema.primario,
    fontSize: 25,
    marginLeft: 8,
  },
});
