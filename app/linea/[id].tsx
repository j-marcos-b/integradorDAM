import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CintaDeMuestra, MensajeEstado } from '../../src/componentes/Interfaz';
import { MapaRecorrido } from '../../src/componentes/MapaRecorrido';
import { VideoAviso } from '../../src/componentes/VideoAviso';
import { AvisoCache } from '../../src/componentes/AvisoCache';
import { useSesion } from '../../src/contexto/SesionContext';
import { fechaActualizacionCache, mensajeDeError } from '../../src/servicios/api';
import {
  cambiarFavorito,
  obtenerAvisosVigentes,
  obtenerLinea,
  obtenerParadas,
} from '../../src/servicios/lineas';
import { tema } from '../../src/tema';
import type { Aviso, Linea, Parada, Recorrido, Sentido } from '../../src/tipos';

export default function DetalleLineaScreen() {
  const router = useRouter();
  const { usuario, actualizarUsuario } = useSesion();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [linea, setLinea] = useState<Linea | undefined>();
  const [paradas, setParadas] = useState<Parada[]>([]);
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [sentido, setSentido] = useState<Sentido>('ida');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [procesandoFavorito, setProcesandoFavorito] = useState(false);
  const [actualizadoEn, setActualizadoEn] = useState<string | null>(null);
  const [recorridoOffline, setRecorridoOffline] = useState(false);

  useEffect(() => {
    let activa = true;
    Promise.all([obtenerLinea(id), obtenerParadas(), obtenerAvisosVigentes(id)])
      .then(([lineaObtenida, paradasObtenidas, avisosObtenidos]) => {
        if (!activa) return;
        const fechasCache = [
          fechaActualizacionCache(lineaObtenida),
          fechaActualizacionCache(paradasObtenidas),
          fechaActualizacionCache(avisosObtenidos),
        ].filter((fecha): fecha is string => fecha !== null);
        setActualizadoEn(fechasCache.sort().pop() ?? null);
        setRecorridoOffline(
          fechaActualizacionCache(lineaObtenida) !== null ||
            fechaActualizacionCache(paradasObtenidas) !== null,
        );
        setLinea(lineaObtenida);
        setParadas(paradasObtenidas);
        setAvisos(avisosObtenidos);
      })
      .catch((cause: unknown) => {
        if (activa) setError(mensajeDeError(cause, 'No pudimos cargar el recorrido.'));
      })
      .finally(() => {
        if (activa) setCargando(false);
      });
    return () => {
      activa = false;
    };
  }, [id]);

  const recorrido: Recorrido | undefined = linea?.recorridos.find(
    (item) => item.sentido === sentido,
  );
  const paradasDelRecorrido =
    recorrido?.paradaIds
      .map((paradaId) => paradas.find((parada) => parada.id === paradaId))
      .filter((parada): parada is Parada => parada !== undefined) ?? [];
  const esFavorita = usuario?.lineasFavoritas.includes(id) ?? false;

  const alternarFavorito = async () => {
    if (!usuario) {
      router.push('/(tabs)/cuenta');
      return;
    }
    setProcesandoFavorito(true);
    setError(null);
    try {
      await actualizarUsuario(await cambiarFavorito('lineas', id, !esFavorita));
    } catch (cause) {
      setError(mensajeDeError(cause, 'No pudimos actualizar tus favoritos.'));
    } finally {
      setProcesandoFavorito(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.contenido}>
      <Pressable onPress={() => router.back()} style={styles.volver}>
        <Text style={styles.volverTexto}>‹  Volver</Text>
      </Pressable>
      <CintaDeMuestra />
      {cargando ? <MensajeEstado>Cargando recorrido…</MensajeEstado> : null}
      {error ? <MensajeEstado>{error}</MensajeEstado> : null}
      <AvisoCache actualizadoEn={actualizadoEn} />
      {linea && !error ? (
        <>
          <Text style={styles.eyebrow}>RECORRIDO DE LA API</Text>
          <View style={styles.tituloFila}>
            <View style={[styles.marcaLinea, { backgroundColor: linea.color }]} />
            <View style={styles.tituloTextos}>
              <Text style={styles.titulo}>Línea {linea.numero}</Text>
              <Text style={styles.subtitulo}>{linea.nombre}</Text>
            </View>
          </View>
          <View style={styles.estadoServicio}>
            <View style={styles.puntoEstado} />
            <Text style={styles.estadoTexto}>
              {linea.activa ? 'Servicio activo' : 'Línea inactiva'}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            disabled={procesandoFavorito}
            onPress={() => void alternarFavorito()}
            style={styles.favorito}
          >
            <Text style={styles.favoritoTexto}>
              {usuario
                ? esFavorita
                  ? '★  Quitar de favoritos'
                  : '☆  Agregar a favoritos'
                : '☆  Iniciá sesión para guardar esta línea'}
            </Text>
          </Pressable>
          {avisos.map((aviso) => (
            <View key={aviso.id} style={styles.aviso}>
              <Text style={styles.avisoEtiqueta}>AVISO · {aviso.gravedad.toLocaleUpperCase()}</Text>
              <Text style={styles.avisoTitulo}>{aviso.titulo}</Text>
              <Text style={styles.avisoTexto}>{aviso.detalle}</Text>
              {id === 'lin-02' && aviso.videoUrl ? <VideoAviso url={aviso.videoUrl} /> : null}
            </View>
          ))}
          <Text style={styles.seccionTitulo}>Elegí el sentido</Text>
          <View style={styles.selector}>
            {linea.recorridos.map((item) => (
              <Pressable
                key={item.sentido}
                onPress={() => setSentido(item.sentido)}
                style={[
                  styles.opcionSentido,
                  sentido === item.sentido && styles.opcionActiva,
                ]}
              >
                <Text
                  style={[
                    styles.opcionTexto,
                    sentido === item.sentido && styles.opcionTextoActiva,
                  ]}
                >
                  {item.sentido === 'ida' ? 'Ida' : 'Vuelta'}
                </Text>
              </Pressable>
            ))}
          </View>
          {recorrido ? (
            <>
              <View style={styles.destino}>
                <Text style={styles.destinoKicker}>DESTINO</Text>
                <Text style={styles.destinoNombre}>{recorrido.destino}</Text>
              </View>
              {recorridoOffline ? (
                <View style={styles.avisoOffline}>
                  <Text style={styles.mapaAviso}>
                    Sin conexión: se muestra el recorrido esquemático y las paradas guardadas en el
                    dispositivo.
                  </Text>
                </View>
              ) : (
                <MapaRecorrido
                  key={sentido}
                  trazado={recorrido.trazado}
                  paradas={paradasDelRecorrido}
                  color={linea.color}
                  alSeleccionar={(parada) =>
                    router.push({ pathname: '/parada/[id]', params: { id: parada.id } })
                  }
                />
              )}
              <View style={styles.mapaEsquematico}>
                <Text style={styles.mapaTitulo}>Paradas del recorrido</Text>
                <Text style={styles.mapaAviso}>Ordenadas según el sentido seleccionado.</Text>
                <View style={styles.trazado}>
                  {paradasDelRecorrido.map((parada, index) => (
                    <Pressable
                      key={parada.id}
                      onPress={() =>
                        router.push({ pathname: '/parada/[id]', params: { id: parada.id } })
                      }
                      style={styles.paradaRuta}
                    >
                      <View style={styles.marcadorColumna}>
                        <View
                          style={[
                            styles.marcador,
                            { backgroundColor: linea.color },
                            index === paradasDelRecorrido.length - 1 && styles.ultimoMarcador,
                          ]}
                        />
                        {index < paradasDelRecorrido.length - 1 ? (
                          <View style={[styles.conector, { backgroundColor: linea.color }]} />
                        ) : null}
                      </View>
                      <View style={styles.paradaRutaTextos}>
                        <Text style={styles.paradaRutaNombre}>{parada.nombre}</Text>
                        <Text style={styles.paradaRutaDetalle}>
                          {index === 0 ? 'Inicio del recorrido' : index === paradasDelRecorrido.length - 1 ? 'Fin del recorrido' : 'Parada'}
                        </Text>
                      </View>
                      <Text style={styles.flecha}>›</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </>
          ) : (
            <MensajeEstado>Este sentido todavía no tiene un recorrido cargado.</MensajeEstado>
          )}
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contenido: {
    backgroundColor: tema.fondo,
    flexGrow: 1,
    paddingBottom: 40,
    paddingHorizontal: 22,
    paddingTop: 18,
  },
  volver: {
    alignSelf: 'flex-start',
    marginBottom: 17,
    paddingVertical: 5,
  },
  volverTexto: {
    color: tema.primario,
    fontSize: 15,
    fontWeight: '800',
  },
  eyebrow: {
    color: tema.primario,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  tituloFila: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  marcaLinea: {
    borderRadius: 4,
    height: 55,
    marginRight: 13,
    width: 7,
  },
  tituloTextos: {
    flex: 1,
  },
  titulo: {
    color: tema.tinta,
    fontSize: 31,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  subtitulo: {
    color: tema.secundaria,
    fontSize: 13,
    marginTop: 3,
  },
  estadoServicio: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#E7F2E9',
    borderRadius: 999,
    flexDirection: 'row',
    marginTop: 17,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  puntoEstado: {
    backgroundColor: '#36834A',
    borderRadius: 10,
    height: 7,
    marginRight: 7,
    width: 7,
  },
  estadoTexto: {
    color: '#28613A',
    fontSize: 11,
    fontWeight: '800',
  },
  favorito: {
    alignSelf: 'flex-start',
    backgroundColor: tema.primarioSuave,
    borderRadius: 999,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  favoritoTexto: {
    color: tema.primario,
    fontSize: 12,
    fontWeight: '800',
  },
  aviso: {
    backgroundColor: tema.alertaSuave,
    borderRadius: 17,
    marginTop: 14,
    padding: 15,
  },
  avisoEtiqueta: {
    color: tema.alerta,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  avisoTitulo: {
    color: tema.tinta,
    fontSize: 15,
    fontWeight: '800',
    marginTop: 8,
  },
  avisoTexto: {
    color: tema.secundaria,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
  },
  seccionTitulo: {
    color: tema.tinta,
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 10,
    marginTop: 26,
  },
  selector: {
    backgroundColor: '#E8EBE7',
    borderRadius: 15,
    flexDirection: 'row',
    padding: 4,
  },
  opcionSentido: {
    alignItems: 'center',
    borderRadius: 12,
    flex: 1,
    paddingVertical: 11,
  },
  opcionActiva: {
    backgroundColor: tema.superficie,
  },
  opcionTexto: {
    color: tema.secundaria,
    fontSize: 13,
    fontWeight: '700',
  },
  opcionTextoActiva: {
    color: tema.primario,
    fontWeight: '900',
  },
  destino: {
    marginBottom: 13,
    marginTop: 20,
  },
  destinoKicker: {
    color: tema.secundaria,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  destinoNombre: {
    color: tema.tinta,
    fontSize: 16,
    fontWeight: '800',
    marginTop: 4,
  },
  mapaEsquematico: {
    backgroundColor: tema.superficie,
    borderColor: tema.borde,
    borderRadius: 21,
    borderWidth: 1,
    padding: 17,
  },
  avisoOffline: {
    backgroundColor: tema.avisoFondo,
    borderRadius: 14,
    marginBottom: 12,
    padding: 12,
  },
  mapaTitulo: {
    color: tema.tinta,
    fontSize: 15,
    fontWeight: '800',
  },
  mapaAviso: {
    color: tema.secundaria,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 5,
  },
  trazado: {
    marginTop: 17,
  },
  paradaRuta: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 60,
  },
  marcadorColumna: {
    alignItems: 'center',
    alignSelf: 'stretch',
    justifyContent: 'flex-start',
    marginRight: 13,
    paddingTop: 18,
    width: 18,
  },
  marcador: {
    borderColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 3,
    elevation: 1,
    height: 15,
    width: 15,
    zIndex: 1,
  },
  ultimoMarcador: {
    height: 18,
    width: 18,
  },
  conector: {
    bottom: -7,
    position: 'absolute',
    top: 29,
    width: 3,
  },
  paradaRutaTextos: {
    flex: 1,
    paddingVertical: 12,
  },
  paradaRutaNombre: {
    color: tema.tinta,
    fontSize: 13,
    fontWeight: '700',
  },
  paradaRutaDetalle: {
    color: tema.secundaria,
    fontSize: 11,
    marginTop: 3,
  },
  flecha: {
    color: tema.primario,
    fontSize: 22,
  },
});
