import { Directory, File, Paths } from 'expo-file-system';

export async function archivoParaSubir(
  uri: string,
): Promise<{ archivo: Blob; nombre: string }> {
  const archivo = new File(uri);
  return { archivo, nombre: archivo.name };
}

export async function guardarFotoOffline(uri: string, id: string): Promise<string> {
  const origen = new File(uri);
  const extension = origen.name.split('.').pop()?.toLowerCase();
  const extensionSegura =
    extension && ['jpg', 'jpeg', 'png', 'webp'].includes(extension) ? extension : 'jpg';
  const directorio = new Directory(Paths.document, 'reportes-pendientes');
  if (!directorio.exists) directorio.create();
  const destino = new File(directorio, `${id}.${extensionSegura}`);
  await origen.copy(destino);
  return destino.uri;
}

export async function borrarFotoOffline(uri: string): Promise<void> {
  const foto = new File(uri);
  if (foto.exists) foto.delete();
}
