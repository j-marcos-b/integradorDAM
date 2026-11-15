import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { Magnetometer } from 'expo-sensors';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MapaParadas } from '../src/componentes/MapaParadas';
import { Cabecera, CintaDeMuestra, MensajeEstado } from '../src/componentes/Interfaz';
import { AvisoCache } from '../src/componentes/AvisoCache';
import { fechaActualizacionCache, mensajeDeError } from '../src/servicios/api';
import { abrirMapaDeParada, obtenerParadas } from '../src/servicios/lineas';
import { tema } from '../src/tema';
import type { Coordenadas, Parada } from '../src/tipos';

export default function MapaScreen() {
  const router = useRouter();
  const [paradas, setParadas] = useState<Parada[]>([]);
  const [ubicacion, setUbicacion] = useState<Coordenadas | null>(null);
  const [cargando, setCargando] = useState(true);
  const [buscandoUbicacion, setBuscandoUbicacion] = useState(false);
  const [rumbo, setRumbo] = useState<number | null>(null);
  const [brujulaDisponible, setBrujulaDisponible] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actualizadoEn, setActualizadoEn] = useState<string | null>(null);

  useEffect(() => {
    if (!ubicacion) return;
    let activa = true;
    let suscripcion: { remove: () => void } | undefined;
    Magnetometer.isAvailableAsync()
      .then((disponible) => {
        if (!activa) return;
        setBrujulaDisponible(disponible);
        if (!disponible) return;
        Magnetometer.setUpdateInterval(250);
        suscripcion = Magnetometer.addListener(({ x, y }) => {
          const grados = (Math.atan2(-x, y) * 180) / Math.PI;
          setRumbo((grados + 360) % 360);
        });
      })
      .catch((cause: unknown) => {
        if (activa) setError(mensajeDeError(cause, 'No pudimos acceder a la brújula.'));
      });
    return () => {
      activa = false;
      suscripcion?.remove();
    };
  }, [ubicacion]);

  useEffect(() => {
    let activa = true;
    obtenerParadas()
      .then((resultado) => {
        if (activa) {
          setParadas(resultado);
          setActualizadoEn(fechaActualizacionCache(resultado));
        }
      })
      .catch((cause: unknown) => {
        if (activa) setError(mensajeDeError(cause, 'No pudimos cargar las paradas.'));
      })
      .finally(() => activa && setCargando(false));
    return () => {
      activa = false;
    };
  }, []);

  const ordenarPorDistancia = useMemo(() => {
    if (!ubicacion) return paradas;
    return [...paradas].sort(
      (a, b) => distancia(a.coordenadas, ubicacion) - distancia(b.coordenadas, ubicacion),
    );
  }, [paradas, ubicacion]);

  const buscarCercanas = async () => {
    setBuscandoUbicacion(true);
    setError(null);
    try {
      const permiso = await Location.requestForegroundPermissionsAsync();
      if (!permiso.granted) {
        setError('Sin permiso de ubicación. Podés seguir explorando las paradas en el mapa.');
        return;
      }
      const posicion = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setUbicacion({
        latitud: posicion.coords.latitude,
        longitud: posicion.coords.longitude,
      });
    } catch (cause) {
      setError(mensajeDeError(cause, 'No pudimos obtener tu ubicación.'));
    } finally {
      setBuscandoUbicacion(false);
    }
  };

  const seleccionar = (parada: Parada) => {
    router.push({ pathname: '/parada/[id]', params: { id: parada.id } });
  };

  const abrirMapa = async (parada: Parada) => {
    try {
      await abrirMapaDeParada(parada);
    } catch (cause) {
      setError(mensajeDeError(cause, 'No pudimos abrir la aplicación de mapas.'));
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.contenido}>
      <Pressable onPress={() => router.back()} style={styles.volver}>
        <Text style={styles.volverTexto}>‹  Volver</Text>
      </Pressable>
      <CintaDeMuestra />
      <Cabecera
        eyebrow="Ubicación aproximada"
        title="Paradas cercanas"
        description="El mapa muestra paradas; la ubicación del colectivo no está disponible en vivo."
      />
      <Pressable
        disabled={buscandoUbicacion}
        onPress={() => void buscarCercanas()}
        style={[styles.boton, buscandoUbicacion && styles.deshabilitado]}
      >
        <Text style={styles.botonTexto}>
          {buscandoUbicacion ? 'Buscando…' : 'Usar mi ubicación'}
        </Text>
      </Pressable>
      {brujulaDisponible === false ? (
        <MensajeEstado>Este dispositivo no tiene brújula; podés usar “Cómo llegar”.</MensajeEstado>
      ) : ubicacion && rumbo === null ? (
        <MensajeEstado>
          Esperando la brújula. Mantené el teléfono horizontal y movelo suavemente en forma de ocho.
        </MensajeEstado>
      ) : null}
      {error ? <MensajeEstado>{error}</MensajeEstado> : null}
      <AvisoCache actualizadoEn={actualizadoEn} />
      {cargando ? <MensajeEstado>Cargando paradas…</MensajeEstado> : null}
      <MapaParadas paradas={paradas} ubicacion={ubicacion} alSeleccionar={seleccionar} />
      <Text style={styles.tituloLista}>
        {ubicacion ? 'Más próximas a vos' : 'Paradas disponibles'}
      </Text>
      {ordenarPorDistancia.slice(0, 20).map((parada) => (
        <View key={parada.id} style={styles.tarjeta}>
          <Pressable onPress={() => seleccionar(parada)} style={styles.nombreContenedor}>
            <Text style={styles.nombre}>{parada.nombre}</Text>
            <Text style={styles.detalle}>Líneas {parada.lineaIds.length} · {parada.sentido}</Text>
          </Pressable>
          {ubicacion && rumbo !== null ? (
            <View
              accessibilityLabel={`Dirección hacia ${parada.nombre}`}
              style={styles.orientacion}
            >
              <Text
                style={[
                  styles.flechaDireccion,
                  { transform: [{ rotate: `${rumboHacia(ubicacion, parada.coordenadas) - rumbo}deg` }] },
                ]}
              >
                ↑
              </Text>
              <Text style={styles.distanciaTexto}>
                {Math.round(distancia(ubicacion, parada.coordenadas))} m
              </Text>
            </View>
          ) : null}
          <Pressable onPress={() => void abrirMapa(parada)} style={styles.abrir}>
            <Text style={styles.abrirTexto}>Cómo llegar</Text>
          </Pressable>
        </View>
      ))}
    </ScrollView>
  );
}

