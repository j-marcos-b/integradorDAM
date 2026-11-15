import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSesion } from '../../src/contexto/SesionContext';
import { Cabecera, CintaDeMuestra, MensajeEstado } from '../../src/componentes/Interfaz';
import { mensajeDeError } from '../../src/servicios/api';
import { autenticarBiometria, disponibilidadBiometrica } from '../../src/servicios/biometria';
import { descargarDatosSinConexion, obtenerLinea, obtenerParada } from '../../src/servicios/lineas';
import { tema } from '../../src/tema';
import type { Linea, Parada } from '../../src/tipos';

export default function CuentaScreen() {
  const router = useRouter();
  const {
    usuario,
    cargando,
    biometriaHabilitada,
    iniciar,
    crearCuenta,
    configurarBiometria,
    desbloquearBiometria,
    cerrar,
  } = useSesion();
  const [registrar, setRegistrar] = useState(false);
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [lineasFavoritas, setLineasFavoritas] = useState<Linea[]>([]);
  const [paradasFavoritas, setParadasFavoritas] = useState<Parada[]>([]);
  const [favoritosDeUsuario, setFavoritosDeUsuario] = useState<string | null>(null);
  const [descargando, setDescargando] = useState(false);
  const [progresoOffline, setProgresoOffline] = useState('');

  useEffect(() => {
    let activa = true;
    if (!usuario) return;
    Promise.all([
      Promise.all(usuario.lineasFavoritas.map((id) => obtenerLinea(id))),
      Promise.all(usuario.paradasFavoritas.map((id) => obtenerParada(id))),
    ])
      .then(([lineas, paradas]) => {
        if (!activa) return;
        setLineasFavoritas(lineas);
        setParadasFavoritas(paradas);
        setFavoritosDeUsuario(usuario.id);
      })
      .catch((cause: unknown) => {
        if (activa) setError(mensajeDeError(cause, 'No pudimos cargar tus favoritos.'));
      });
    return () => {
      activa = false;
    };
  }, [usuario]);

  const descargarOffline = async () => {
    setDescargando(true);
    setError(null);
    setMensaje(null);
    setProgresoOffline('Preparando líneas y paradas…');
    try {
      await descargarDatosSinConexion((completadas, total) => {
        setProgresoOffline(`Guardando horarios y recorridos: ${completadas} de ${total}`);
      });
      setMensaje('Líneas, paradas, recorridos y horarios guardados en este dispositivo.');
    } catch (cause) {
      setError(mensajeDeError(cause, 'No se pudieron guardar todos los datos offline.'));
    } finally {
      setDescargando(false);
    }
  };

  const enviar = async () => {
    setProcesando(true);
    setError(null);
    setMensaje(null);
    try {
      if (registrar) await crearCuenta(nombre.trim(), email.trim(), contrasena);
      else await iniciar(email.trim(), contrasena);
      setContrasena('');
    } catch (cause) {
      setError(mensajeDeError(cause, 'No pudimos completar la solicitud.'));
    } finally {
      setProcesando(false);
    }
  };

  const salir = async () => {
    try {
      await cerrar();
      setMensaje('Sesión cerrada.');
    } catch (cause) {
      setError(mensajeDeError(cause, 'No pudimos cerrar la sesión.'));
    }
  };

  const alternarBiometria = async () => {
    setProcesando(true);
    setError(null);
    setMensaje(null);
    try {
      if (biometriaHabilitada) {
        await configurarBiometria(false);
        setMensaje('Reingreso biométrico desactivado.');
        return;
      }
      const errorDisponibilidad = await disponibilidadBiometrica();
      if (errorDisponibilidad) throw new Error(errorDisponibilidad);
      if (!(await autenticarBiometria('Confirmá tu identidad para activar el reingreso'))) {
        setMensaje('No se activó el reingreso biométrico.');
        return;
      }
      await configurarBiometria(true);
      setMensaje('Reingreso biométrico activado para este dispositivo.');
    } catch (cause) {
      setError(mensajeDeError(cause, 'No pudimos configurar el reingreso biométrico.'));
    } finally {
      setProcesando(false);
    }
  };

  const reintentarDesbloqueo = async () => {
    setProcesando(true);
    setError(null);
    setMensaje(null);
    try {
      if (!(await desbloquearBiometria())) {
        setMensaje('No se desbloqueó la cuenta. Podés ingresar con tu contraseña.');
      }
    } catch (cause) {
      setError(mensajeDeError(cause, 'No pudimos desbloquear la cuenta.'));
    } finally {
      setProcesando(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
      <CintaDeMuestra />
      <Cabecera
        eyebrow="Preferencias personales"
        title="Tu cuenta"
        description="Ingresá para sincronizar favoritos y participar con reportes."
      />
      {cargando ? <MensajeEstado>Comprobando sesión…</MensajeEstado> : null}
      {usuario ? (
        <View style={styles.tarjeta}>
          <Text style={styles.etiqueta}>SESIÓN ACTIVA</Text>
          <Text style={styles.nombre}>{usuario.nombre}</Text>
          <Text style={styles.email}>{usuario.email}</Text>
          <View style={styles.resumen}>
            <Text style={styles.resumenTexto}>
              {usuario.lineasFavoritas.length} líneas favoritas · {usuario.paradasFavoritas.length} paradas favoritas
            </Text>
          </View>
          {Platform.OS !== 'web' ? (
            <Pressable
              accessibilityRole="button"
              disabled={procesando}
              onPress={() => void alternarBiometria()}
              style={[styles.boton, procesando && styles.deshabilitado]}
            >
              <Text style={styles.botonTexto}>
                {biometriaHabilitada
                  ? 'Desactivar reingreso con huella o rostro'
                  : 'Activar reingreso con huella o rostro'}
              </Text>
            </Pressable>
          ) : null}
          <Text style={styles.subtitulo}>Tus líneas favoritas</Text>
          {(favoritosDeUsuario === usuario.id ? lineasFavoritas : []).map((linea) => (
            <Pressable
              key={linea.id}
              onPress={() => router.push({ pathname: '/linea/[id]', params: { id: linea.id } })}
              style={styles.favorito}
            >
              <Text style={styles.favoritoTexto}>Línea {linea.numero} · {linea.nombre}</Text>
            </Pressable>
          ))}
          <Text style={styles.subtitulo}>Tus paradas favoritas</Text>
          {(favoritosDeUsuario === usuario.id ? paradasFavoritas : []).map((parada) => (
            <Pressable
              key={parada.id}
              onPress={() => router.push({ pathname: '/parada/[id]', params: { id: parada.id } })}
              style={styles.favorito}
            >
              <Text style={styles.favoritoTexto}>{parada.nombre}</Text>
            </Pressable>
          ))}
          <Pressable
            accessibilityRole="button"
            disabled={procesando}
            onPress={() => void salir()}
            style={styles.botonSecundario}
          >
            <Text style={styles.botonSecundarioTexto}>Cerrar sesión</Text>
          </Pressable>
        </View>
      ) : !cargando ? (
        <View style={styles.tarjeta}>
          <Text style={styles.etiqueta}>{registrar ? 'CREAR CUENTA' : 'INICIAR SESIÓN'}</Text>
          {registrar ? (
            <TextInput
              accessibilityLabel="Nombre"
              autoCapitalize="words"
              onChangeText={setNombre}
              placeholder="Nombre"
              style={styles.campo}
              value={nombre}
            />
          ) : null}
          <TextInput
            accessibilityLabel="Correo electrónico"
            autoCapitalize="none"
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="Correo electrónico"
            style={styles.campo}
            value={email}
          />
          <TextInput
            accessibilityLabel="Contraseña"
            autoCapitalize="none"
            onChangeText={setContrasena}
            placeholder="Contraseña"
            secureTextEntry
            style={styles.campo}
            value={contrasena}
          />
          {registrar ? (
            <Text style={styles.ayuda}>La contraseña debe tener al menos 8 caracteres.</Text>
          ) : (
            <Text style={styles.ayuda}>Demo: julian@mail.com · contraseña demo1234</Text>
          )}
          <Pressable
            accessibilityRole="button"
            disabled={procesando || !email || !contrasena || (registrar && !nombre)}
            onPress={() => void enviar()}
            style={[styles.boton, (procesando || !email || !contrasena) && styles.deshabilitado]}
          >
            <Text style={styles.botonTexto}>
              {procesando ? 'Procesando…' : registrar ? 'Crear cuenta' : 'Ingresar'}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setRegistrar((actual) => !actual);
              setError(null);
            }}
            style={styles.cambiar}
          >
            <Text style={styles.cambiarTexto}>
              {registrar ? 'Ya tengo una cuenta' : 'Crear una cuenta nueva'}
            </Text>
          </Pressable>
          {biometriaHabilitada ? (
            <Pressable
              accessibilityRole="button"
              disabled={procesando}
              onPress={() => void reintentarDesbloqueo()}
              style={[styles.boton, procesando && styles.deshabilitado]}
            >
              <Text style={styles.botonTexto}>Desbloquear con huella o rostro</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      {error ? <MensajeEstado>{error}</MensajeEstado> : null}
      {mensaje ? <MensajeEstado>{mensaje}</MensajeEstado> : null}
      <View style={styles.tarjetaOffline}>
        <Text style={styles.etiqueta}>USO SIN CONEXIÓN</Text>
        <Text style={styles.offlineTexto}>
          Guardá horarios, recorridos y datos de las paradas para consultarlos sin internet.
        </Text>
        {descargando ? <MensajeEstado>{progresoOffline}</MensajeEstado> : null}
        <Pressable
          accessibilityRole="button"
          disabled={descargando}
          onPress={() => void descargarOffline()}
          style={[styles.boton, descargando && styles.deshabilitado]}
        >
          <Text style={[styles.botonTexto, { textAlign: 'center' }]}>
            {descargando ? 'Guardando…' : 'Descargar datos para usar sin conexión'}
          </Text>
        </Pressable>
      </View>
      <Text style={styles.seguridad}>
        El token de sesión se guarda de forma segura en el dispositivo y nunca en la caché general.
      </Text>
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
  tarjeta: {
    backgroundColor: tema.superficie,
    borderColor: tema.borde,
    borderRadius: 22,
    borderWidth: 1,
    padding: 20,
  },
  etiqueta: {
    color: tema.primario,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 12,
  },
  nombre: {
    color: tema.tinta,
    fontSize: 21,
    fontWeight: '900',
  },
  email: {
    color: tema.secundaria,
    fontSize: 14,
    marginTop: 5,
  },
  resumen: {
    backgroundColor: tema.primarioSuave,
    borderRadius: 14,
    marginTop: 18,
    padding: 14,
  },
  resumenTexto: {
    color: tema.primario,
    fontSize: 13,
    fontWeight: '700',
  },
  push: {
    marginTop: 16,
  },
  campo: {
    backgroundColor: tema.fondo,
    borderColor: tema.borde,
    borderRadius: 14,
    borderWidth: 1,
    color: tema.tinta,
    fontSize: 15,
    marginBottom: 11,
    minHeight: 52,
    paddingHorizontal: 14,
  },
  ayuda: {
    color: tema.secundaria,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 14,
  },
  boton: {
    alignItems: 'center',
    backgroundColor: tema.primarioFondo,
    borderRadius: 14,
    minHeight: 50,
    justifyContent: 'center',
    marginTop: 5,
  },
  botonTexto: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  deshabilitado: {
    opacity: 0.5,
  },
  cambiar: {
    alignSelf: 'center',
    marginTop: 17,
    padding: 6,
  },
  cambiarTexto: {
    color: tema.primario,
    fontSize: 13,
    fontWeight: '800',
  },
  botonSecundario: {
    alignItems: 'center',
    borderColor: tema.borde,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 17,
    minHeight: 48,
    justifyContent: 'center',
  },
  botonSecundarioTexto: {
    color: tema.alerta,
    fontSize: 14,
    fontWeight: '800',
  },
  seguridad: {
    color: tema.secundaria,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 16,
    textAlign: 'center',
  },
  subtitulo: {
    color: tema.tinta,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 16,
  },
  favorito: {
    borderBottomColor: tema.borde,
    borderBottomWidth: 1,
    paddingVertical: 11,
  },
  favoritoTexto: {
    color: tema.primario,
    fontSize: 13,
    fontWeight: '700',
  },
  tarjetaOffline: {
    backgroundColor: tema.superficie,
    borderColor: tema.borde,
    borderRadius: 22,
    borderWidth: 1,
    marginTop: 16,
    padding: 18,
  },
  offlineTexto: {
    color: tema.secundaria,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 8,
  },
});
