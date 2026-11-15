import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import {
  Cabecera,
  CintaDeMuestra,
  MensajeEstado,
  TarjetaLinea,
} from '../../src/componentes/Interfaz';
import { AvisoCache } from '../../src/componentes/AvisoCache';
import { fechaActualizacionCache, mensajeDeError } from '../../src/servicios/api';
import { obtenerLineas } from '../../src/servicios/lineas';
import { tema } from '../../src/tema';
import type { Linea } from '../../src/tipos';

export default function LineasScreen() {
  const router = useRouter();
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actualizadoEn, setActualizadoEn] = useState<string | null>(null);

  useEffect(() => {
    let activa = true;
    obtenerLineas()
      .then((resultado) => {
        if (activa) {
          setLineas(resultado);
          setActualizadoEn(fechaActualizacionCache(resultado));
        }
      })
      .catch((cause: unknown) => {
        if (activa) setError(mensajeDeError(cause, 'No pudimos cargar las líneas.'));
      })
      .finally(() => {
        if (activa) setCargando(false);
      });
    return () => {
      activa = false;
    };
  }, []);

  const filtradas = useMemo(() => {
    const consulta = busqueda.trim().toLocaleLowerCase();
    return lineas.filter(
      (linea) =>
        linea.numero.includes(consulta) ||
        linea.nombre.toLocaleLowerCase().includes(consulta),
    );
  }, [busqueda, lineas]);

  return (
    <ScrollView contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
      <CintaDeMuestra />
      <Cabecera
        eyebrow="Encontrá tu recorrido"
        title="Líneas"
        description="Elegí una línea para consultar sus dos sentidos y paradas."
      />
      <TextInput
        accessibilityLabel="Buscar una línea"
        onChangeText={setBusqueda}
        placeholder="Buscar por número o nombre"
        placeholderTextColor="#829095"
        style={styles.busqueda}
        value={busqueda}
      />
      <AvisoCache actualizadoEn={actualizadoEn} />
      <View style={styles.lista}>
        {cargando ? <MensajeEstado>Cargando líneas…</MensajeEstado> : null}
        {error ? <MensajeEstado>{error}</MensajeEstado> : null}
        {!cargando && !error && !filtradas.length ? (
          <MensajeEstado>No encontramos líneas con esa búsqueda.</MensajeEstado>
        ) : null}
        {!error
          ? filtradas.map((linea) => (
              <TarjetaLinea
                key={linea.id}
                linea={linea}
                detalle={`${linea.recorridos.length} sentidos · ${linea.activa ? 'servicio activo' : 'sin servicio'}`}
                onPress={() =>
                  router.push({ pathname: '/linea/[id]', params: { id: linea.id } })
                }
              />
            ))
          : null}
      </View>
    </ScrollView>
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
  lista: {
    marginTop: 19,
  },
});
