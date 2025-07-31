
# Informe General de la Aplicación "Chords"

## 1. Descripción General

"Chords" es una aplicación web interactiva diseñada para músicos y aficionados a la música. Su propósito principal es facilitar la visualización, análisis, composición y transposición de acordes de canciones. La aplicación se divide en tres modos principales:

*   **Visualizador:** Permite a los usuarios seleccionar una nota raíz, un tipo de acorde, inversiones y alteraciones para ver su representación en un piano virtual y escuchar cómo suena.
*   **Extractor:** Los usuarios pueden pegar la letra y los acordes de una canción en formato de texto plano. La aplicación analiza este texto, extrae los acordes y los muestra de forma interactiva sobre la letra. Desde aquí, los acordes pueden ser transpuestos y enviados al modo "Compositor".
*   **Compositor:** Este modo ofrece un entorno para editar y componer canciones. Los usuarios pueden añadir, eliminar y modificar acordes directamente sobre la letra. También permite la transposición de la canción completa y la exportación/importación de la misma en un formato propio (`.chordsong`).

La aplicación cuenta con un motor de audio que reproduce los acordes y las notas individuales, y una interfaz de usuario pulida que incluye un inspector de acordes modal para una edición detallada.

## 2. Tecnologías Utilizadas

La aplicación está construida con un stack moderno de desarrollo web basado en JavaScript/TypeScript.

