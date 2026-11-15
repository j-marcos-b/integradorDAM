import type { RegistroPendiente } from './local.types';

const cacheWebKey = (clave: string) => `transporte:cache:${clave}`;

export async function guardarCache(clave: string, valor: unknown): Promise<void> {
  const json = JSON.stringify({ valor, actualizadoEn: new Date().toISOString() });
  window.localStorage.setItem(cacheWebKey(clave), json);
}

export async function leerCache<T>(clave: string): Promise<{ valor: T; actualizadoEn: string } | null> {
  const raw = window.localStorage.getItem(cacheWebKey(clave));
  if (!raw) return null;
  return JSON.parse(raw) as { valor: T; actualizadoEn: string };
}

export async function guardarReportePendiente(reporte: RegistroPendiente): Promise<void> {
  const pendientes = await listarReportesPendientes();
  window.localStorage.setItem(
    'transporte:reportes-pendientes',
    JSON.stringify([...pendientes.filter((item) => item.id !== reporte.id), reporte]),
  );
}

export async function listarReportesPendientes(): Promise<RegistroPendiente[]> {
  const raw = window.localStorage.getItem('transporte:reportes-pendientes');
  return raw ? (JSON.parse(raw) as RegistroPendiente[]) : [];
}

export async function quitarReportePendiente(id: string): Promise<void> {
  const pendientes = await listarReportesPendientes();
  window.localStorage.setItem(
    'transporte:reportes-pendientes',
    JSON.stringify(pendientes.filter((item) => item.id !== id)),
  );
}
