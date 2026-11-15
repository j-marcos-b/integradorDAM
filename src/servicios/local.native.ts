import * as SQLite from 'expo-sqlite';
import type { CacheFila, RegistroPendiente } from './local.types';

const DB_NAME = 'transporte-parana.db';
let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function baseDatos(): Promise<SQLite.SQLiteDatabase> {
  dbPromise ??= SQLite.openDatabaseAsync(DB_NAME).then(async (db) => {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS cache_api (
        clave TEXT PRIMARY KEY NOT NULL,
        valor TEXT NOT NULL,
        actualizado_en TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS reportes_pendientes (
        id TEXT PRIMARY KEY NOT NULL,
        linea_id TEXT NOT NULL,
        parada_id TEXT NOT NULL,
        motivo TEXT NOT NULL,
        comentario TEXT,
        foto_uri TEXT,
        fecha_hora TEXT NOT NULL
      );
    `);
    return db;
  });
  return dbPromise;
}

export async function guardarCache(clave: string, valor: unknown): Promise<void> {
  const actualizadoEn = new Date().toISOString();
  const db = await baseDatos();
  await db.runAsync(
    `INSERT INTO cache_api (clave, valor, actualizado_en) VALUES (?, ?, ?)
     ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor, actualizado_en = excluded.actualizado_en`,
    clave,
    JSON.stringify(valor),
    actualizadoEn,
  );
}

export async function leerCache<T>(clave: string): Promise<{ valor: T; actualizadoEn: string } | null> {
  const db = await baseDatos();
  const fila = await db.getFirstAsync<CacheFila>(
    'SELECT valor, actualizado_en FROM cache_api WHERE clave = ?',
    clave,
  );
  return fila
    ? { valor: JSON.parse(fila.valor) as T, actualizadoEn: fila.actualizado_en }
    : null;
}

export async function guardarReportePendiente(reporte: RegistroPendiente): Promise<void> {
  const db = await baseDatos();
  await db.runAsync(
    `INSERT OR REPLACE INTO reportes_pendientes
      (id, linea_id, parada_id, motivo, comentario, foto_uri, fecha_hora)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
    reporte.id,
    reporte.lineaId,
    reporte.paradaId,
    reporte.motivo,
    reporte.comentario,
    reporte.fotoUri,
    reporte.fechaHora,
  );
}

export async function listarReportesPendientes(): Promise<RegistroPendiente[]> {
  const db = await baseDatos();
  const filas = await db.getAllAsync<{
    id: string;
    linea_id: string;
    parada_id: string;
    motivo: string;
    comentario: string | null;
    foto_uri: string | null;
    fecha_hora: string;
  }>('SELECT * FROM reportes_pendientes ORDER BY fecha_hora');
  return filas.map((fila) => ({
    id: fila.id,
    lineaId: fila.linea_id,
    paradaId: fila.parada_id,
    motivo: fila.motivo,
    comentario: fila.comentario,
    fotoUri: fila.foto_uri,
    fechaHora: fila.fecha_hora,
  }));
}

export async function quitarReportePendiente(id: string): Promise<void> {
  const db = await baseDatos();
  await db.runAsync('DELETE FROM reportes_pendientes WHERE id = ?', id);
}
