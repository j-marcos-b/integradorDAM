import { useRef, useState } from 'react';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Cabecera, CintaDeMuestra, MensajeEstado } from '../src/componentes/Interfaz';
import { mensajeDeError } from '../src/servicios/api';
import { resolverQr } from '../src/servicios/lineas';
import { tema } from '../src/tema';

export default function QrScreen() {
  const router = useRouter();
  const [permiso, pedirPermiso] = useCameraPermissions();
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [resolviendo, setResolviendo] = useState(false);
  const [escaneoActivo, setEscaneoActivo] = useState(true);
  const resolucionEnCurso = useRef(false);

  const resolver = async (valor: string) => {
    if (resolucionEnCurso.current) return;
    resolucionEnCurso.current = true;
    setResolviendo(true);
    setError(null);
    try {
      const parada = await resolverQr(valor.trim());
      router.replace({ pathname: '/parada/[id]', params: { id: parada.id } });
    } catch (cause) {
      setError(mensajeDeError(cause, 'No pudimos reconocer ese código QR.'));
    } finally {
      resolucionEnCurso.current = false;
      setResolviendo(false);
    }
  };

  const solicitarPermiso = async () => {
    try {
      await pedirPermiso();
    } catch (cause) {
      setError(mensajeDeError(cause, 'No pudimos solicitar permiso para usar la cámara.'));
    }
  };

  return (
    <View style={styles.contenido}>
      <Pressable onPress={() => router.back()} style={styles.volver}>
        <Text style={styles.volverTexto}>‹  Volver</Text>
      </Pressable>
      <CintaDeMuestra />
      <Cabecera
        eyebrow="Identificación de paradas"
        title="Escanear QR"
        description="Apuntá al código de una parada para abrir sus horarios."
      />
      {permiso?.granted ? (
        <CameraView
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={
            escaneoActivo
              ? ({ data }) => {
                  setEscaneoActivo(false);
                  void resolver(data);
                }
              : undefined
          }
          style={styles.camara}
        />
      ) : (
        <View style={styles.permiso}>
          <Text style={styles.permisoTexto}>
            Necesitamos acceso a la cámara para leer el código de la parada.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => void solicitarPermiso()}
            style={styles.boton}
          >
            <Text style={styles.botonTexto}>Permitir cámara</Text>
          </Pressable>
        </View>
      )}
      <Text style={styles.etiqueta}>O ingresá el código manualmente</Text>
      <TextInput
        accessibilityLabel="Código QR de la parada"
        autoCapitalize="characters"
        onChangeText={setCodigo}
        placeholder="PARANA:par-101"
        style={styles.campo}
        value={codigo}
      />
      <Pressable
        accessibilityRole="button"
        disabled={resolviendo || !codigo.trim()}
        onPress={() => void resolver(codigo)}
        style={[styles.boton, (resolviendo || !codigo.trim()) && styles.deshabilitado]}
      >
        <Text style={styles.botonTexto}>{resolviendo ? 'Buscando…' : 'Buscar parada'}</Text>
      </Pressable>
      {error ? <MensajeEstado>{error}</MensajeEstado> : null}
      {!escaneoActivo ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => setEscaneoActivo(true)}
          style={styles.reintentar}
        >
          <Text style={styles.reintentarTexto}>Escanear otro código</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  contenido: {
    backgroundColor: tema.fondo,
    flex: 1,
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
  camara: {
    borderRadius: 18,
    height: 245,
    overflow: 'hidden',
    width: '100%',
  },
  permiso: {
    alignItems: 'center',
    backgroundColor: tema.superficie,
    borderColor: tema.borde,
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
  },
  permisoTexto: {
    color: tema.secundaria,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
    textAlign: 'center',
  },
  etiqueta: {
    color: tema.tinta,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 19,
  },
  campo: {
    backgroundColor: tema.superficie,
    borderColor: tema.borde,
    borderRadius: 14,
    borderWidth: 1,
    color: tema.tinta,
    fontSize: 15,
    marginTop: 9,
    minHeight: 50,
    paddingHorizontal: 13,
  },
  boton: {
    alignItems: 'center',
    backgroundColor: tema.primarioFondo,
    borderRadius: 14,
    marginTop: 11,
    paddingVertical: 13,
    width: '100%',
  },
  botonTexto: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  deshabilitado: {
    opacity: 0.5,
  },
  reintentar: {
    alignSelf: 'center',
    marginTop: 12,
    padding: 8,
  },
  reintentarTexto: {
    color: tema.primario,
    fontSize: 12,
    fontWeight: '800',
  },
});
