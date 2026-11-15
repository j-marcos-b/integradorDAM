export async function disponibilidadBiometrica(): Promise<string | null> {
  return 'El acceso biométrico está disponible únicamente en Android y iOS.';
}

export async function autenticarBiometria(_mensaje: string): Promise<boolean> {
  return false;
}
