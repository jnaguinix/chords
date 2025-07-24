# Acordes Mágicos ✨

Una aplicación web interactiva diseñada para músicos que permite visualizar, extraer y componer con  de acordes de forma sencilla e intuitiva.

## 🎹 Características Principales

El proyecto se divide en tres modos principales, cada uno con un propósito específico:

### 1. Visualizador de Acordes
- **Visualización Instantánea:** Selecciona una nota raíz, un tipo de acorde, una inversión y un bajo para ver instantáneamente las notas correspondientes en un piano virtual.
- **Soporte para Alteraciones:** Añade alteraciones complejas (como `b9`, `#11`, etc.) y observa cómo afectan al acorde.
- **Reproducción de Audio:** Escucha cómo suena cualquier acorde que construyas gracias a la integración con **Tone.js**.

### 2. Extractor de Canciones
- **Análisis Inteligente:** Pega la letra de una canción con sus acordes y la aplicación la analizará para generar una partitura interactiva.
- **Partitura Interactiva:** Haz clic en cualquier acorde de la partitura generada para escucharlo y ver su diagrama en el piano.
- **Transposición Fácil:** Transporta la tonalidad de toda la canción hacia arriba o hacia abajo con un solo clic.
- **Integración con el Compositor:** Envía la canción procesada directamente al modo Compositor para empezar a editarla.

### 3. Compositor de Partituras
- **Edición Completa:** Modifica cualquier acorde de la canción a través de un inspector modal avanzado. Cambia la nota raíz, el tipo, el bajo, las alteraciones y las inversiones.
- **Notación Profesional:** Los acordes se muestran utilizando una notación clara y estándar (ej. `Cmaj7(#11)`), evitando ambigüedades.
- **Inserción y Eliminación:** Añade nuevos acordes en cualquier punto de la letra o elimina los existentes.
- **Piano de Contexto:** Un pequeño piano en la parte superior siempre muestra el último acorde que has seleccionado.
- **Importación y Exportación:** Guarda tus composiciones en un archivo `.chordsong` (formato JSON) y vuelve a cargarlas más tarde para seguir trabajando.

## 🛠️ Pila Tecnológica (Tech Stack)

- **Frontend:** TypeScript
- **Bundler:** Vite
- **Motor de Audio:** Tone.js
- **Estilos:** CSS plano (con variables para un sistema de diseño cohesivo)
- **Sin Frameworks:** El proyecto está construido con TypeScript puro para un control máximo del DOM y la lógica de estado.

## 📂 Estructura del Proyecto

El código fuente está organizado de forma modular para facilitar su mantenimiento y escalabilidad:

```
src/
├── core/         # Lógica de negocio principal y reutilizable
│   ├── audio.ts              # Motor de audio (wrapper de Tone.js)
│   ├── chord-utils.ts        # Funciones para parsear, formatear y manipular acordes
│   ├── piano-renderer.ts     # Lógica para dibujar el piano en el DOM
│   ├── sheet-manager.ts      # Gestiona el renderizado y la interacción de las partituras
│   └── transposition-manager.ts # Gestiona el estado y la lógica de la transposición
│
├── modes/        # Lógica específica para cada uno de los tres modos de la aplicación
│   ├── composer.ts           # Modo de composición
│   ├── extractor.ts          # Modo de extracción de canciones
│   └── visualizer.ts         # Modo de visualización de acordes
│
├── main.tsx      # Punto de entrada principal, inicialización de la app y gestión del modal
├── types.ts      # Definiciones de tipos e interfaces de TypeScript
└── index.css     # Estilos globales de la aplicación
```

## 🚀 Cómo Empezar

1.  Clona el repositorio:
    ```bash
    git clone https://github.com/tu-usuario/tu-repositorio.git
    ```
2.  Instala las dependencias:
    ```bash
    npm install
    ```
3.  Inicia el servidor de desarrollo:
    ```bash
    npm run dev
    ```
4.  Abre tu navegador en `http://localhost:5173` (o el puerto que indique Vite).
