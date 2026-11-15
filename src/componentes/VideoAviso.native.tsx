import { useEvent } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { StyleSheet } from 'react-native';
import { MensajeVideoAviso, validarUrlDeVideo } from './video-aviso-utils';
import type { VideoAvisoProps } from './video-aviso-utils';

export function VideoAviso({ url }: VideoAvisoProps) {
  const urlValidada = validarUrlDeVideo(url);
  const player = useVideoPlayer(
    urlValidada ? { uri: urlValidada, useCaching: true } : null,
    (videoPlayer) => {
      videoPlayer.loop = false;
    },
  );
  const { status } = useEvent(player, 'statusChange', { status: player.status });

  if (!urlValidada) return <MensajeVideoAviso>El enlace del video no es válido.</MensajeVideoAviso>;
  if (status === 'error') {
    return <MensajeVideoAviso>No se pudo cargar el video del aviso.</MensajeVideoAviso>;
  }

  return (
    <VideoView
      accessibilityLabel="Video explicativo del aviso"
      contentFit="contain"
      nativeControls
      player={player}
      style={styles.video}
    />
  );
}

const styles = StyleSheet.create({
  video: {
    aspectRatio: 16 / 9,
    borderRadius: 14,
    marginTop: 12,
    overflow: 'hidden',
    width: '100%',
  },
});
