import type {
  Aviso,
  Coordenadas,
  Horario,
  Linea,
  Parada,
  TipoDeDia,
  Usuario,
} from '../tipos';

const paleta = ['#155E75', '#D97706', '#4D7C0F', '#7C3AED', '#BE123C', '#0369A1'];
const puntos: Coordenadas[] = [
  { latitud: -31.731, longitud: -60.53 },
  { latitud: -31.735, longitud: -60.524 },
  { latitud: -31.739, longitud: -60.518 },
];
const paradasDeMuestra = ['par-101', 'par-102', 'par-103'];

export const lineasMock: Linea[] = Array.from({ length: 14 }, (_, index) => {
  const numero = String(index + 1);
  const id = `lin-${numero.padStart(2, '0')}`;
  const vuelta = [...paradasDeMuestra].reverse();

  return {
    id,
    numero,
    nombre: `Línea ${numero} · recorrido de muestra`,
    color: paleta[index % paleta.length],
    empresa: 'Empresa de muestra',
    activa: true,
    recorridos: [
      {
        sentido: 'ida',
        destino: 'Terminal de muestra',
        trazado: puntos,
        paradaIds: paradasDeMuestra,
      },
      {
        sentido: 'vuelta',
        destino: 'Barrio de muestra',
        trazado: [...puntos].reverse(),
        paradaIds: vuelta,
      },
    ],
  };
});

export const paradasMock: Parada[] = [
  {
    id: 'par-101',
    nombre: 'Alameda y Urquiza (muestra)',
    coordenadas: puntos[0],
    lineaIds: lineasMock.map((linea) => linea.id),
    sentido: 'ida',
    refugio: true,
    codigoQr: 'PARANA:par-101',
  },
  {
    id: 'par-102',
    nombre: 'Plaza central (muestra)',
    coordenadas: puntos[1],
    lineaIds: lineasMock.map((linea) => linea.id),
    sentido: 'ida',
    refugio: false,
    codigoQr: null,
  },
  {
    id: 'par-103',
    nombre: 'Terminal (muestra)',
    coordenadas: puntos[2],
    lineaIds: lineasMock.map((linea) => linea.id),
    sentido: 'ida',
    refugio: true,
    codigoQr: null,
  },
];

const tiposDeDia: TipoDeDia[] = ['habil', 'sabado', 'domingo', 'feriado'];
const horasDeMuestra = ['05:20', '10:42', '18:15'];

export const horariosMock: Horario[] = paradasMock.flatMap((parada, paradaIndex) =>
  lineasMock.flatMap((linea, lineaIndex) =>
    tiposDeDia.flatMap((tipoDeDia, tipoIndex) =>
      horasDeMuestra.map((hora, horarioIndex) => ({
        id: `hor-${lineaIndex + 1}-${paradaIndex + 1}-${tipoIndex + 1}-${horarioIndex + 1}`,
        lineaId: linea.id,
        paradaId: parada.id,
        sentido: 'ida',
        tipoDeDia,
        hora,
      })),
    ),
  ),
);

export const avisosMock: Aviso[] = [
  {
    id: 'avi-demo-01',
    titulo: 'Desvío de muestra por obras',
    detalle: 'Este aviso es ficticio y sirve para mostrar cómo se verá una novedad en una línea.',
    lineaIds: ['lin-05', 'lin-07'],
    desde: '2026-11-08T00:00:00-03:00',
    hasta: null,
    gravedad: 'desvio',
    trazadoAlternativo: puntos,
    videoUrl: null,
  },
];

export const usuarioMock: Usuario = {
  id: 'usr-demo',
  nombre: 'Pasajero de muestra',
  email: 'demo@example.com',
  lineasFavoritas: ['lin-05', 'lin-14'],
  paradasFavoritas: ['par-101'],
  avisosActivos: true,
  tema: 'sistema',
};
