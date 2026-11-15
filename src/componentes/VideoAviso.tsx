import { MensajeVideoAviso, validarUrlDeVideo } from './video-aviso-utils';
import type { VideoAvisoProps } from './video-aviso-utils';

export function VideoAviso({ url }: VideoAvisoProps) {
  return validarUrlDeVideo(url) ? (
    <MensajeVideoAviso>El reproductor de video no está disponible en esta plataforma.</MensajeVideoAviso>
  ) : (
    <MensajeVideoAviso>El enlace del video no es válido.</MensajeVideoAviso>
  );
}
