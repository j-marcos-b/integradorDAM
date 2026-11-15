import { useEffect, useState } from 'react';
import { Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MapaRecorrido } from '../../src/componentes/MapaRecorrido';
import { VideoAviso } from '../../src/componentes/VideoAviso';
import {
  Cabecera,
  CintaDeMuestra,
  MensajeEstado,
} from '../../src/componentes/Interfaz';
import { AvisoCache } from '../../src/componentes/AvisoCache';
import { fechaActualizacionCache, mensajeDeError } from '../../src/servicios/api';
import { obtenerAvisosVigentes, obtenerLineas } from '../../src/servicios/lineas';
import { tema } from '../../src/tema';
import type { Aviso, Linea } from '../../src/tipos';

export default function AvisosScreen() {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actualizadoEn, setActualizadoEn] = useState<string | null>(null);

  useEffect(() => {
    let activa = true;
    Promise.allSettled([obtenerAvisosVigentes(), obtenerLineas()])
      .then(([resultadoAvisos, resultadoLineas]) => {
        if (!activa) return;
        if (resultadoAvisos.status === 'fulfilled') {
          setAvisos(resultadoAvisos.value);
          setActualizadoEn(fechaActualizacionCache(resultadoAvisos.value));
        } else {
          setError(mensajeDeError(resultadoAvisos.reason, 'No pudimos actualizar los avisos.'));
        }
        if (resultadoLineas.status === 'fulfilled') {
          setLineas(resultadoLineas.value);
          const fecha = fechaActualizacionCache(resultadoLineas.value);
          if (fecha) setActualizadoEn(fecha);
        } else {
          setError((actual) =>
            actual
              ? `${actual} ${mensajeDeError(resultadoLineas.reason, 'No pudimos cargar las líneas.')}`
              : mensajeDeError(resultadoLineas.reason, 'No pudimos cargar las líneas.'),
          );
        }
      })
      .finally(() => {
        if (activa) setCargando(false);
      });
    return () => {
      activa = false;
    };
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.contenido}>
      <CintaDeMuestra />
      <Cabecera
        eyebrow="Información del servicio"
        title="Avisos"
        description="Novedades que pueden cambiar el recorrido habitual."
      />
      <View style={styles.nota}>
        <Text style={styles.notaTitulo}>Avisos de la API</Text>
        <Text style={styles.notaTexto}>
          Se actualizan al conectarte; si no hay señal, mostramos la última versión guardada.
        </Text>
      </View>
      <AvisoCache actualizadoEn={actualizadoEn} />
      {cargando ? <MensajeEstado>Cargando avisos…</MensajeEstado> : null}
      {error ? <MensajeEstado>{error}</MensajeEstado> : null}
      {!cargando && !error && avisos.length === 0 ? (
        <MensajeEstado>No hay avisos vigentes.</MensajeEstado>
      ) : null}
      {!error
        ? avisos.map((aviso) => {
            const afectadas = lineas.filter((linea) => aviso.lineaIds.includes(linea.id));
            const gravedad = aviso.gravedad.toLocaleUpperCase();
            return (
              <View key={aviso.id} style={styles.tarjeta}>
                <View style={styles.fila}>
                  <View style={styles.punto} />
                  <Text style={styles.gravedad}>{gravedad}</Text>
                  <Text style={styles.fecha}>
                    DESDE {new Date(aviso.desde).toLocaleDateString('es-AR')}
                    {aviso.hasta ? ` · HASTA ${new Date(aviso.hasta).toLocaleDateString('es-AR')}` : ''}
                  </Text>
                </View>
                <Text style={styles.titulo}>{aviso.titulo}</Text>
                <Text style={styles.detalle}>{aviso.detalle}</Text>
                {aviso.videoUrl ? <VideoAviso url={aviso.videoUrl} /> : null}
                <Text style={styles.subtitulo}>Líneas afectadas</Text>
                <View style={styles.lineas}>
                  {afectadas.map((linea) => (
                    <Link key={linea.id} href={`/linea/${linea.id}`} asChild>
                      <Pressable style={styles.chip}>
                        <Text style={styles.chipTexto}>Línea {linea.numero}</Text>
                      </Pressable>
                    </Link>
                  ))}
                </View>
                {aviso.trazadoAlternativo?.length ? (
                  <View style={styles.mapa}>
                    <Text style={styles.subtitulo}>Recorrido alternativo</Text>
                    <MapaRecorrido
                      trazado={aviso.trazadoAlternativo}
                      paradas={[]}
                      color={afectadas[0]?.color ?? tema.alerta}
                      alSeleccionar={() => {}}
                    />
                  </View>
                ) : null}
              </View>
            );
          })
        : null}
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
  nota: {
    backgroundColor: tema.avisoFondo,
    borderRadius: 17,
    marginBottom: 17,
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
  tarjeta: {
    backgroundColor: tema.superficie,
    borderColor: tema.borde,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 12,
    padding: 18,
  },
  fila: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  punto: {
    backgroundColor: tema.alerta,
    borderRadius: 99,
    height: 8,
    marginRight: 7,
    width: 8,
  },
  gravedad: {
    color: tema.alerta,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  fecha: {
    color: tema.secundaria,
    fontSize: 10,
    marginLeft: 'auto',
  },
  titulo: {
    color: tema.tinta,
    fontSize: 18,
    fontWeight: '800',
    marginTop: 14,
  },
  detalle: {
    color: tema.secundaria,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 7,
  },
  subtitulo: {
    color: tema.tinta,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 18,
  },
  lineas: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 9,
  },
  chip: {
    backgroundColor: tema.primarioSuave,
    borderRadius: 999,
    marginBottom: 7,
    marginRight: 7,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipTexto: {
    color: tema.primario,
    fontSize: 12,
    fontWeight: '800',
  },
  mapa: {
    marginTop: 16,
  },
});
