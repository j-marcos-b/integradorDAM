import { createElement, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { MensajeVideoAviso, validarUrlDeVideo } from './video-aviso-utils';
import type { VideoAvisoProps } from './video-aviso-utils';

export function VideoAviso({ url }: VideoAvisoProps) {
  const urlValidada = validarUrlDeVideo(url);
  const [error, setError] = useState(false);
  if (!urlValidada) return <MensajeVideoAviso>El enlace del video no es válido.</MensajeVideoAviso>;
  if (error) return <MensajeVideoAviso>El archivo de video del aviso no se puede reproducir.</MensajeVideoAviso>;

  return (
    <View style={styles.contenedor}>
      {createElement('video', {
        'aria-label': 'Video explicativo del aviso',
        controls: true,
        onError: () => setError(true),
        playsInline: true,
        preload: 'metadata',
        src: urlValidada,
        style: { aspectRatio: '16 / 9', display: 'block', width: '100%' },
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    borderRadius: 14,
    marginTop: 12,
    overflow: 'hidden',
    width: '100%',
  },
});
