import type {
  Aviso,
  Horario,
  Linea,
  MotivoDemora,
  Parada,
  ReporteDeDemora,
  Usuario,
} from '../tipos';
import type { ArchivoSubido, Feriado } from '../tipos/api';
import {
  ErrorApi,
  guardarUsuarioLocal,
  enviarAutorizado,
  guardarToken,
  obtenerLista,
  obtenerUno,
  solicitarApi,
} from './api';
import {
  listarReportesPendientes,
  quitarReportePendiente,
  guardarReportePendiente,
} from './local';
import type { RegistroPendiente } from './local.types';
import { archivoParaSubir, borrarFotoOffline, guardarFotoOffline } from './archivoFoto';

export async function obtenerLineas(): Promise<Linea[]> {
  const respuesta = await obtenerLista<Linea>('/lineas?porPagina=100');
  return respuesta.datos;
}

export async function obtenerLinea(id: string): Promise<Linea> {
  const respuesta = await obtenerUno<Linea>(`/lineas/${encodeURIComponent(id)}`);
  return respuesta.datos;
}

export async function obtenerParadas(): Promise<Parada[]> {
  const respuesta = await obtenerLista<Parada>('/paradas?porPagina=1000');
  return respuesta.datos;
}

export async function obtenerParada(id: string): Promise<Parada> {
  const respuesta = await obtenerUno<Parada>(`/paradas/${encodeURIComponent(id)}`);
  return respuesta.datos;
}

export async function resolverQr(codigo: string): Promise<Parada> {
  const respuesta = await obtenerUno<Parada>(
    `/paradas/qr/${encodeURIComponent(codigo)}`,
  );
  return respuesta.datos;
}

export async function obtenerHorariosDeParada(paradaId: string): Promise<Horario[]> {
  const parametros = new URLSearchParams({
    paradaId,
    porPagina: '5000',
  });
  const respuesta = await obtenerLista<Horario>(`/horarios?${parametros.toString()}`);
  return respuesta.datos;
}

export async function obtenerProximosDeParada(
  paradaId: string,
  cantidad = 3,
): Promise<Horario[]> {
  const parametros = new URLSearchParams({ cantidad: String(cantidad) });
  const respuesta = await obtenerLista<Horario>(
    `/paradas/${encodeURIComponent(paradaId)}/proximos?${parametros.toString()}`,
  );
  return respuesta.datos;
}

export async function obtenerFeriados(anio: number): Promise<Feriado[]> {
  const respuesta = await obtenerLista<Feriado>(`/feriados?anio=${anio}`);
  return respuesta.datos;
}

export async function descargarDatosSinConexion(
  alProgresar: (completadas: number, total: number) => void,
): Promise<void> {
  const [lineas, paradas] = await Promise.all([obtenerLineas(), obtenerParadas()]);
  const tareas: (() => Promise<unknown>)[] = [
    () => obtenerFeriados(new Date().getFullYear()),
    () => obtenerFeriados(new Date().getFullYear() + 1),
    () => obtenerAvisosVigentes(),
    ...lineas.map((linea) => () => obtenerLinea(linea.id)),
    ...paradas.flatMap((parada) => [
      () => obtenerProximosDeParada(parada.id),
      () => obtenerHorariosDeParada(parada.id),
    ]),
  ];
  let siguiente = 0;
  let completadas = 0;
  const errores: unknown[] = [];
  const trabajadores = Array.from({ length: Math.min(4, tareas.length) }, async () => {
    while (siguiente < tareas.length) {
      const tarea = tareas[siguiente++];
      try {
        await tarea();
      } catch (error) {
        errores.push(error);
      } finally {
        alProgresar(++completadas, tareas.length);
      }
    }
  });
  await Promise.all(trabajadores);
  if (errores.length) throw errores[0];
}

export async function obtenerAvisosVigentes(lineaId?: string): Promise<Aviso[]> {
  const parametros = new URLSearchParams({ estado: 'vigentes', porPagina: '100' });
  if (lineaId) parametros.set('lineaId', lineaId);
  const respuesta = await obtenerLista<Aviso>(`/avisos?${parametros.toString()}`);
  return respuesta.datos;
}

export async function ingresar(email: string, contrasena: string): Promise<Usuario> {
  const respuesta = await solicitarApi<{ datos: { token: string; usuario: Usuario } }>(
    '/auth/ingreso',
    { method: 'POST', body: { email, contrasena } },
  );
  await guardarUsuarioLocal(respuesta.datos.usuario);
  await guardarToken(respuesta.datos.token);
  return respuesta.datos.usuario;
}

