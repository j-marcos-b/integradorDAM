import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Cabecera, CintaDeMuestra, MensajeEstado } from '../../src/componentes/Interfaz';
import { useSesion } from '../../src/contexto/SesionContext';
import { mensajeDeError } from '../../src/servicios/api';
import { crearReporte, obtenerLineas, obtenerParada } from '../../src/servicios/lineas';
import { tema } from '../../src/tema';
import type { Linea, MotivoDemora, Parada } from '../../src/tipos';

const motivos: { valor: MotivoDemora; etiqueta: string }[] = [
  { valor: 'no_paso', etiqueta: 'No pasó' },
  { valor: 'paso_lleno', etiqueta: 'Pasó lleno y no paró' },
  { valor: 'demorado', etiqueta: 'Viene demorado' },
  { valor: 'unidad_rota', etiqueta: 'Unidad rota' },
  { valor: 'calle_cortada', etiqueta: 'Calle cortada' },
];

export default function NuevoReporteScreen() {
  const router = useRouter();
  const { paradaId } = useLocalSearchParams<{ paradaId: string }>();
  const { usuario } = useSesion();
  const [parada, setParada] = useState<Parada | null>(null);
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [lineaId, setLineaId] = useState('');
  const [motivo, setMotivo] = useState<MotivoDemora>('no_paso');
  const [comentario, setComentario] = useState('');
  const [fotoUri, setFotoUri] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [guardadoOffline, setGuardadoOffline] = useState(false);

  useEffect(() => {
    let activa = true;
    Promise.all([obtenerParada(paradaId), obtenerLineas()])
      .then(([paradaObtenida, lineasObtenidas]) => {
        if (!activa) return;
        const deParada = lineasObtenidas.filter((linea) =>
          paradaObtenida.lineaIds.includes(linea.id),
        );
        setParada(paradaObtenida);
        setLineas(deParada);
        setLineaId(deParada[0]?.id ?? '');
      })
      .catch((cause: unknown) => {
        if (activa) setError(mensajeDeError(cause, 'No pudimos cargar los datos de la parada.'));
      })
      .finally(() => {
        if (activa) setCargando(false);
      });
    return () => {
      activa = false;
    };
  }, [paradaId]);

  const elegirFoto = async (desdeCamara: boolean) => {
    setError(null);
    try {
      const resultado = desdeCamara
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.75 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.75 });
      if (!resultado.canceled) setFotoUri(resultado.assets[0].uri);
    } catch (cause) {
      setError(mensajeDeError(cause, 'No pudimos abrir la selección de fotos.'));
    }
  };

  const enviar = async () => {
    if (!usuario) {
      router.push('/(tabs)/cuenta');
      return;
    }
    if (!lineaId || !parada) {
      setError('Elegí una línea para poder enviar el reporte.');
      return;
    }
    setEnviando(true);
    setError(null);
    setMensaje(null);
    const id = `rep-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    try {
      const resultado = await crearReporte({
        id,
        lineaId,
        paradaId: parada.id,
        motivo,
        comentario: comentario.trim() || null,
        fotoUri,
        fechaHora: new Date().toISOString(),
      });
      if (resultado.estado === 'pendiente') {
        setGuardadoOffline(true);
        setMensaje(
          resultado.fotoOmitida
            ? 'Sin conexión: el reporte quedó guardado sin foto y se enviará cuando vuelva internet.'
            : 'Sin conexión: el reporte quedó guardado y se enviará cuando vuelva internet.',
        );
      } else {
        router.back();
      }
    } catch (cause) {
      setError(mensajeDeError(cause, 'No pudimos enviar el reporte.'));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
      <Pressable onPress={() => router.back()} style={styles.volver}>
        <Text style={styles.volverTexto}>‹  Volver</Text>
      </Pressable>
      <CintaDeMuestra />
      <Cabecera
        eyebrow="Ayudá a otros pasajeros"
        title="Reportar demora"
        description={parada?.nombre ?? 'Cargando parada…'}
      />
      {cargando ? <MensajeEstado>Cargando líneas de esta parada…</MensajeEstado> : null}
      {!usuario && !cargando ? (
        <MensajeEstado>Para enviar un reporte, primero iniciá sesión con tu cuenta.</MensajeEstado>
      ) : null}
      <Text style={styles.seccion}>¿Qué línea esperás?</Text>
      <View style={styles.opciones}>
        {lineas.map((linea) => (
          <Pressable
            key={linea.id}
            onPress={() => setLineaId(linea.id)}
            style={[styles.chip, linea.id === lineaId && styles.chipActivo]}
          >
            <Text style={[styles.chipTexto, linea.id === lineaId && styles.chipTextoActivo]}>
              Línea {linea.numero}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.seccion}>¿Qué está pasando?</Text>
      {motivos.map((opcion) => (
        <Pressable
          key={opcion.valor}
          onPress={() => setMotivo(opcion.valor)}
          style={[styles.motivo, motivo === opcion.valor && styles.motivoActivo]}
        >
          <View style={[styles.radio, motivo === opcion.valor && styles.radioActivo]} />
          <Text style={styles.motivoTexto}>{opcion.etiqueta}</Text>
        </Pressable>
      ))}
      <TextInput
        accessibilityLabel="Comentario opcional"
        maxLength={500}
        multiline
        onChangeText={setComentario}
        placeholder="Agregá un comentario (opcional)"
        style={styles.comentario}
        value={comentario}
      />
      <View style={styles.filaBotones}>
        <Pressable onPress={() => void elegirFoto(true)} style={styles.botonSecundario}>
          <Text style={styles.botonSecundarioTexto}>Tomar foto</Text>
        </Pressable>
        <Pressable onPress={() => void elegirFoto(false)} style={styles.botonSecundario}>
          <Text style={styles.botonSecundarioTexto}>Elegir de galería</Text>
        </Pressable>
      </View>
      {fotoUri ? (
        <View style={styles.fotoContenedor}>
          <Image source={{ uri: fotoUri }} style={styles.foto} />
          <Pressable onPress={() => setFotoUri(null)}>
            <Text style={styles.quitarFoto}>Quitar foto</Text>
          </Pressable>
        </View>
      ) : null}
      {error ? <MensajeEstado>{error}</MensajeEstado> : null}
      {mensaje ? <MensajeEstado>{mensaje}</MensajeEstado> : null}
      <Pressable
        accessibilityRole="button"
        disabled={enviando || cargando || guardadoOffline}
        onPress={() => void enviar()}
        style={[styles.enviar, (enviando || cargando || guardadoOffline) && styles.deshabilitado]}
      >
        <Text style={styles.enviarTexto}>
          {guardadoOffline ? 'Reporte guardado' : enviando ? 'Enviando…' : 'Enviar reporte'}
        </Text>
      </Pressable>
      <Text style={styles.privacidad}>El reporte puede incluir la hora y la parada donde estás esperando.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contenido: {
    backgroundColor: tema.fondo,
    flexGrow: 1,
    paddingBottom: 40,
    paddingHorizontal: 22,
    paddingTop: 16,
  },
  volver: {
    alignSelf: 'flex-start',
    marginBottom: 15,
    paddingVertical: 5,
  },
  volverTexto: {
    color: tema.primario,
    fontSize: 15,
    fontWeight: '800',
  },
  seccion: {
    color: tema.tinta,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 10,
    marginTop: 16,
  },
  opciones: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chip: {
    backgroundColor: tema.superficie,
    borderColor: tema.borde,
    borderRadius: 999,
    borderWidth: 1,
    marginBottom: 7,
    marginRight: 7,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  chipActivo: {
    backgroundColor: tema.primarioSuave,
    borderColor: tema.primario,
  },
  chipTexto: {
    color: tema.secundaria,
    fontSize: 12,
    fontWeight: '700',
  },
  chipTextoActivo: {
    color: tema.primario,
    fontWeight: '900',
  },
  motivo: {
    alignItems: 'center',
    backgroundColor: tema.superficie,
    borderColor: tema.borde,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 7,
    minHeight: 48,
    paddingHorizontal: 13,
  },
  motivoActivo: {
    borderColor: tema.primario,
  },
  radio: {
    borderColor: '#98A6A7',
    borderRadius: 10,
    borderWidth: 2,
    height: 18,
    marginRight: 10,
    width: 18,
  },
  radioActivo: {
    backgroundColor: tema.primarioFondo,
    borderColor: tema.primario,
  },
  motivoTexto: {
    color: tema.tinta,
    fontSize: 13,
    fontWeight: '600',
  },
  comentario: {
    backgroundColor: tema.superficie,
    borderColor: tema.borde,
    borderRadius: 15,
    borderWidth: 1,
    color: tema.tinta,
    fontSize: 14,
    minHeight: 88,
    padding: 14,
    textAlignVertical: 'top',
  },
  filaBotones: {
    flexDirection: 'row',
    marginTop: 12,
  },
  botonSecundario: {
    backgroundColor: tema.primarioSuave,
    borderRadius: 13,
    flex: 1,
    marginRight: 7,
    paddingVertical: 12,
  },
  botonSecundarioTexto: {
    color: tema.primario,
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
  },
  fotoContenedor: {
    alignItems: 'center',
    marginTop: 14,
  },
  foto: {
    borderRadius: 15,
    height: 170,
    width: '100%',
  },
  quitarFoto: {
    color: tema.alerta,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 8,
  },
  enviar: {
    alignItems: 'center',
    backgroundColor: tema.primarioFondo,
    borderRadius: 15,
    marginTop: 18,
    paddingVertical: 15,
  },
  enviarTexto: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  deshabilitado: {
    opacity: 0.5,
  },
  privacidad: {
    color: tema.secundaria,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 10,
    textAlign: 'center',
  },
});
