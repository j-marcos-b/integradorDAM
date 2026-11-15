import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';
import {
  borrarToken,
  borrarUsuarioLocal,
  guardarBiometriaHabilitada,
  guardarUsuarioLocal,
  leerBiometriaHabilitada,
  leerToken,
  leerUsuarioLocal,
  ErrorApi,
} from '../servicios/api';
import { autenticarBiometria } from '../servicios/biometria';
import {
  ingresar,
  obtenerMiUsuario,
  registrar,
  sincronizarReportesPendientes,
} from '../servicios/lineas';
import type { Usuario } from '../tipos';

interface SesionContextoValor {
  usuario: Usuario | null;
  cargando: boolean;
  biometriaHabilitada: boolean;
  iniciar: (email: string, contrasena: string) => Promise<void>;
  crearCuenta: (nombre: string, email: string, contrasena: string) => Promise<void>;
  actualizarUsuario: (usuario: Usuario) => Promise<void>;
  configurarBiometria: (habilitada: boolean) => Promise<void>;
  desbloquearBiometria: () => Promise<boolean>;
  cerrar: () => Promise<void>;
}

const SesionContexto = createContext<SesionContextoValor | null>(null);

export function SesionProvider({ children }: PropsWithChildren) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(true);
  const [biometriaHabilitada, setBiometriaHabilitada] = useState(false);

  useEffect(() => {
    let activa = true;
    Promise.all([leerToken(), leerBiometriaHabilitada()])
      .then(async ([token, biometria]) => {
        if (activa) setBiometriaHabilitada(biometria);
        if (!activa) return;
        if (!token) return;
        if (
          biometria &&
          !(await autenticarBiometria('Desbloqueá tu cuenta de Transporte Paraná'))
        ) {
          return;
        }
        try {
          const usuarioActual = await obtenerMiUsuario();
          await guardarUsuarioLocal(usuarioActual);
          if (activa) setUsuario(usuarioActual);
        } catch (error) {
          if (error instanceof ErrorApi && error.status === 401) {
            await Promise.all([
              borrarToken(),
              borrarUsuarioLocal(),
              guardarBiometriaHabilitada(false),
            ]);
            if (activa) setBiometriaHabilitada(false);
            return;
          }
          if (error instanceof ErrorApi && error.codigo === 'ERROR_DE_RED') {
            const usuarioGuardado = await leerUsuarioLocal();
            if (usuarioGuardado) {
              if (activa) setUsuario(usuarioGuardado);
              return;
            }
          }
          throw error;
        }
      })
      .catch((error: unknown) => {
        console.error('No se pudo restaurar la sesión guardada.', error);
      })
      .finally(() => {
        if (activa) setCargando(false);
      });
    return () => {
      activa = false;
    };
  }, []);

  useEffect(() => {
    if (!usuario) return;
    const intentarSincronizar = () => {
      void sincronizarReportesPendientes().catch((error: unknown) => {
        if (error instanceof ErrorApi && error.codigo === 'ERROR_DE_RED') return;
        console.error('No se pudieron sincronizar los reportes pendientes.', error);
      });
    };
    intentarSincronizar();
    const temporizador = setInterval(intentarSincronizar, 30_000);
    return () => clearInterval(temporizador);
  }, [usuario]);

  const iniciar = useCallback(async (email: string, contrasena: string) => {
    setUsuario(await ingresar(email, contrasena));
  }, []);

  const crearCuenta = useCallback(
    async (nombre: string, email: string, contrasena: string) => {
      setUsuario(await registrar(nombre, email, contrasena));
    },
    [],
  );

  const actualizarUsuario = useCallback(async (actualizado: Usuario) => {
    await guardarUsuarioLocal(actualizado);
    setUsuario(actualizado);
  }, []);

  const configurarBiometria = useCallback(async (habilitada: boolean) => {
    await guardarBiometriaHabilitada(habilitada);
    setBiometriaHabilitada(habilitada);
  }, []);

  const desbloquearBiometria = useCallback(async () => {
    if (!biometriaHabilitada) return false;
    setCargando(true);
    try {
      if (!(await autenticarBiometria('Desbloqueá tu cuenta de Transporte Paraná'))) {
        return false;
      }
      try {
        const usuarioActual = await obtenerMiUsuario();
        await guardarUsuarioLocal(usuarioActual);
        setUsuario(usuarioActual);
        return true;
      } catch (errorApi) {
        if (
          errorApi instanceof ErrorApi &&
          (errorApi.status === 401 || errorApi.codigo === 'ERROR_DE_RED')
        ) {
          const usuarioGuardado = await leerUsuarioLocal();
          if (usuarioGuardado) {
            setUsuario(usuarioGuardado);
            return true;
          }
        }
        throw errorApi;
      }
    } catch (error) {
      if (error instanceof ErrorApi && error.status === 401) {
        return false;
      }
      throw error;
    } finally {
      setCargando(false);
    }
  }, [biometriaHabilitada]);

  const cerrar = useCallback(async () => {
    await borrarToken();
    setUsuario(null);
  }, []);

  const valor = useMemo(
    () => ({
      usuario,
      cargando,
      biometriaHabilitada,
      iniciar,
      crearCuenta,
      actualizarUsuario,
      configurarBiometria,
      desbloquearBiometria,
      cerrar,
    }),
    [
      usuario,
      cargando,
      biometriaHabilitada,
      iniciar,
      crearCuenta,
      actualizarUsuario,
      configurarBiometria,
      desbloquearBiometria,
      cerrar,
    ],
  );

  return <SesionContexto.Provider value={valor}>{children}</SesionContexto.Provider>;
}

export function useSesion(): SesionContextoValor {
  const contexto = useContext(SesionContexto);
  if (!contexto) throw new Error('useSesion debe usarse dentro de SesionProvider.');
  return contexto;
}
