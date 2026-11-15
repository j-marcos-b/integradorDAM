import type { Usuario } from './index';

export interface Meta {
  total: number;
  pagina: number;
  porPagina: number;
}

export interface RespuestaLista<T> {
  datos: T[];
  meta: Meta;
}

export interface RespuestaUno<T> {
  datos: T;
  meta: null;
}

export interface RespuestaError {
  error: {
    codigo: string;
    mensaje: string;
  };
}

export interface Feriado {
  fecha: string;
  nombre: string;
}

export interface Sesion {
  token: string;
  usuario: Usuario;
}

export interface ArchivoSubido {
  url: string;
  tipo: 'imagen' | 'audio' | 'video';
  bytes: number;
}
