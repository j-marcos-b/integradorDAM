import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import {
  CintaDeMuestra,
  MensajeEstado,
  TarjetaLinea,
  TituloSeccion,
} from '../../src/componentes/Interfaz';
import { MapaParadas } from '../../src/componentes/MapaParadas';
import { AvisoCache } from '../../src/componentes/AvisoCache';
import { useSesion } from '../../src/contexto/SesionContext';
import {
  obtenerAvisosVigentes,
  obtenerLineas,
  obtenerParadas,
  obtenerParada,
  obtenerProximosDeParada,
} from '../../src/servicios/lineas';
import { fechaActualizacionCache, mensajeDeError } from '../../src/servicios/api';
import { tema } from '../../src/tema';
import type { Aviso, Horario, Linea, Parada } from '../../src/tipos';

type ParadaFavoritaVista = { parada: Parada; horarios: Horario[] };

export default function InicioScreen() {
  const router = useRouter();
  const { usuario, cargando: cargandoSesion } = useSesion();
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [paradas, setParadas] = useState<Parada[]>([]);
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [cargando, setCargando] = useState(true);
  const [paradasFavoritas, setParadasFavoritas] = useState<ParadaFavoritaVista[]>([]);
  const [cargandoFavoritas, setCargandoFavoritas] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actualizadoEn, setActualizadoEn] = useState<string | null>(null);

  useEffect(() => {
    let activa = true;
    Promise.allSettled([obtenerLineas(), obtenerParadas(), obtenerAvisosVigentes()])
      .then(([resultadoLineas, resultadoParadas, resultadoAvisos]) => {
        if (!activa) return;
        const errores: string[] = [];
        if (resultadoLineas.status === 'fulfilled') {
          setLineas(resultadoLineas.value);
          setActualizadoEn(fechaActualizacionCache(resultadoLineas.value));
        } else {
          errores.push(mensajeDeError(resultadoLineas.reason, 'No pudimos cargar las líneas.'));
        }
        if (resultadoParadas.status === 'fulfilled') {
          setParadas(resultadoParadas.value);
          const fecha = fechaActualizacionCache(resultadoParadas.value);
          if (fecha) setActualizadoEn(fecha);
        } else {
          errores.push(mensajeDeError(resultadoParadas.reason, 'No pudimos cargar las paradas.'));
        }
        if (resultadoAvisos.status === 'fulfilled') {
          setAvisos(resultadoAvisos.value);
          const fecha = fechaActualizacionCache(resultadoAvisos.value);
          if (fecha) setActualizadoEn(fecha);
        } else {
          errores.push(mensajeDeError(resultadoAvisos.reason, 'No pudimos cargar los avisos.'));
        }
        setError(errores.length ? [...new Set(errores)].join(' ') : null);
      })
      .finally(() => {
        if (activa) setCargando(false);
      });
    return () => {
      activa = false;
    };
  }, []);

  useEffect(() => {
    let activa = true;
    const ids = usuario?.paradasFavoritas ?? [];
    if (cargandoSesion) return () => { activa = false; };
    if (!ids.length) return () => { activa = false; };

    Promise.resolve()
      .then(() => {
        if (activa) setCargandoFavoritas(true);
        return Promise.allSettled(
          ids.map(async (id) => {
            const [parada, horarios] = await Promise.all([
              obtenerParada(id),
              obtenerProximosDeParada(id),
            ]);
            return { parada, horarios };
          }),
        );
      })
      .then((resultados) => {
        if (!activa) return;
        const favoritas: ParadaFavoritaVista[] = [];
        const errores: string[] = [];
        for (const resultado of resultados) {
          if (resultado.status === 'fulfilled') favoritas.push(resultado.value);
          else errores.push(mensajeDeError(resultado.reason, 'No pudimos cargar una parada favorita.'));
        }
        setParadasFavoritas(favoritas);
        if (errores.length) setError((actual) => [...new Set([actual, ...errores].filter(Boolean))].join(' '));
      })
      .finally(() => {
        if (activa) setCargandoFavoritas(false);
      });
    return () => {
      activa = false;
    };
  }, [usuario, cargandoSesion]);

  const lineasFavoritas = (usuario?.lineasFavoritas ?? [])
    .map((id) => lineas.find((linea) => linea.id === id))
    .filter((linea): linea is Linea => linea !== undefined);

  return (
    <ScrollView contentContainerStyle={styles.contenido}>
      <CintaDeMuestra />
      <View style={styles.destacado}>
        <View style={styles.destacadoCabecera}>
          <View style={styles.destacadoTextos}>
            <Text style={styles.destacadoEtiqueta}>TRANSPORTE URBANO</Text>
            <Text style={styles.destacadoTitulo}>Movete por Paraná</Text>
          </View>
          <SymbolView
            accessibilityElementsHidden
            importantForAccessibility="no"
            name={{ ios: 'bus.fill', android: 'directions_bus', web: 'directions_bus' }}
            tintColor="#C6E5E7"
            size={40}
          />
        </View>
        <Text style={styles.destacadoTexto}>
          Encontrá líneas, recorridos y horarios para organizar tu próximo viaje.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/(tabs)/lineas')}
          style={styles.botonDestacado}
        >
          <Text style={styles.botonDestacadoTexto}>Ver líneas y recorridos →</Text>
        </Pressable>
      </View>

      <View style={styles.seccion}>
        <TituloSeccion detalle="Tus paradas guardadas">Tus paradas</TituloSeccion>
        {cargandoSesion || (Boolean(usuario?.paradasFavoritas.length) && cargandoFavoritas) ? (
          <MensajeEstado>Cargando tus paradas favoritas…</MensajeEstado>
        ) : usuario && !usuario.paradasFavoritas.length ? (
          <View style={styles.vacioFavoritos}>
            <Text style={styles.vacioTexto}>
              Todavía no guardaste paradas. Agregá una desde su pantalla para ver acá sus próximos horarios.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/(tabs)/paradas')}
              style={styles.botonSecundario}
            >
              <Text style={styles.botonSecundarioTexto}>Buscar una parada</Text>
            </Pressable>
          </View>
        ) : usuario ? (
          paradasFavoritas.length ? (
            paradasFavoritas.map(({ parada, horarios }) => (
              <Pressable
                key={parada.id}
                accessibilityRole="button"
                onPress={() =>
                  router.push({ pathname: '/parada/[id]', params: { id: parada.id } })
                }
                style={styles.tarjetaFavorita}
              >
                <View style={styles.favoritaCabecera}>
                  <Text style={styles.favoritaNombre}>{parada.nombre}</Text>
                  <Text style={styles.favoritaFlecha}>›</Text>
                </View>
                {parada.lineaIds.map((lineaId) => {
                  const linea = lineas.find((item) => item.id === lineaId);
                  if (!linea) return null;
                  const proximos = horarios
                    .filter((horario) => horario.lineaId === linea.id)
                    .slice(0, 3);
                  return (
                    <View key={linea.id} style={styles.filaHorario}>
                      <View style={[styles.marcaFavorita, { backgroundColor: linea.color }]} />
                      <Text style={styles.nombreLineaFavorita}>L{linea.numero}</Text>
                      {proximos.length ? (
                        <View style={styles.horasFavoritas}>
                          {proximos.map((horario) => (
                            <Text key={horario.id} style={styles.horaFavorita}>
                              {horario.hora}
                            </Text>
                          ))}
                        </View>
                      ) : (
                        <Text style={styles.sinHorario}>Sin próximos horarios</Text>
                      )}
                    </View>
                  );
                })}
                <Text style={styles.detalleFavorita}>Próximos horarios · Tocá para ver la parada</Text>
              </Pressable>
            ))
          ) : (
            <MensajeEstado>No pudimos cargar tus paradas favoritas.</MensajeEstado>
          )
        ) : (
          <View style={styles.vacioFavoritos}>
            <Text style={styles.vacioTexto}>Iniciá sesión para guardar tus paradas favoritas y ver sus horarios acá.</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/(tabs)/cuenta')}
              style={styles.botonSecundario}
            >
              <Text style={styles.botonSecundarioTexto}>Ingresar o crear cuenta</Text>
            </Pressable>
          </View>
        )}
      </View>

      <View style={styles.seccion}>
        <TituloSeccion detalle="Acceso rápido">Tus líneas favoritas</TituloSeccion>
        {!usuario ? (
          <View style={styles.vacioFavoritos}>
            <Text style={styles.vacioTexto}>
              Iniciá sesión y marcá tus líneas favoritas para tener sus recorridos a mano.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/(tabs)/cuenta')}
              style={styles.botonSecundario}
            >
              <Text style={styles.botonSecundarioTexto}>Ingresar o crear cuenta</Text>
            </Pressable>
          </View>
        ) : cargando && !lineas.length ? (
          <MensajeEstado>Cargando tus líneas favoritas…</MensajeEstado>
        ) : !usuario.lineasFavoritas.length ? (
          <View style={styles.vacioFavoritos}>
            <Text style={styles.vacioTexto}>
              Todavía no guardaste líneas. Agregá una desde su recorrido para verla acá.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/(tabs)/lineas')}
              style={styles.botonSecundario}
            >
              <Text style={styles.botonSecundarioTexto}>Explorar líneas</Text>
            </Pressable>
          </View>
        ) : lineasFavoritas.length ? (
          lineasFavoritas.map((linea) => (
            <TarjetaLinea
              key={linea.id}
              linea={linea}
              detalle="Tu favorita · Ver recorrido"
              onPress={() =>
                router.push({ pathname: '/linea/[id]', params: { id: linea.id } })
              }
            />
          ))
        ) : (
          <MensajeEstado>No pudimos cargar tus líneas favoritas.</MensajeEstado>
        )}
      </View>

      {error ? <MensajeEstado>{error}</MensajeEstado> : null}
      <AvisoCache actualizadoEn={actualizadoEn} />

      <View style={styles.seccion}>
        <TituloSeccion detalle="Avisos vigentes">Aviso destacado</TituloSeccion>
        {avisos[0] ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/(tabs)/avisos')}
            style={styles.aviso}
          >
            <View style={styles.avisoFila}>
              <View style={styles.puntoAviso} />
              <Text style={styles.avisoTipo}>DESVÍO</Text>
              <Text style={styles.avisoFecha}>API</Text>
            </View>
            <Text style={styles.avisoTitulo}>{avisos[0].titulo}</Text>
            <Text style={styles.avisoTexto}>{avisos[0].detalle}</Text>
            <Text style={styles.avisoLink}>Ver todos los avisos →</Text>
          </Pressable>
        ) : !cargando && !error ? (
          <MensajeEstado>No hay avisos nuevos.</MensajeEstado>
        ) : null}
      </View>

      <View style={styles.seccion}>
        <TituloSeccion detalle="Paradas en Paraná">Mapa de paradas</TituloSeccion>
        {cargando && !paradas.length ? <MensajeEstado>Cargando mapa…</MensajeEstado> : null}
        {paradas.length ? (
          <>
            <View style={styles.mapa}>
              <MapaParadas
                paradas={paradas}
                ubicacion={null}
                alSeleccionar={(parada) =>
                  router.push({ pathname: '/parada/[id]', params: { id: parada.id } })
                }
              />
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/mapa')}
              style={styles.botonSecundario}
            >
              <Text style={styles.botonSecundarioTexto}>Explorar paradas cercanas →</Text>
            </Pressable>
          </>
        ) : !cargando ? (
          <MensajeEstado>No pudimos cargar el mapa de paradas.</MensajeEstado>
        ) : null}
      </View>

      <View style={styles.seccion}>
        <TituloSeccion detalle="Datos de la API">Líneas para explorar</TituloSeccion>
        {cargando ? <MensajeEstado>Conectando con la API…</MensajeEstado> : null}
        {!cargando && lineas.length ? (
          lineas.slice(0, 3).map((linea) => (
            <TarjetaLinea
              key={linea.id}
              linea={linea}
              detalle="Ver recorrido y paradas"
              onPress={() =>
                router.push({ pathname: '/linea/[id]', params: { id: linea.id } })
              }
            />
          ))
        ) : null}
        {!cargando && !error ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/(tabs)/lineas')}
            style={styles.botonDestacado}
          >
            <Text style={styles.botonDestacadoTexto}>Ver las 14 líneas →</Text>
          </Pressable>
        ) : null}
      </View>
      <Text style={styles.pie}>Líneas, recorridos y horarios de Paraná</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contenido: {
    backgroundColor: tema.fondo,
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 36,
  },
  destacado: {
    backgroundColor: tema.primarioFondo,
    borderRadius: 24,
    marginBottom: 27,
    padding: 22,
  },
  destacadoEtiqueta: {
    color: '#C6E5E7',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  destacadoCabecera: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  destacadoTextos: {
    flex: 1,
    paddingRight: 12,
  },
  destacadoTitulo: {
    color: '#FFFFFF',
    fontSize: 25,
    fontWeight: '800',
    marginTop: 12,
  },
  destacadoTexto: {
    color: '#E4F0EF',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 7,
  },
  botonDestacado: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    marginTop: 18,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  botonDestacadoTexto: {
    color: tema.primario,
    fontSize: 13,
    fontWeight: '800',
  },
  seccion: {
    marginBottom: 22,
  },
  tarjetaFavorita: {
    backgroundColor: tema.superficie,
    borderColor: tema.borde,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 10,
    padding: 15,
  },
  favoritaCabecera: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  favoritaNombre: {
    color: tema.tinta,
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
  },
  favoritaFlecha: {
    color: tema.primario,
    fontSize: 23,
    fontWeight: '700',
    marginLeft: 8,
  },
  filaHorario: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 8,
  },
  marcaFavorita: {
    borderRadius: 3,
    height: 20,
    marginRight: 7,
    width: 4,
  },
  nombreLineaFavorita: {
    color: tema.tinta,
    fontSize: 12,
    fontWeight: '800',
    width: 37,
  },
  horasFavoritas: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  horaFavorita: {
    color: tema.primario,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
  },
  sinHorario: {
    color: tema.secundaria,
    flex: 1,
    fontSize: 11,
  },
  detalleFavorita: {
    color: tema.secundaria,
    fontSize: 10,
    marginTop: 4,
  },
  vacioFavoritos: {
    backgroundColor: tema.superficie,
    borderColor: tema.borde,
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  vacioTexto: {
    color: tema.secundaria,
    fontSize: 13,
    lineHeight: 19,
  },
  botonSecundario: {
    alignSelf: 'flex-start',
    backgroundColor: tema.primarioSuave,
    borderRadius: 999,
    marginTop: 12,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  botonSecundarioTexto: {
    color: tema.primario,
    fontSize: 12,
    fontWeight: '800',
  },
  mapa: {
    borderRadius: 18,
    marginBottom: 4,
    overflow: 'hidden',
  },
  aviso: {
    backgroundColor: tema.superficie,
    borderColor: tema.borde,
    borderRadius: 20,
    borderWidth: 1,
    padding: 17,
  },
  avisoFila: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  puntoAviso: {
    backgroundColor: tema.alerta,
    borderRadius: 99,
    height: 8,
    marginRight: 7,
    width: 8,
  },
  avisoTipo: {
    color: tema.alerta,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.7,
  },
  avisoFecha: {
    color: tema.secundaria,
    fontSize: 11,
    marginLeft: 'auto',
  },
  avisoTitulo: {
    color: tema.tinta,
    fontSize: 17,
    fontWeight: '800',
    marginTop: 13,
  },
  avisoTexto: {
    color: tema.secundaria,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 7,
  },
  avisoLink: {
    color: tema.primario,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 15,
  },
  pie: {
    color: tema.secundaria,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
    textAlign: 'center',
  },
});