*   **Frontend Framework:** [React](https://react.dev/) (versión 19) con Hooks para la gestión del estado y el ciclo de vida de los componentes.
*   **Lenguaje:** [TypeScript](https://www.typescriptlang.org/) para un tipado estático que mejora la robustez y mantenibilidad del código.
*   **Build Tool:** [Vite](https://vitejs.dev/) como empaquetador y servidor de desarrollo, proporcionando una experiencia de desarrollo extremadamente rápida con Hot Module Replacement (HMR).
*   **Styling:**
    *   [UnoCSS](https://unocss.dev/): Un motor de CSS atómico y personalizable que genera las clases de utilidad necesarias bajo demanda. Se utiliza para la mayor parte del estilizado.
    *   **CSS Personalizado:** Archivos `.css` para estilos globales y específicos que son más difíciles de gestionar con clases de utilidad.
*   **Audio:** [Tone.js](https://tonejs.github.io/): Una librería para la síntesis y manipulación de audio en el navegador. Se utiliza para crear el motor de audio que reproduce notas y acordes con un sampler de piano.
*   **Linting:** [ESLint](https://eslint.org/) con configuraciones específicas para TypeScript y React, asegurando la calidad y consistencia del código.

## 3. Estructura del Proyecto

El proyecto sigue una estructura estándar para aplicaciones React, con una clara separación de responsabilidades.

```
/
├── public/
│   └── vite.svg
├── src/
│   ├── assets/
│   │   └── react.svg
│   ├── components/
│   │   ├── ChordInspectorModal.tsx  # Modal para editar detalles de un acorde.
│   │   ├── ComposerMode.tsx         # Componente para el modo de composición.
│   │   ├── ExtractorMode.tsx        # Componente para el modo de extracción.
│   │   ├── Navbar.tsx               # Barra de navegación para cambiar de modo.
│   │   └── VisualizerMode.tsx       # Componente para el modo de visualización.
│   ├── types/
│   │   └── index.ts                 # Definiciones de tipos de TypeScript.
│   ├── utils/
│   │   ├── audio.ts                 # Lógica del motor de audio con Tone.js.
│   │   ├── chord-utils.ts           # Funciones para parsear, formatear y transponer acordes.
│   │   ├── constants.ts             # Constantes musicales (intervalos, notas, etc.).
│   │   ├── piano-renderer.ts        # Lógica para dibujar el piano y la partitura.
│   │   ├── sheet-manager.ts         # Gestiona el renderizado de la hoja de la canción.
│   │   └── transposition-manager.ts # Gestiona la lógica de transposición.
│   ├── App.css                      # Estilos para el componente App.
│   ├── App.tsx                      # Componente raíz de la aplicación.
│   ├── index.css                    # Estilos globales.
│   └── main.tsx                     # Punto de entrada de la aplicación.
├── .gitignore
├── package.json                     # Dependencias y scripts del proyecto.
├── tsconfig.json                    # Configuración de TypeScript.
├── uno.config.ts                    # Configuración de UnoCSS.
└── vite.config.ts                   # Configuración de Vite.
```

### Archivos Clave

*   **`main.tsx`**: Punto de entrada. Renderiza el componente `App` en el DOM.
*   **`App.tsx`**: Componente principal que gestiona el estado global, como el modo activo (`visualizer`, `extractor`, `composer`) y la visibilidad del modal de inspección de acordes. Renderiza el `Navbar` y los componentes de modo correspondientes.
*   **`components/*.tsx`**: Cada archivo en esta carpeta representa una parte significativa de la UI. Los componentes de modo (`VisualizerMode`, `ExtractorMode`, `ComposerMode`) contienen la lógica y la interfaz para cada una de las funcionalidades principales.
*   **`utils/*.ts`**: El "cerebro" de la aplicación. Estos archivos no son componentes de React, sino módulos con lógica de negocio pura:
    *   `chord-utils.ts`: Contiene la lógica más compleja para interpretar strings de acordes (ej. "Cmaj7/G"), obtener las notas que los componen, y formatearlos.
    *   `audio.ts`: Encapsula toda la interacción con `Tone.js`, proveyendo una API sencilla (`playNote`, `playChord`) al resto de la aplicación.
    *   `piano-renderer.ts`: Funciones que generan el HTML y CSS para el piano virtual.
    *   `sheet-manager.ts` y `transposition-manager.ts`: Clases que gestionan el estado y la renderización de la hoja de la canción y su transposición, respectivamente.

## 4. Lógica de la Aplicación

### Estado Centralizado en `App.tsx`

El componente `App.tsx` actúa como el orquestador principal. Mantiene el estado de qué modo está activo y controla la visibilidad del `ChordInspectorModal`. Pasa las funciones necesarias (callbacks) y el motor de audio (`AudioEngine`) a los componentes hijos a través de props.

### Modos de Operación

1.  **`VisualizerMode.tsx`**:
    *   Mantiene su propio estado para la nota raíz, tipo de acorde, inversión, etc., seleccionados por el usuario.
    *   Cada vez que uno de estos valores cambia, recalcula las notas del acorde usando `getChordNotes` de `chord-utils.ts`.
    *   Renderiza el piano con `createPiano` de `piano-renderer.ts`.
    *   Llama a `audioEngine.playChord()` para reproducir el sonido.

2.  **`ExtractorMode.tsx`**:
    *   El usuario introduce texto en un `textarea`.
    *   Al hacer clic en "Analizar", se llama a `parseSongText` de `chord-utils.ts`. Esta función es el núcleo del extractor: utiliza expresiones regulares y lógica de análisis para diferenciar entre líneas de letra y líneas de acordes, parseando cada acorde individualmente.
    *   El resultado (`ProcessedSong`) se guarda en el estado.
    *   `SheetManager` se encarga de renderizar la canción (letra y acordes) en el DOM.
    *   Los acordes renderizados tienen listeners de eventos. Un clic corto reproduce el acorde, y un clic largo (o una acción específica) abre el `ChordInspectorModal` a través de la función `showInspector` pasada desde `App.tsx`.
    *   El `TranspositionManager` actualiza la visualización de los acordes cuando el usuario cambia la transposición.

3.  **`ComposerMode.tsx`**:
    *   Recibe una canción del modo `Extractor` o puede empezar desde cero (importando un archivo).
    *   La lógica es muy similar a la del `ExtractorMode`, pero con funcionalidades añadidas para la edición.
    *   Permite hacer clic en la letra para insertar un nuevo acorde, lo que abre el `ChordInspectorModal` para definir el acorde a insertar.
    *   Permite modificar y eliminar acordes existentes, actualizando el estado de la canción (`currentSong`).
    *   Ofrece funciones para exportar la canción a un archivo JSON (`.chordsong`) e importarla.

### Utilidades Clave

*   **`chord-utils.ts`**:
    *   `parseSongText`: La función más compleja. Itera sobre las líneas de un texto, usando la heurística `isChordLine` para decidir si una línea contiene acordes. Luego, extrae tokens (palabras/acordes) y usa `parseChordString` para convertir cada token en un objeto `SequenceItem` estructurado.
    *   `parseChordString`: Utiliza una lista ordenada de sufijos de acordes (de más largo a más corto, para evitar coincidencias parciales como "m" en lugar de "maj7") para identificar el tipo de acorde.
    *   `getChordNotes`: A partir de un `SequenceItem`, calcula las notas MIDI exactas que deben sonar, aplicando transposiciones, inversiones y alteraciones.
    *   `formatChordName`: Convierte un `SequenceItem` de nuevo a un string legible, ya sea en formato corto (ej. "C#m7") o largo (ej. "Do Sostenido Menor Séptima").

*   **`audio.ts`**:
    *   La clase `AudioEngine` encapsula un `Tone.Sampler`. La inicialización del audio (`Tone.start()`) se desacopla y se activa con la primera interacción del usuario para cumplir con las políticas de los navegadores.
    *   El sampler se carga en segundo plano para no bloquear la UI.
    *   Provee métodos simples como `playChord` que internamente usan `getChordNotes` para obtener las notas y `Tone.js` para reproducirlas.

## 5. Flujo de Datos

1.  **Inicio:** `App.tsx` se renderiza, inicializa `AudioEngine` y muestra el `VisualizerMode` por defecto.
2.  **Interacción en Visualizer:** El usuario cambia un `select` -> el estado de `VisualizerMode` se actualiza -> se llama a `getChordNotes` y `createPiano` -> la UI se actualiza.
3.  **Paso a Extractor:** El usuario cambia de modo en la `Navbar` -> el estado `activeMode` en `App.tsx` cambia -> `ExtractorMode` se vuelve visible.
4.  **Análisis en Extractor:** Usuario pega texto y pulsa "Analizar" -> `handleProcessSong` llama a `parseSongText` -> el estado `processedSong` se actualiza -> `SheetManager` renderiza la canción.
5.  **Inspeccionar Acorde:** Usuario hace clic largo en un acorde -> se llama a la función `showInspector` (pasada desde `App.tsx`) -> el estado en `App.tsx` cambia para mostrar el `ChordInspectorModal` con los datos del acorde seleccionado.
6.  **Guardar en Inspector:** Usuario guarda cambios en el modal -> se llama al callback `onUpdate` (pasado desde `ExtractorMode` a `App` y luego al modal) -> el estado `processedSong` en `ExtractorMode` se actualiza -> la UI se vuelve a renderizar.
7.  **Enviar a Compositor:** Usuario pulsa "Añadir al Compositor" -> se llama a `addToComposer` (pasada desde `App.tsx`) -> el estado `composerSong` en `App.tsx` se actualiza y `activeMode` cambia a 'composer' -> `ComposerMode` se renderiza con la nueva canción.
8.  **Edición en Compositor:** El flujo es similar al de inspeccionar/editar en el extractor, pero los callbacks modifican el estado `currentSong` dentro de `ComposerMode`.

Este flujo de datos, basado en el paso de estado y callbacks (props drilling), es característico de React y permite una clara separación de responsabilidades entre los componentes.
