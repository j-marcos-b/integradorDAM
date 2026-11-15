import MapView, { Marker, Polyline } from 'react-native-maps';
import type { Region } from 'react-native-maps';
import type { MapaRecorridoProps } from './MapaRecorrido';

export function MapaRecorrido(props: MapaRecorridoProps) {
  const { trazado, paradas, color, alSeleccionar } = props;
  const puntos = trazado.length
    ? trazado
    : paradas.map((parada) => parada.coordenadas);
  const latitudes = puntos.map((punto) => punto.latitud);
  const longitudes = puntos.map((punto) => punto.longitud);
  const norte = latitudes.length ? Math.max(...latitudes) : -31.7413;
  const sur = latitudes.length ? Math.min(...latitudes) : -31.7413;
  const este = longitudes.length ? Math.max(...longitudes) : -60.5115;
  const oeste = longitudes.length ? Math.min(...longitudes) : -60.5115;
  const region: Region = {
    latitude: (norte + sur) / 2,
    longitude: (este + oeste) / 2,
    latitudeDelta: Math.max(0.01, (norte - sur) * 1.4),
    longitudeDelta: Math.max(0.01, (este - oeste) * 1.4),
  };

  const paso = Math.max(1, Math.floor(puntos.length / 6));
  const indicesConFlecha: number[] = [];
  for (let i = paso; i < puntos.length; i += paso) {
    indicesConFlecha.push(i);
  }
  if (puntos.length > 1 && !indicesConFlecha.includes(puntos.length - 1)) {
    indicesConFlecha.push(puntos.length - 1);
  }

  return (
    <MapView initialRegion={region} style={{ height: 260, width: '100%' }}>
      {puntos.length > 1 ? (
        <Polyline
          coordinates={puntos.map((p) => ({ latitude: p.latitud, longitude: p.longitud }))}
          strokeColor={color}
          strokeWidth={5}
        />
      ) : null}

      {puntos.length > 0 ? (
        <Marker
          key="inicio-recorrido"
          coordinate={{ latitude: puntos[0].latitud, longitude: puntos[0].longitud }}
          title="Inicio"
          pinColor="green"
        />
      ) : null}

      {indicesConFlecha.map((indice) => {
        const punto = puntos[indice];
        const esFinal = indice === puntos.length - 1;
        return (
          <Marker
            key={`flecha-${indice}`}
            coordinate={{ latitude: punto.latitud, longitude: punto.longitud }}
            title={esFinal ? 'Fin ➤' : '▶'}
            pinColor={esFinal ? 'red' : color}
          />
        );
      })}

      {paradas.map((parada) => (
        <Marker
          key={parada.id}
          coordinate={{ latitude: parada.coordenadas.latitud, longitude: parada.coordenadas.longitud }}
          onPress={() => alSeleccionar(parada)}
          title={parada.nombre}
          description="Tocá para ver los horarios"
        />
      ))}
    </MapView>
  );
}
