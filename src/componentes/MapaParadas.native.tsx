import MapView, { Marker } from 'react-native-maps';
import type { Region } from 'react-native-maps';
import type { MapaParadasProps } from './MapaParadas';

export function MapaParadas({ paradas, ubicacion, alSeleccionar }: MapaParadasProps) {
  const centro = ubicacion ?? paradas[0]?.coordenadas ?? { latitud: -31.7413, longitud: -60.5115 };
  const region: Region = {
    latitude: centro.latitud,
    longitude: centro.longitud,
    latitudeDelta: 0.045,
    longitudeDelta: 0.045,
  };
  return (
    <MapView
      key={`${centro.latitud}:${centro.longitud}`}
      initialRegion={region}
      showsUserLocation={Boolean(ubicacion)}
      style={{ height: 330, width: '100%' }}
    >
      {paradas.map((parada) => (
        <Marker
          key={parada.id}
          coordinate={{
            latitude: parada.coordenadas.latitud,
            longitude: parada.coordenadas.longitud,
          }}
          onPress={() => alSeleccionar(parada)}
          title={parada.nombre}
          description="Tocá para ver los horarios"
        />
      ))}
    </MapView>
  );
}
