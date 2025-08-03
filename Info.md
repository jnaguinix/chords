# nforme General de la Aplicación "Chords"

## 1. Descripción General

"Chords" es una aplicación web interactiva diseñada para músicos y aficionados a la música. Su propósito principal es facilitar la visualización, análisis, composición y transposición de acordes de canciones. La aplicación se divide en tres modos principales:

- **Visualizador:** Permite a los usuarios seleccionar una nota raíz, un tipo de acorde, inversiones y alteraciones para ver su representación en un piano virtual y escuchar cómo suena.
- **Editor de Canciones:** Es el núcleo de la aplicación. Los usuarios pueden pegar o escribir la letra y los acordes de una canción. La aplicación analiza el texto, extrae los acordes y los muestra de forma interactiva sobre la letra. Desde aquí, los acordes pueden ser transpuestos, editados en detalle y la canción puede ser exportada o importada.
- **Rearmonizador:** Un modo avanzado para explorar variaciones armónicas y sustituciones de acordes.

La aplicación cuenta con un motor de audio que reproduce los acordes y las notas individuales, y una interfaz de usuario pulida que incluye un inspector de acordes modal para una edición detallada.

## 2. Tecnologías Utilizadas

La aplicación está construida con un stack moderno de desarrollo web basado en JavaScript/TypeScript.

