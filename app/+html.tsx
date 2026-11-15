import { ScrollViewStyleReset, useServerDocumentContext } from 'expo-router/html';
import type { ReactNode } from 'react';

export default function Root({ children }: { children: ReactNode }) {
  const { htmlAttributes, bodyAttributes, headNodes, bodyNodes } = useServerDocumentContext();

  return (
    <html {...htmlAttributes} lang="es">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        {headNodes}

        <ScrollViewStyleReset />

        <style dangerouslySetInnerHTML={{ __html: responsiveBackground }} />
      </head>
      <body {...bodyAttributes}>
        {children}
        {bodyNodes}
      </body>
    </html>
  );
}

const responsiveBackground = `
:root {
  color-scheme: light;
  --color-fondo: #F6F5F0;
  --color-superficie: #FFFFFF;
  --color-tinta: #172A35;
  --color-secundaria: #68777C;
  --color-borde: #E4E7E2;
  --color-primario: #155E75;
  --color-primario-suave: #E2F0F1;
  --color-acento: #F1B95B;
  --color-alerta: #8E3B2E;
  --color-alerta-suave: #F9EAE2;
  --color-aviso-fondo: #FFF0D6;
  --color-aviso-texto: #76501A;
}
body {
  background-color: var(--color-fondo);
}
@media (prefers-color-scheme: dark) {
  :root {
    color-scheme: dark;
    --color-fondo: #101B21;
    --color-superficie: #18262D;
    --color-tinta: #EDF3F4;
    --color-secundaria: #AAB8BC;
    --color-borde: #35464D;
    --color-primario: #6BC4D1;
    --color-primario-suave: #223840;
    --color-acento: #F1B95B;
    --color-alerta: #F0A08D;
    --color-alerta-suave: #3B2827;
    --color-aviso-fondo: #382F20;
    --color-aviso-texto: #F2D59B;
  }
  body {
    background-color: var(--color-fondo);
  }
}`;
