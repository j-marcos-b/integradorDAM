import * as LocalAuthentication from 'expo-local-authentication';

export async function disponibilidadBiometrica(): Promise<string | null> {
  if (!(await LocalAuthentication.hasHardwareAsync())) {
    return 'Este dispositivo no tiene lector de huella o reconocimiento facial.';
  }
  if (!(await LocalAuthentication.isEnrolledAsync())) {
    return 'Configurá tu huella o rostro en los ajustes del dispositivo antes de activarlo.';
  }
  return null;
}

export async function autenticarBiometria(mensaje: string): Promise<boolean> {
  const errorDisponibilidad = await disponibilidadBiometrica();
  if (errorDisponibilidad) throw new Error(errorDisponibilidad);

  const resultado = await LocalAuthentication.authenticateAsync({
    promptMessage: mensaje,
    cancelLabel: 'Cancelar',
    disableDeviceFallback: false,
  });
  return resultado.success;
}