function distancia(a: Coordenadas, b: Coordenadas): number {
  const radianes = Math.PI / 180;
  const latitud = (b.latitud - a.latitud) * radianes;
  const longitud = (b.longitud - a.longitud) * radianes;
  const valor = Math.min(
    1,
    Math.sin(latitud / 2) ** 2 +
    Math.cos(a.latitud * radianes) *
      Math.cos(b.latitud * radianes) *
      Math.sin(longitud / 2) ** 2,
  );
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(valor), Math.sqrt(1 - valor));
}

function rumboHacia(a: Coordenadas, b: Coordenadas): number {
  const radianes = Math.PI / 180;
  const latitudA = a.latitud * radianes;
  const latitudB = b.latitud * radianes;
  const diferenciaLongitud = (b.longitud - a.longitud) * radianes;
  const y = Math.sin(diferenciaLongitud) * Math.cos(latitudB);
  const x =
    Math.cos(latitudA) * Math.sin(latitudB) -
    Math.sin(latitudA) * Math.cos(latitudB) * Math.cos(diferenciaLongitud);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
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
  boton: {
    alignItems: 'center',
    backgroundColor: tema.primarioFondo,
    borderRadius: 15,
    marginBottom: 15,
    paddingVertical: 14,
  },
  botonTexto: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  deshabilitado: {
    opacity: 0.5,
  },
  tituloLista: {
    color: tema.tinta,
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 10,
    marginTop: 14,
  },
  tarjeta: {
    alignItems: 'center',
    backgroundColor: tema.superficie,
    borderColor: tema.borde,
    borderRadius: 15,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 8,
    paddingHorizontal: 13,
    paddingVertical: 12,
  },
  nombreContenedor: {
    flex: 1,
  },
  orientacion: {
    alignItems: 'center',
    marginHorizontal: 6,
  },
  flechaDireccion: {
    color: tema.primario,
    fontSize: 24,
    fontWeight: '900',
  },
  distanciaTexto: {
    color: tema.secundaria,
    fontSize: 9,
    marginTop: 1,
  },
  nombre: {
    color: tema.tinta,
    fontSize: 13,
    fontWeight: '800',
  },
  detalle: {
    color: tema.secundaria,
    fontSize: 11,
    marginTop: 4,
  },
  abrir: {
    padding: 8,
  },
  abrirTexto: {
    color: tema.primario,
    fontSize: 11,
    fontWeight: '800',
  },
});
