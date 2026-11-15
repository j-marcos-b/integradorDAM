import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { CintaDeMuestra, MensajeEstado } from '../../src/componentes/Interfaz';
import { useSesion } from '../../src/contexto/SesionContext';
import { fechaActualizacionCache, mensajeDeError } from '../../src/servicios/api';
import {
  obtenerProximosDeParada,
  obtenerHorariosDeParada,
  obtenerFeriados,
  cambiarFavorito,
  obtenerLineas,
  obtenerParada,
  listarReportes,
  confirmarReporte,
  abrirMapaDeParada,
} from '../../src/servicios/lineas';
import { tema } from '../../src/tema';
import { programarRecordatorio } from '../../src/servicios/recordatorios';
import type { Feriado } from '../../src/tipos/api';
import type { Horario, Linea, Parada, ReporteDeDemora, Sentido, TipoDeDia } from '../../src/tipos';

export default function DetalleParadaScreen() {
  const router = useRouter();
  const { usuario, actualizarUsuario } = useSesion();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [parada, setParada] = useState<Parada | undefined>();
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [horariosTabla, setHorariosTabla] = useState<Horario[]>([]);
  const [feriados, setFeriados] = useState<Feriado[]>([]);
  const [tipoDeDia, setTipoDeDia] = useState<TipoDeDia>(
    new Date().getDay() === 0 ? 'domingo' : new Date().getDay() === 6 ? 'sabado' : 'habil',
  );
  const [mostrarTabla, setMostrarTabla] = useState(false);
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportes, setReportes] = useState<ReporteDeDemora[]>([]);
  const [procesando, setProcesando] = useState(false);
  const [actualizadoEn, setActualizadoEn] = useState<string | null>(null);
  const [mensajeRecordatorio, setMensajeRecordatorio] = useState<string | null>(null);
  const [ahora, setAhora] = useState(() => new Date());
  const minutosAhora = ahora.getHours() * 60 + ahora.getMinutes();
  const horaActual = `${String(ahora.getHours()).padStart(2, '0')}:${String(
    ahora.getMinutes(),
  ).padStart(2, '0')}`;

  useEffect(() => {
    const temporizador = setInterval(() => setAhora(new Date()), 30_000);
    return () => clearInterval(temporizador);
  }, []);

  useEffect(() => {
    let activa = true;
    const anio = new Date().getFullYear();
    Promise.all([
      obtenerParada(id),
      obtenerProximosDeParada(id),
      obtenerHorariosDeParada(id),
      obtenerLineas(),
      listarReportes(id),
      obtenerFeriados(anio),
      obtenerFeriados(anio + 1),
    ])
      .then(
        ([
          paradaObtenida,
          horariosObtenidos,
          horariosDeTabla,
          lineasObtenidas,
          reportesObtenidos,
          feriadosEsteAnio,
          feriadosSiguienteAnio,
        ]) => {
          if (!activa) return;
          const feriadosObtenidos = [...feriadosEsteAnio, ...feriadosSiguienteAnio];
          const fechasCache = [
            fechaActualizacionCache(paradaObtenida),
            fechaActualizacionCache(horariosObtenidos),
            fechaActualizacionCache(horariosDeTabla),
            fechaActualizacionCache(lineasObtenidas),
            fechaActualizacionCache(reportesObtenidos),
            fechaActualizacionCache(feriadosEsteAnio),
            fechaActualizacionCache(feriadosSiguienteAnio),
          ].filter((fecha): fecha is string => fecha !== null);
          setActualizadoEn(fechasCache.sort().pop() ?? null);
          setParada(paradaObtenida);
          setHorarios(horariosObtenidos);
          setHorariosTabla(horariosDeTabla);
          setLineas(
            lineasObtenidas.filter((linea) => paradaObtenida.lineaIds.includes(linea.id)),
          );
          setReportes(reportesObtenidos);
          setFeriados(feriadosObtenidos);
          setTipoDeDia(tipoDeDiaActual(feriadosObtenidos));
        },
      )
      .catch((cause: unknown) => {
        if (activa) setError(mensajeDeError(cause, 'No pudimos cargar los horarios.'));
      })
      .finally(() => {
        if (activa) setCargando(false);
      });
    return () => {
      activa = false;
    };
  }, [id]);

  const horariosPorLinea = (lineaId: string) => {
    return horarios.filter(
      (horario) => horario.lineaId === lineaId && horario.sentido === parada?.sentido,
    );
  };

  const alternarFavorito = async () => {
    if (!parada) return;
    if (!usuario) {
      router.push('/(tabs)/cuenta');
      return;
    }
    setProcesando(true);
    try {
      const actualizada = await cambiarFavorito(
        'paradas',
        parada.id,
        !usuario.paradasFavoritas.includes(parada.id),
      );
      await actualizarUsuario(actualizada);
    } catch (cause) {
      setError(mensajeDeError(cause, 'No pudimos actualizar tus favoritos.'));
    } finally {
      setProcesando(false);
    }
  };

  const confirmar = async (reporte: ReporteDeDemora) => {
    if (!usuario) {
      router.push('/(tabs)/cuenta');
      return;
    }
    setProcesando(true);
    try {
      const actualizado = await confirmarReporte(reporte.id);
      setReportes((actuales) =>
        actuales.map((item) => (item.id === reporte.id ? actualizado : item)),
      );
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        (cause: unknown) => console.warn('No se pudo emitir la vibración de confirmación.', cause),
      );
    } catch (cause) {
      setError(mensajeDeError(cause, 'No pudimos confirmar el reporte.'));
    } finally {
      setProcesando(false);
    }
  };

  const abrirMapa = async () => {
    if (!parada) return;
    try {
      await abrirMapaDeParada(parada);
    } catch (cause) {
      setError(mensajeDeError(cause, 'No pudimos abrir la aplicación de mapas.'));
    }
  };

  const recordar = async (numeroLinea: string, hora: string) => {
    setMensajeRecordatorio(null);
    try {
      await programarRecordatorio(numeroLinea, hora);
      setMensajeRecordatorio(`Te avisaremos 10 minutos antes del servicio de las ${hora}.`);
    } catch (cause) {
      setMensajeRecordatorio(mensajeDeError(cause, 'No pudimos programar el recordatorio.'));
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.contenido}>
      <Pressable onPress={() => router.back()} style={styles.volver}>
        <Text style={styles.volverTexto}>‹  Volver</Text>
      </Pressable>
      <CintaDeMuestra />
      {cargando ? <MensajeEstado>Cargando parada y horarios…</MensajeEstado> : null}
      {error ? <MensajeEstado>{error}</MensajeEstado> : null}
      {parada && !error ? (
        <>
          <Text style={styles.eyebrow}>PARADA · INFORMACIÓN DE LA API</Text>
          <Text style={styles.titulo}>{parada.nombre}</Text>
          <Text style={styles.direccion}>
            {parada.refugio ? 'Con refugio' : 'Sin refugio'} · Sentido {parada.sentido}
          </Text>
          <View style={styles.accionesParada}>
            <Pressable
              disabled={procesando}
              onPress={() => void alternarFavorito()}
              style={styles.accion}
            >
              <Text style={styles.accionTexto}>
                {usuario?.paradasFavoritas.includes(parada.id)
                  ? '★ Favorita'
                  : usuario
                    ? '☆ Guardar parada'
                    : '☆ Ingresar para guardar'}
              </Text>
            </Pressable>
            <Pressable
              onPress={() =>
                router.push({ pathname: '/reporte/nuevo', params: { paradaId: parada.id } })
              }
              style={[styles.accion, styles.accionReporte]}
            >
              <Text style={styles.accionReporteTexto}>+ Reportar</Text>
            </Pressable>
          </View>
          <Pressable onPress={() => void abrirMapa()} style={styles.abrirMapa}>
            <Text style={styles.verLineaTexto}>Cómo llegar caminando en Maps →</Text>
          </Pressable>
          <View style={styles.nota}>
            <Text style={styles.notaTitulo}>Horarios de servicio</Text>
            <Text style={styles.notaTexto}>Consultá los horarios de las líneas que paran acá.</Text>
            {actualizadoEn ? (
              <Text style={styles.notaTexto}>
                Sin conexión · guardado {new Date(actualizadoEn).toLocaleString('es-AR')}
              </Text>
            ) : null}
          </View>
          {mensajeRecordatorio ? <MensajeEstado>{mensajeRecordatorio}</MensajeEstado> : null}
          <View style={styles.encabezadoHorarios}>
            <Text style={styles.seccionTitulo}>Próximos servicios</Text>
            <Text style={styles.dia}>Actualizado desde la API</Text>
          </View>
          {lineas.map((linea) => {
            const proximos = horariosPorLinea(linea.id);
            const siguiente = siguienteHorarioDeTabla(
              linea.id,
              parada.sentido,
              horariosTabla,
              feriados,
              ahora,
            );
            return (
              <View key={linea.id} style={styles.tarjetaLinea}>
                <View style={[styles.marca, { backgroundColor: linea.color }]} />
                <View style={styles.contenidoLinea}>
                  <Text style={styles.nombreLinea}>Línea {linea.numero}</Text>
                  {proximos.length ? (
                    <View style={styles.horarios}>
                      {proximos.map((horario) => {
                        const [hora, minuto] = horario.hora.split(':').map(Number);
                        const horarioEnMinutos = hora * 60 + minuto;
                        const esManana = horario.hora < horaActual;
                        const diferencia =
                          (horarioEnMinutos - minutosAhora + 24 * 60) % (24 * 60);
                        return (
                          <View key={horario.id} style={styles.horario}>
                            <Text style={styles.hora}>{horario.hora}</Text>
                            <View style={styles.horarioAcciones}>
                              <Text style={styles.falta}>
                                {esManana
                                  ? 'mañana · según tabla'
                                  : diferencia === 0
                                    ? 'según tabla'
                                    : `en ${diferencia} min · según tabla`}
                              </Text>
                              {Platform.OS !== 'web' ? (
                                <Pressable
                                  onPress={() => void recordar(linea.numero, horario.hora)}
                                  style={styles.recordar}
                                >
                                  <Text style={styles.recordarTexto}>Avisarme</Text>
                                </Pressable>
                              ) : null}
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  ) : (
                    siguiente ? (
                      <View style={styles.horario}>
                        <Text style={styles.hora}>{siguiente.horario.hora}</Text>
                        <View style={styles.horarioAcciones}>
                          <Text style={styles.falta}>
                            Próximo: {siguiente.fecha.toLocaleDateString('es-AR', {
                              weekday: 'long',
                              day: 'numeric',
                              month: 'long',
                            })}
                          </Text>
                          {Platform.OS !== 'web' ? (
                            <Pressable
                              onPress={() => void recordar(linea.numero, siguiente.horario.hora)}
                              style={styles.recordar}
                            >
                              <Text style={styles.recordarTexto}>Avisarme</Text>
                            </Pressable>
                          ) : null}
                        </View>
                      </View>
                    ) : (
                      <Text style={styles.sinServicio}>
                        No hay próximos servicios publicados para esta línea.
                      </Text>
                    )
                  )}
                  <Pressable
                    onPress={() =>
                      router.push({ pathname: '/linea/[id]', params: { id: linea.id } })
                    }
                    style={styles.verLinea}
                  >
                    <Text style={styles.verLineaTexto}>Ver recorrido de la línea →</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
          <Pressable
            onPress={() => setMostrarTabla((visible) => !visible)}
            style={styles.verTabla}
          >
            <Text style={styles.verLineaTexto}>
              {mostrarTabla ? 'Ocultar horarios completos' : 'Ver horarios completos'}
            </Text>
          </Pressable>
          {mostrarTabla ? (
            <View style={styles.tablaCompleta}>
              <Text style={styles.seccionTitulo}>Tabla por tipo de día</Text>
              <View style={styles.selectorDias}>
                {([
                  ['habil', 'Hábil'],
                  ['sabado', 'Sábado'],
                  ['domingo', 'Domingo'],
                  ['feriado', 'Feriado'],
                ] as const).map(([valor, etiqueta]) => (
                  <Pressable
                    key={valor}
                    onPress={() => setTipoDeDia(valor)}
                    style={[styles.diaChip, tipoDeDia === valor && styles.diaChipActivo]}
                  >
                    <Text
                      style={[
                        styles.diaChipTexto,
                        tipoDeDia === valor && styles.diaChipTextoActivo,
                      ]}
                    >
                      {etiqueta}
                    </Text>
                  </Pressable>
                ))}
              </View>
              {lineas.map((linea) => {
                const horas = horariosTabla
                  .filter(
                    (horario) =>
                      horario.lineaId === linea.id && horario.tipoDeDia === tipoDeDia,
                  )
                  .sort((a, b) => a.hora.localeCompare(b.hora));
                return (
                  <View key={linea.id} style={styles.filaTabla}>
                    <Text style={styles.nombreLinea}>Línea {linea.numero}</Text>
                    {horas.length ? (
                      <View style={styles.horasTabla}>
                        {horas.map((horario) => (
                          <Text key={horario.id} style={styles.horaTabla}>
                            {horario.hora}
                          </Text>
                        ))}
                      </View>
                    ) : (
                      <Text style={styles.sinServicio}>Sin horarios publicados para este día.</Text>
                    )}
                  </View>
                );
              })}
            </View>
          ) : null}
          <View style={styles.reportesSeccion}>
            <Text style={styles.seccionTitulo}>Reportes recientes</Text>
            {!reportes.length ? (
              <Text style={styles.sinServicio}>No hay reportes recientes en esta parada.</Text>
            ) : (
              reportes.map((reporte) => (
                <View key={reporte.id} style={styles.reporteTarjeta}>
                  <Text style={styles.reporteMotivo}>
                    {etiquetaMotivo(reporte.motivo)}
                  </Text>
                  {reporte.comentario ? (
                    <Text style={styles.reporteComentario}>{reporte.comentario}</Text>
                  ) : null}
                  <Text style={styles.reporteHora}>
                    {new Date(reporte.fechaHora).toLocaleTimeString('es-AR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })} · {reporte.confirmaciones} confirmaciones
                  </Text>
                  <Pressable
                    disabled={procesando}
                    onPress={() => void confirmar(reporte)}
                    style={styles.confirmar}
                  >
                    <Text style={styles.verLineaTexto}>Confirmar reporte</Text>
                  </Pressable>
                </View>
              ))
            )}
          </View>
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
    letterSpacing: 1,
  },
  titulo: {
    color: tema.tinta,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.6,
    lineHeight: 34,
    marginTop: 10,
  },
  direccion: {
    color: tema.secundaria,
    fontSize: 13,
    marginTop: 7,
  },
  accionesParada: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 13,
  },
  accion: {
    backgroundColor: tema.primarioSuave,
    borderRadius: 999,
    marginBottom: 5,
    marginRight: 7,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  accionTexto: {
    color: tema.primario,
    fontSize: 11,
    fontWeight: '800',
  },
  accionReporte: {
    backgroundColor: tema.alertaSuave,
  },
  accionReporteTexto: {
    color: tema.alerta,
    fontSize: 11,
    fontWeight: '800',
  },
  abrirMapa: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingVertical: 8,
  },
  nota: {
    backgroundColor: tema.avisoFondo,
    borderRadius: 17,
    marginTop: 21,
    padding: 16,
  },
  notaTitulo: {
    color: tema.avisoTexto,
    fontSize: 13,
    fontWeight: '800',
  },
  notaTexto: {
    color: tema.avisoTexto,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
  },
  encabezadoHorarios: {
    alignItems: 'baseline',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 11,
    marginTop: 25,
  },
  seccionTitulo: {
    color: tema.tinta,
    fontSize: 18,
    fontWeight: '900',
  },
  dia: {
    color: tema.secundaria,
    fontSize: 12,
  },
  tarjetaLinea: {
    backgroundColor: tema.superficie,
    borderColor: tema.borde,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 10,
    overflow: 'hidden',
  },
  marca: {
    width: 6,
  },
  contenidoLinea: {
    flex: 1,
    padding: 15,
  },
  nombreLinea: {
    color: tema.tinta,
    fontSize: 15,
    fontWeight: '900',
  },
  horarios: {
    marginTop: 9,
  },
  horario: {
    alignItems: 'center',
    borderTopColor: tema.borde,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 40,
  },
  hora: {
    color: tema.tinta,
    fontSize: 16,
    fontWeight: '900',
  },
  falta: {
    color: tema.primario,
    fontSize: 12,
    fontWeight: '700',
  },
  horarioAcciones: {
    alignItems: 'flex-end',
    flexDirection: 'row',
  },
  recordar: {
    marginLeft: 9,
    paddingVertical: 5,
  },
  recordarTexto: {
    color: tema.primario,
    fontSize: 10,
    fontWeight: '900',
  },
  sinServicio: {
    color: tema.secundaria,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
  },
  verLinea: {
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingVertical: 5,
  },
  verTabla: {
    alignSelf: 'flex-start',
    marginBottom: 8,
    marginTop: 6,
    paddingVertical: 8,
  },
  tablaCompleta: {
    backgroundColor: tema.superficie,
    borderColor: tema.borde,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 15,
    padding: 14,
  },
  selectorDias: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 7,
    marginTop: 10,
  },
  diaChip: {
    backgroundColor: tema.fondo,
    borderRadius: 999,
    marginBottom: 6,
    marginRight: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  diaChipActivo: {
    backgroundColor: tema.primarioFondo,
  },
  diaChipTexto: {
    color: tema.secundaria,
    fontSize: 10,
    fontWeight: '700',
  },
  diaChipTextoActivo: {
    color: '#FFFFFF',
  },
  filaTabla: {
    borderTopColor: tema.borde,
    borderTopWidth: 1,
    paddingVertical: 11,
  },
  horasTabla: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
  },
  horaTabla: {
    backgroundColor: tema.primarioSuave,
    borderRadius: 8,
    color: tema.primario,
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 5,
    marginRight: 5,
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  verLineaTexto: {
    color: tema.primario,
    fontSize: 12,
    fontWeight: '800',
  },
  reportesSeccion: {
    marginTop: 20,
  },
  reporteTarjeta: {
    backgroundColor: tema.superficie,
    borderColor: tema.borde,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 9,
    padding: 14,
  },
  reporteMotivo: {
    color: tema.tinta,
    fontSize: 14,
    fontWeight: '800',
  },
  reporteComentario: {
    color: tema.secundaria,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
  },
  reporteHora: {
    color: tema.secundaria,
    fontSize: 11,
    marginTop: 7,
  },
  confirmar: {
    alignSelf: 'flex-start',
    marginTop: 7,
    paddingVertical: 5,
  },
});

function etiquetaMotivo(motivo: ReporteDeDemora['motivo']): string {
  const etiquetas: Record<ReporteDeDemora['motivo'], string> = {
    no_paso: 'No pasó',
    paso_lleno: 'Pasó lleno y no paró',
    demorado: 'Viene demorado',
    unidad_rota: 'Unidad rota',
    calle_cortada: 'Calle cortada',
  };
  return etiquetas[motivo];
}

function tipoDeDiaActual(feriados: Feriado[]): TipoDeDia {
  return tipoDeDiaParaFecha(new Date(), feriados);
}

function tipoDeDiaParaFecha(fecha: Date, feriados: Feriado[]): TipoDeDia {
  const fechaIso = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(
    fecha.getDate(),
  ).padStart(2, '0')}`;
  if (feriados.some((feriado) => feriado.fecha === fechaIso)) return 'feriado';
  return fecha.getDay() === 0 ? 'domingo' : fecha.getDay() === 6 ? 'sabado' : 'habil';
}

function siguienteHorarioDeTabla(
  lineaId: string,
  sentido: Sentido,
  horarios: Horario[],
  feriados: Feriado[],
  ahora: Date,
): { horario: Horario; fecha: Date } | null {
  for (let dias = 0; dias < 8; dias += 1) {
    const fecha = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + dias);
    const tipoDeDia = tipoDeDiaParaFecha(fecha, feriados);
    const horariosDelDia = horarios
      .filter(
        (horario) =>
          horario.lineaId === lineaId &&
          horario.sentido === sentido &&
          horario.tipoDeDia === tipoDeDia,
      )
      .sort((a, b) => a.hora.localeCompare(b.hora));
    const horario = horariosDelDia.find((item) => {
      if (dias > 0) return true;
      const [hora, minuto] = item.hora.split(':').map(Number);
      return hora * 60 + minuto > ahora.getHours() * 60 + ahora.getMinutes();
    });
    if (horario) return { horario, fecha };
  }
  return null;
}
