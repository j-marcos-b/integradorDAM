# Transporte Paraná

Aplicación móvil de transporte urbano para Paraná, construida con React Native,
Expo SDK 58, TypeScript y Expo Router.

## Iniciar la API (obligatorio)

La app necesita que la API esté en ejecución. **La API no está incluida en este ZIP**:
descargá su repositorio por separado y asegurate de tener Docker Desktop instalado y abierto.
En PowerShell, ejecutá:

```powershell
git clone https://github.com/franco-ruisdias-uner/api-proyectos-mobile.git
cd api-proyectos-mobile\api-transporte-publico
docker compose up
```

Dejá esa terminal abierta mientras probás la app. Cuando la API esté lista, comprobá
<http://localhost:3000/salud>. Si ya tenés descargada la API, no hace falta volver a clonar:
abrí PowerShell en su carpeta `api-transporte-publico` y ejecutá `docker compose up`. Para
incorporar cambios de la API local, reconstruí la imagen con `docker compose up --build`.

## Ejecutar

En otra terminal, desde la carpeta de la app:

```bash
npm install
```

Para probar en la computadora:

```powershell
$env:EXPO_PUBLIC_API_URL = "http://localhost:3000"
npm run web
```

Para probar en un teléfono con Expo Go, conectá la computadora y el teléfono a la misma
red Wi-Fi. Reemplazá `localhost` por la dirección IPv4 de la computadora y ejecutá:

```powershell
$env:EXPO_PUBLIC_API_URL = "http://<IP-DE-TU-COMPUTADORA>:3000"
npm run start
```

Escaneá el QR que muestra Expo Go. Para verificar los tipos y correr el linter:

```bash
npm run typecheck
npm run lint
```

Para un build de producción, configurá la URL pública HTTPS de la API.
En Android, solo los builds configurados con una URL `http://` habilitan tráfico sin cifrar;
usalo únicamente para pruebas en una red local confiable.

## Incluye:

- Líneas, recorridos de ida y vuelta, paradas, avisos y horarios de tabla por
  día de la semana.
- Inicio con paradas favoritas y sus próximos horarios, avisos vigentes y mapa
  interactivo de paradas en móvil.
- Inicio con líneas favoritas; la pantalla de paradas cercanas puede indicar
  dirección y distancia con el magnetómetro del dispositivo.
- Tema claro/oscuro automático según la apariencia del dispositivo.
- Inicio de sesión, registro y favoritos sincronizados con la API.
- Reingreso biométrico opcional con huella o rostro en Android/iOS; la preferencia
  se guarda de forma segura y el token nunca se copia fuera de SecureStore.
- Mapas de los recorridos y desvíos publicados, con selección de sentido y
  acceso a los horarios de cada parada. En Android/iOS se dibujan sobre el mapa.
- Reproducción de videos adjuntos a los avisos; en móvil se habilita el caché
  administrado por el sistema para volver a verlos con menos consumo de datos.
- Paradas cercanas ordenadas por distancia con permiso de ubicación y enlaces a
  navegación externa. En web se ofrece la lista y Google Maps.
- Escáner QR con entrada manual alternativa.
- Reportes de demora, fotos, confirmaciones y cola offline; las fotos pendientes
  se conservan en el dispositivo móvil. La confirmación exitosa emite una
  respuesta háptica en los dispositivos compatibles.
- Recordatorios locales antes del horario elegido.
- Descarga de recorridos, paradas, horarios, avisos y feriados para consultar
  sin conexión. Cuando usa datos guardados, el recorrido se muestra como un
  esquema de paradas sin depender de tiles del mapa.
- Notificaciones push de avisos de líneas favoritas, con registro y baja segura
  del dispositivo en la API.

La API provista carga datos de demostración. Los horarios son de tabla; la app
no muestra la ubicación en vivo de los colectivos. Si la API no devuelve
próximos servicios, la pantalla de la parada calcula el siguiente horario desde
la tabla semanal y los feriados. El video del aviso de desvío se muestra en la
lista de avisos y en el detalle de la línea 2. En móvil se habilita el caché
administrado por el sistema para el video.

La sesión web se guarda en memoria y se pierde al recargar la página. En builds
Android/iOS el token se guarda con SecureStore. Para publicar mapas Android,
configurá la clave de Google Maps mediante la configuración segura de EAS; no
la agregues al repositorio. La autenticación biométrica requiere probarse en un
dispositivo o development build; Face ID no está disponible para probar en Expo Go.

## Clave de Google Maps (trabajo en grupo)

La clave **no** va en el repositorio. Cada integrante hace lo siguiente:

1. Copiá `.env.example` como `.env` y pegá tu clave en `MAPS_API_KEY=`.
2. Restringí la clave en Google Cloud (Apps para Android + solo *Maps SDK for Android*).
3. Probá el mapa con un development build, porque Expo Go no usa la clave propia:
   `npx expo run:android` (celular por USB) o `eas build --profile development`.
