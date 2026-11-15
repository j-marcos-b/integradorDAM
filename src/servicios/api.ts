import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import type {
  RespuestaError,
  RespuestaLista,
  RespuestaUno,
  Sesion,
} from '../tipos/api';
import type { Usuario } from '../tipos';
import { leerCache, guardarCache } from './local';

const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000').replace(
  /\/+$/,
  '',
);
const API_TIMEOUT_MS = 15_000;

export class ErrorApi extends Error {
  constructor(
    message: string,
    readonly codigo: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ErrorApi';
  }
}

const TOKEN_KEY = 'sesion_transporte_token';
const USUARIO_KEY = 'sesion_transporte_usuario';
const BIOMETRIA_KEY = 'sesion_transporte_biometria';
let tokenWeb: string | null = null;
let usuarioWeb: Usuario | null = null;
const datosCacheados = new WeakMap<object, string>();

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null;
}

function esUsuario(valor: unknown): valor is Usuario {
  return (
    esObjeto(valor) &&
    typeof valor.id === 'string' &&
    typeof valor.nombre === 'string' &&
    typeof valor.email === 'string' &&
    Array.isArray(valor.lineasFavoritas) &&
    valor.lineasFavoritas.every((id) => typeof id === 'string') &&
    Array.isArray(valor.paradasFavoritas) &&
    valor.paradasFavoritas.every((id) => typeof id === 'string') &&
    typeof valor.avisosActivos === 'boolean' &&
    (valor.tema === 'claro' || valor.tema === 'oscuro' || valor.tema === 'sistema')
  );
}

export function mensajeDeError(error: unknown, predeterminado: string): string {
  return error instanceof Error ? error.message : predeterminado;
}

function marcarDatosCacheados(valor: unknown, actualizadoEn: string): void {
  if (!esObjeto(valor)) return;
  datosCacheados.set(valor, actualizadoEn);
  if ('datos' in valor && esObjeto(valor.datos)) {
    datosCacheados.set(valor.datos, actualizadoEn);
  }
}

export function fechaActualizacionCache(valor: unknown): string | null {
  return esObjeto(valor) ? (datosCacheados.get(valor) ?? null) : null;
}

export async function leerToken(): Promise<string | null> {
  return Platform.OS === 'web' ? tokenWeb : SecureStore.getItemAsync(TOKEN_KEY);
}

