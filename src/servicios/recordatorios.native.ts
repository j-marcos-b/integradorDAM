import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';

const CANAL = 'recordatorios-horarios';

export async function programarRecordatorio(
  numeroLinea: string,
  hora: string,
): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CANAL, {
      name: 'Recordatorios de horarios',
      importance: AndroidImportance.DEFAULT,
    });
  }
  const permisoActual = await Notifications.getPermissionsAsync();
  const permiso = permisoActual.granted
    ? permisoActual
    : await Notifications.requestPermissionsAsync();
  if (!permiso.granted) {
    throw new Error('No se autorizó el envío de notificaciones.');
  }

  const [horas, minutos] = hora.split(':').map(Number);
  const salida = new Date();
  salida.setHours(horas, minutos, 0, 0);
  if (salida.getTime() <= Date.now()) salida.setDate(salida.getDate() + 1);
  const recordatorio = new Date(salida.getTime() - 10 * 60 * 1000);
  if (recordatorio.getTime() <= Date.now()) {
    throw new Error('Faltan menos de 10 minutos para ese horario; elegí otro servicio.');
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: `Línea ${numeroLinea}`,
      body: `Tu servicio de las ${hora} sale pronto. Revisá el horario de tabla.`,
      data: { hora },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: recordatorio,
      ...(Platform.OS === 'android' ? { channelId: CANAL } : {}),
    },
  });
}