- **Frontend Framework:** [React](https://react.dev/) (versión 19) con Hooks para la gestión del estado y el ciclo de vida de los componentes.
- **Lenguaje:** [TypeScript](https://www.typescriptlang.org/) para un tipado estático que mejora la robustez y mantenibilidad del código.
- **Build Tool:** [Vite](https://vitejs.dev/) como empaquetador y servidor de desarrollo, proporcionando una experiencia de desarrollo extremadamente rápida con Hot Module Replacement (HMR).
- **Styling:**
  - [UnoCSS](https://unocss.dev/): Un motor de CSS atómico y personalizable que genera las clases de utilidad necesarias bajo demanda.
  - **CSS Personalizado:** Archivos `.css` para estilos globales y específicos.
- **Editor de Texto:** [CodeMirror 6](https://codemirror.net/): Un editor de texto extensible y moderno, configurado con una gramática personalizada para reconocer y estilizar acordes.
- **Audio:** [Tone.js](https://tonejs.github.io/): Una librería para la síntesis y manipulación de audio en el navegador. Se utiliza para crear el motor de audio que reproduce notas y acordes.

## 3. Topología y Estructura del Proyecto

La arquitectura del proyecto se ha centralizado para mejorar la cohesión y el flujo de datos, eliminando los antiguos `ComposerMode` y `ExtractorMode` en favor de un `SongEditor` más potente.

### Archivos Clave

- **`main.tsx`**: Punto de entrada. Renderiza el componente `App` en el DOM.
- **`App.tsx`**: Componente principal que gestiona el estado global, como el modo activo (`visualizer`, `editor`, `reharmonizer`) y la visibilidad del `ChordInspectorModal`.
- **`components/`**:
  - **`SongEditor.tsx`**: El nuevo corazón de la aplicación. Gestiona la entrada de texto, la visualización de la canción, la interacción con los acordes (clic para reproducir, clic largo para editar) y la comunicación con el motor de CodeMirror.
  - **`ChordInspectorModal.tsx`**: Modal para editar en detalle un acorde (raíz, tipo, bajo, alteraciones e **inversiones**).
  - **`VisualizerMode.tsx`**: Componente para el modo de visualización de acordes individuales.
  - **`PianoDisplay.tsx`**: Componente que renderiza el piano virtual.
  - **`Navbar.tsx`**: Barra de navegación para cambiar entre los modos principales.
- **`utils/`**: El "cerebro" de la aplicación. Módulos con lógica de negocio pura:
  - **`chord-utils.ts`**: Contiene la lógica más compleja para interpretar strings de acordes, incluyendo la nueva **notación de inversión con superíndices (ej. `Am¹`)**. Gestiona el parseo, formateo y cálculo de notas.
  - **`audio.ts`**: Encapsula toda la interacción con `Tone.js`, proveyendo una API sencilla (`playNote`, `playChord`) al resto de la aplicación.

## 4. Lógica de la Aplicación

### Estado Centralizado en `App.tsx`

El componente `App.tsx` actúa como el orquestador principal. Mantiene el estado de qué modo está activo y controla la visibilidad del `ChordInspectorModal`, pasando las funciones y datos necesarios a los componentes hijos.

### Modos de Operación

1. **`VisualizerMode.tsx`**: Mantiene su propio estado para los selectores de acordes. Cada vez que un valor cambia, recalcula las notas del acorde usando `getChordNotes` y las muestra en el `PianoDisplay`.
2. **`SongEditor.tsx`**:
   - Utiliza **CodeMirror 6** para renderizar el editor de texto.
   - Se define una **gramática de lenguaje personalizada** (`chordLanguage`) que utiliza expresiones regulares para identificar qué es un acorde. Esta gramática ha sido actualizada para reconocer la **notación de inversión con superíndices (ej. `Am¹`, `C²`)** como un único token interactivo.
   - Gestiona los eventos del editor: un clic corto en un acorde llama a `audioEngine.playChord()`, mientras que un clic largo abre el `ChordInspectorModal`.
   - Cuando se guarda un cambio en el modal, el editor actualiza el texto del acorde usando `formatChordName`, que ahora escribe las inversiones con la nueva notación.

### Utilidades Clave

- **`chord-utils.ts`**:
  - **`parseChordString`**: La función de análisis ha sido actualizada. Ahora, al leer un string como **`Am¹/G`**, es capaz de identificar correctamente la nota raíz (`A`), el tipo (`m`), la **inversión** (`1`) y el bajo explícito (`G`).
  - **`formatChordName`**: Convierte un objeto de acorde de nuevo a su representación en texto. Si el objeto tiene `{ inversion: 1 }`, lo formatea como `Am¹`.
  - **`getChordNotes`**: El núcleo del sonido. Se ha corregido y refinado para que:
    1. Calcule el **bajo (nota naranja)** basándose siempre en la nota fundamental del acorde (`A` para `Am¹`), a menos que se especifique un bajo con barra.
    2. Calcule las **notas del acorde (azules)** y aplique la inversión correspondiente a ellas, de forma independiente al bajo.

## 5. Flujo de Datos

1. **Inicio:** `App.tsx` se renderiza, inicializa `AudioEngine` y muestra el `VisualizerMode` por defecto.
2. **Cambio a Editor:** El usuario cambia de modo en la `Navbar` -> el estado `activeMode` en `App.tsx` cambia -> `SongEditor.tsx` se vuelve visible.
3. **Edición de Acorde:** Usuario hace clic largo en un acorde (`Am`) en el `SongEditor` -> se llama a la función `showInspector` (pasada desde `App.tsx`).
4. **Selección de Inversión:** Dentro del `ChordInspectorModal`, el usuario selecciona "1ª Inversión".
5. **Guardado:** El usuario pulsa "Guardar". El modal llama a su callback `onUpdate` con el objeto del acorde, que ahora contiene la propiedad `{ inversion: 1 }`.
6. **Actualización del Editor:** `SongEditor` recibe el objeto actualizado. Llama a `formatChordName`, que convierte el objeto en el string **`Am¹`**. Finalmente, `SongEditor` actualiza el texto dentro de CodeMirror, reemplazando `Am` por `Am¹`.
7. **Visualización y Sonido:** Al hacer clic de nuevo en `Am¹`, `parseChordString` lo lee correctamente, y `getChordNotes` genera las notas correctas para el piano y el audio, mostrando el bajo `A` en naranja y el acorde invertido `C-E-A` en azul.

Este flujo de datos actualizado asegura una correcta persistencia y representación de las inversiones, manteniendo la arquitectura limpia y centralizada en `SongEditor.tsx`.
