import { Appearance, DynamicColorIOS, Platform } from 'react-native';
import type { ColorValue } from 'react-native';

function colorAdaptable(
  variable: string,
  claro: string,
  oscuro: string,
): ColorValue {
  if (Platform.OS === 'web') return `var(--${variable})`;
  if (Platform.OS === 'ios') return DynamicColorIOS({ light: claro, dark: oscuro });
  if (Platform.OS === 'android') return Appearance.getColorScheme() === 'dark' ? oscuro : claro;
  return claro;
}

export const tema = {
  fondo: colorAdaptable('color-fondo', '#F6F5F0', '#101B21'),
  superficie: colorAdaptable('color-superficie', '#FFFFFF', '#18262D'),
  tinta: colorAdaptable('color-tinta', '#172A35', '#EDF3F4'),
  secundaria: colorAdaptable('color-secundaria', '#68777C', '#AAB8BC'),
  borde: colorAdaptable('color-borde', '#E4E7E2', '#35464D'),
  primario: colorAdaptable('color-primario', '#155E75', '#6BC4D1'),
  primarioFondo: '#155E75',
  primarioSuave: colorAdaptable('color-primario-suave', '#E2F0F1', '#223840'),
  acento: colorAdaptable('color-acento', '#F1B95B', '#F1B95B'),
  alerta: colorAdaptable('color-alerta', '#8E3B2E', '#F0A08D'),
  alertaSuave: colorAdaptable('color-alerta-suave', '#F9EAE2', '#3B2827'),
  avisoFondo: colorAdaptable('color-aviso-fondo', '#FFF0D6', '#382F20'),
  avisoTexto: colorAdaptable('color-aviso-texto', '#76501A', '#F2D59B'),
};