export async function guardarToken(token: string): Promise<void> {
  if (Platform.OS === 'web') {
    tokenWeb = token;
    return;
  }
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function borrarToken(): Promise<void> {
  if (Platform.OS === 'web') {
    tokenWeb = null;
    return;
  }
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function leerUsuarioLocal(): Promise<Usuario | null> {
  if (Platform.OS === 'web') return usuarioWeb;
  const json = await SecureStore.getItemAsync(USUARIO_KEY);
  if (!json) return null;
  const usuario: unknown = JSON.parse(json);
  if (!esUsuario(usuario)) {
    throw new ErrorApi('El perfil guardado localmente no es válido.', 'SESION_LOCAL_INVALIDA', 0);
  }
  return usuario;
}

export async function guardarUsuarioLocal(usuario: Usuario): Promise<void> {
  if (Platform.OS === 'web') {
    usuarioWeb = usuario;
    return;
  }
  await SecureStore.setItemAsync(USUARIO_KEY, JSON.stringify(usuario));
}

export async function borrarUsuarioLocal(): Promise<void> {
  if (Platform.OS === 'web') {
    usuarioWeb = null;
    return;
  }
  await SecureStore.deleteItemAsync(USUARIO_KEY);
}

export async function leerBiometriaHabilitada(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  return (await SecureStore.getItemAsync(BIOMETRIA_KEY)) === 'true';
}

export async function guardarBiometriaHabilitada(habilitada: boolean): Promise<void> {
  if (Platform.OS === 'web') return;
  if (habilitada) {
    await SecureStore.setItemAsync(BIOMETRIA_KEY, 'true');
  } else {
    await SecureStore.deleteItemAsync(BIOMETRIA_KEY);
  }
}

export async function solicitarApi<T>(
  ruta: string,
  opciones: {
    method?: string;
    body?: unknown;
    autorizado?: boolean;
    headers?: HeadersInit;
  } = {},
): Promise<T> {
  let respuesta: Response;
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), API_TIMEOUT_MS);

  try {
    const token = opciones.autorizado ? await leerToken() : null;
    const headers = new Headers(opciones.headers);
    headers.set('Accept', 'application/json');
    if (opciones.body !== undefined && !(opciones.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }
    if (token) headers.set('Authorization', `Bearer ${token}`);

    respuesta = await fetch(`${API_BASE_URL}${ruta}`, {
      method: opciones.method ?? 'GET',
      headers,
      body:
        opciones.body === undefined
          ? undefined
          : opciones.body instanceof FormData
            ? opciones.body
            : JSON.stringify(opciones.body),
      signal: controlador.signal,
    });
  } catch {
    if (controlador.signal.aborted) {
      clearTimeout(temporizador);
      throw new ErrorApi(
        `La API no respondió en 15 segundos (${API_BASE_URL}). Comprobá que el celular pueda abrir esa dirección y que la API esté iniciada.`,
        'TIEMPO_DE_ESPERA',
        0,
      );
    }
    const errorRed = new ErrorApi(
      `No se pudo conectar con la API (${API_BASE_URL}). Comprobá que esté iniciada y que la dirección sea correcta.`,
      'ERROR_DE_RED',
      0,
    );
    clearTimeout(temporizador);
    if ((opciones.method ?? 'GET') !== 'GET') throw errorRed;
    if ((opciones.method ?? 'GET') === 'GET' && !opciones.autorizado) {
      const cache = await leerCache<T>(ruta);
      if (cache) {
        marcarDatosCacheados(cache.valor, cache.actualizadoEn);
        return cache.valor;
      }
    }
    throw errorRed;
  }
  clearTimeout(temporizador);

  if (respuesta.status === 204) return undefined as T;

  let cuerpo: unknown;
  try {
    cuerpo = await respuesta.json();
  } catch {
    throw new ErrorApi(
      'La API devolvió una respuesta que no se pudo interpretar.',
      'RESPUESTA_INVALIDA',
      respuesta.status,
    );
  }

  if (!respuesta.ok) {
    const posibleError = esObjeto(cuerpo) ? cuerpo.error : undefined;
    const errorApi = esObjeto(posibleError)
      ? (posibleError as RespuestaError['error'])
      : undefined;
    if (errorApi && typeof errorApi.mensaje === 'string') {
      throw new ErrorApi(
        errorApi.mensaje,
        typeof errorApi.codigo === 'string' ? errorApi.codigo : 'ERROR_API',
        respuesta.status,
      );
    }

    throw new ErrorApi('La API no pudo completar la solicitud.', 'ERROR_API', respuesta.status);
  }

  if (!esObjeto(cuerpo) || !('datos' in cuerpo)) {
    throw new ErrorApi(
      'La API devolvió una respuesta con un formato inesperado.',
      'RESPUESTA_INVALIDA',
      respuesta.status,
    );
  }

  const resultado = cuerpo as T;
  if ((opciones.method ?? 'GET') === 'GET' && !opciones.autorizado) {
    await guardarCache(ruta, resultado);
  }
  return resultado;
}

export async function obtenerLista<T>(ruta: string): Promise<RespuestaLista<T>> {
  return solicitarApi<RespuestaLista<T>>(ruta);
}

export async function obtenerUno<T>(ruta: string): Promise<RespuestaUno<T>> {
  return solicitarApi<RespuestaUno<T>>(ruta);
}

export async function autenticar(
  ruta: '/auth/ingreso' | '/auth/registro',
  datos: Record<string, string>,
): Promise<Sesion> {
  const respuesta = await solicitarApi<{ datos: Sesion }>(ruta, {
    method: 'POST',
    body: datos,
  });
  await guardarToken(respuesta.datos.token);
  return respuesta.datos;
}

export async function obtenerUsuarioAutenticado() {
  const respuesta = await solicitarApi<{ datos: import('../tipos').Usuario }>('/yo', {
    autorizado: true,
  });
  return respuesta.datos;
}

export async function enviarAutorizado<T>(
  ruta: string,
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  body?: unknown,
): Promise<T> {
  return solicitarApi<T>(ruta, { method, body, autorizado: true });
}

export { API_BASE_URL };
