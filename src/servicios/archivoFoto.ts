export async function archivoParaSubir(
  uri: string,
): Promise<{ archivo: Blob; nombre: string }> {
  const respuesta = await fetch(uri);
  if (!respuesta.ok) throw new Error('No se pudo leer la foto seleccionada.');
  return { archivo: await respuesta.blob(), nombre: 'reporte.jpg' };
}

export async function guardarFotoOffline(_uri: string, _id: string): Promise<string | null> {
  return null;
}

export async function borrarFotoOffline(_uri: string): Promise<void> {}