export async function registrar(
  nombre: string,
  email: string,
  contrasena: string,
): Promise<Usuario> {
  const respuesta = await solicitarApi<{ datos: { token: string; usuario: Usuario } }>(
    '/auth/registro',
    { method: 'POST', body: { nombre, email, contrasena } },
  );
  await guardarUsuarioLocal(respuesta.datos.usuario);
  await guardarToken(respuesta.datos.token);
  return respuesta.datos.usuario;
}

export async function obtenerMiUsuario(): Promise<Usuario> {
  const respuesta = await solicitarApi<{ datos: Usuario }>('/yo', { autorizado: true });
  return respuesta.datos;
}

export async function cambiarFavorito(
  tipo: 'lineas' | 'paradas',
  id: string,
  favorito: boolean,
): Promise<Usuario> {
  const recurso = tipo === 'lineas' ? 'lineas' : 'paradas';
  const respuesta = await enviarAutorizado<{ datos: Usuario }>(
    `/yo/${recurso}-favoritas/${encodeURIComponent(id)}`,
    favorito ? 'PUT' : 'DELETE',
  );
  return respuesta?.datos ?? (await obtenerMiUsuario());
}

export async function listarReportes(paradaId: string): Promise<ReporteDeDemora[]> {
  const parametros = new URLSearchParams({ paradaId, porPagina: '100' });
  const respuesta = await obtenerLista<ReporteDeDemora>(
    `/reportes-demora?${parametros.toString()}`,
  );
  return respuesta.datos;
}

export async function confirmarReporte(id: string): Promise<ReporteDeDemora> {
  const respuesta = await enviarAutorizado<{ datos: ReporteDeDemora }>(
    `/reportes-demora/${encodeURIComponent(id)}/confirmaciones`,
    'POST',
  );
  return respuesta.datos;
}

async function subirFoto(uri: string): Promise<string> {
  const formulario = new FormData();
  const foto = await archivoParaSubir(uri);
  formulario.append('archivo', foto.archivo, foto.nombre);
  const respuesta = await enviarAutorizado<{ datos: ArchivoSubido }>(
    '/archivos',
    'POST',
    formulario,
  );
  return respuesta.datos.url;
}

export async function crearReporte(datos: {
  id: string;
  lineaId: string;
  paradaId: string;
  motivo: MotivoDemora;
  comentario: string | null;
  fotoUri: string | null;
  fechaHora: string;
}): Promise<
  | { estado: 'enviado'; reporte: ReporteDeDemora }
  | { estado: 'pendiente'; fotoOmitida: boolean }
> {
  let fotoUri = datos.fotoUri;
  try {
    if (fotoUri) fotoUri = await subirFoto(fotoUri);
    const respuesta = await enviarAutorizado<{ datos: ReporteDeDemora }>(
      '/reportes-demora',
      'POST',
      { ...datos, fotoUri },
    );
    return { estado: 'enviado', reporte: respuesta.datos };
  } catch (error) {
    if (!(error instanceof ErrorApi) || error.codigo !== 'ERROR_DE_RED') throw error;
    const fotoGuardada = datos.fotoUri
      ? await guardarFotoOffline(datos.fotoUri, datos.id)
      : null;
    await guardarReportePendiente({ ...datos, fotoUri: fotoGuardada });
    return { estado: 'pendiente', fotoOmitida: Boolean(datos.fotoUri && !fotoGuardada) };
  }
}

export async function sincronizarReportesPendientes(): Promise<void> {
  const pendientes: RegistroPendiente[] = await listarReportesPendientes();
  for (const reporte of pendientes) {
    let fotoUri = reporte.fotoUri;
    if (fotoUri && !fotoUri.startsWith('http')) fotoUri = await subirFoto(fotoUri);
    await enviarAutorizado('/reportes-demora', 'POST', { ...reporte, fotoUri });
    await quitarReportePendiente(reporte.id);
    if (reporte.fotoUri && !reporte.fotoUri.startsWith('http')) {
      await borrarFotoOffline(reporte.fotoUri);
    }
  }
}

export async function abrirMapaDeParada(parada: Parada): Promise<void> {
  const url = `https://www.google.com/maps/dir/?api=1&destination=${parada.coordenadas.latitud},${parada.coordenadas.longitud}&travelmode=walking`;
  await import('expo-linking').then(({ openURL }) => openURL(url));
}
