# Acordes - Aplicación Interactiva de Música

Esta aplicación web interactiva está diseñada para ayudar a músicos, estudiantes y entusiastas a explorar, componer y analizar acordes de una manera visual y auditiva. Permite a los usuarios visualizar acordes en un piano interactivo, componer sus propias secuencias de acordes y letras, y extraer acordes de canciones existentes para su transposición y análisis.

## Estructura del Proyecto

El proyecto sigue una estructura modular, separando las preocupaciones en diferentes directorios y archivos para facilitar la mantenibilidad y escalabilidad.

```
C:/DLLO/Acordes - Funcionando - copia (2)/
├───.gitignore
├───index.html
├───metadata.json
├───package-lock.json
├───package.json
├───README.md
├───tech-stack.txt
├───tsconfig.json
├───vite-env.d.ts
├───vite.config.ts
├───.git/...
├───.github/
│   └───workflows/
│       └───deploy.yml
├───dist/...
├───node_modules/...
└───src/
    ├───constants.ts
    ├───index.css
    ├───main.tsx
    ├───types.ts
    ├───core/
    │   ├───audio.ts
    │   ├───chord-utils.ts
    │   └───piano-renderer.ts
    └───modes/
        ├───composer.ts
        ├───extractor.ts
        └───visualizer.ts
```

### Descripción de Directorios y Archivos Clave

-   **`/` (Raíz del Proyecto)**:
    -   `index.html`: El punto de entrada principal de la aplicación web.
    -   `package.json`, `package-lock.json`: Archivos de configuración de Node.js que definen las dependencias del proyecto y los scripts.
    -   `tsconfig.json`, `vite.config.ts`, `vite-env.d.ts`: Archivos de configuración para TypeScript y Vite (un bundler y servidor de desarrollo).
    -   `README.md`: Este archivo de documentación.
    -   `tech-stack.txt`: Archivo que describe las tecnologías utilizadas en el proyecto.

-   **`src/`**: Contiene el código fuente principal de la aplicación.
    -   `constants.ts`: Define constantes globales utilizadas en toda la aplicación, como las notas musicales, mapeos de acordes y tipos de intervalos musicales.
    -   `index.css`: Contiene los estilos CSS globales y las variables de diseño de la aplicación.
    -   `main.tsx`: El archivo principal de la aplicación React/TypeScript que inicializa la aplicación, gestiona el cambio entre los diferentes modos (Visualizador, Compositor, Extractor) y coordina la interacción entre ellos, incluyendo la lógica del "Chord Inspector".
    -   `types.ts`: Define las interfaces y tipos de TypeScript utilizados en la aplicación para asegurar la consistencia de los datos y mejorar la legibilidad del código.

-   **`src/core/`**: Contiene la lógica central y las utilidades que son compartidas por los diferentes modos de la aplicación.
    -   `audio.ts`: Implementa el `AudioEngine`, responsable de la reproducción de sonidos de notas y acordes utilizando la Web Audio API.
    -   `chord-utils.ts`: Proporciona funciones utilitarias para el cálculo y manipulación de acordes, incluyendo la obtención de notas MIDI para un acorde dado, la transposición y el análisis de texto de canciones para extraer acordes.
    -   `piano-renderer.ts`: Se encarga de la representación visual del piano interactivo en el DOM y de la creación de la "partitura" interactiva para mostrar letras y acordes.

-   **`src/modes/`**: Contiene la implementación de los diferentes modos o funcionalidades principales de la aplicación.
    -   `composer.ts`: Implementa la lógica del "Modo Compositor", permitiendo a los usuarios crear y editar secuencias de acordes y letras en una interfaz de partitura interactiva.
    -   `extractor.ts`: Implementa la lógica del "Modo Extractor", que permite a los usuarios pegar texto de canciones, analizarlo para extraer acordes y letras, y transponer la canción a diferentes tonalidades.
    -   `visualizer.ts`: Implementa la lógica del "Modo Visualizador", que permite a los usuarios seleccionar y visualizar acordes individuales en el piano interactivo, así como escucharlos.

## Funcionalidades Principales

La aplicación ofrece tres modos principales, accesibles a través de pestañas en la interfaz de usuario:

### 1. Modo Visualizador

-   **Propósito**: Explorar y escuchar acordes individuales.
-   **Características**:
    -   **Selección de Acordes**: Permite al usuario elegir una nota raíz (ej. C, G#), un tipo de acorde (ej. Mayor, Menor, 7ma Dominante), una nota de bajo (opcional) y una inversión.
    -   **Visualización en Piano**: Muestra el acorde seleccionado en un teclado de piano interactivo, resaltando las teclas correspondientes.
    -   **Reproducción de Audio**: Permite reproducir el acorde completo para escuchar cómo suena.
    -   **Nombre del Acorde**: Muestra el nombre del acorde generado en tiempo real.

### 2. Modo Compositor

-   **Propósito**: Crear y editar secuencias de acordes y letras, simulando una partitura.
-   **Características**:
    -   **Partitura Interactiva**: Una interfaz donde el usuario puede escribir letras y añadir acordes en posiciones específicas.
    -   **Inserción de Acordes**: Al hacer clic en la partitura, se abre un "Chord Inspector" que permite definir un nuevo acorde para insertar.
    -   **Edición de Acordes**: Un clic largo en un acorde existente abre el "Chord Inspector" para modificar sus propiedades.
    -   **Reproducción Individual**: Un clic corto en un acorde lo reproduce.
    -   **Gestión de Secuencias**: Permite añadir, actualizar y eliminar acordes de la secuencia.
    -   **Integración con Extractor**: Puede recibir canciones procesadas del modo Extractor para su posterior edición.

### 3. Modo Extractor

-   **Propósito**: Analizar canciones existentes para extraer acordes y letras, y permitir su transposición.
-   **Características**:
    -   **Entrada de Texto**: Un área de texto donde el usuario puede pegar canciones con acordes incrustados (ej. `(Am)Letra de la canción (G)continúa aquí`).
    -   **Procesamiento de Canciones**: Analiza el texto para identificar y separar los acordes de las letras.
    -   **Visualización de Partitura**: Muestra la canción procesada en un formato de partitura interactiva, similar al modo Compositor.
    -   **Transposición**: Permite al usuario transponer la canción completa (cambiar su tonalidad) hacia arriba o hacia abajo en semitonos.
    -   **Reproducción y Edición**: Los acordes extraídos pueden ser reproducidos individualmente y editados a través del "Chord Inspector".
    -   **Exportar a Compositor**: La canción procesada puede ser enviada al modo Compositor para una edición más detallada.

### Chord Inspector (Modal Global)

El "Chord Inspector" es un componente modal central que se utiliza en los modos Compositor y Extractor. Permite a los usuarios:
-   **Definir Acordes**: Seleccionar la nota raíz, el tipo de acorde, la nota de bajo y la inversión.
-   **Visualización en Piano**: Muestra el acorde que se está definiendo en un pequeño piano interactivo dentro del modal.
-   **Reproducción**: Permite escuchar el acorde antes de insertarlo o actualizarlo.
-   **Acciones**: Ofrece opciones para insertar, actualizar o eliminar el acorde.

## Tecnologías Utilizadas

Según el archivo `tech-stack.txt` y el análisis del código, las principales tecnologías utilizadas en este proyecto son:

-   **Frontend**:
    -   **React**: Biblioteca de JavaScript para construir interfaces de usuario.
    -   **TypeScript**: Superset de JavaScript que añade tipado estático.
    -   **Vite**: Herramienta de construcción frontend que proporciona un entorno de desarrollo rápido.
    -   **CSS**: Para el estilizado de la aplicación.
    -   **Web Audio API**: Para la síntesis y reproducción de sonidos musicales.

-   **Despliegue**:
    -   **GitHub Actions**: Para la integración continua y el despliegue automatizado (configurado en `.github/workflows/deploy.yml`).

## Cómo Ejecutar Localmente

Para ejecutar esta aplicación en tu máquina local, sigue estos pasos:

1.  **Clonar el Repositorio**:
    ```bash
    git clone <URL_DEL_REPOSITORIO>
    cd "Acordes - Funcionando - copia (2)"
    ```

2.  **Instalar Dependencias**:
    Asegúrate de tener Node.js instalado. Luego, instala las dependencias del proyecto:
    ```bash
    npm install
    ```

3.  **Configurar la Clave de API (si aplica)**:
    Si la aplicación requiere una clave de API de Gemini (como se sugiere en el `README.md` original), crea un archivo `.env.local` en la raíz del proyecto y añade tu clave:
    ```
    GEMINI_API_KEY=TU_CLAVE_DE_API_DE_GEMINI
    ```
    *(Nota: Aunque el `README.md` original menciona `GEMINI_API_KEY`, el código actual no parece utilizar directamente la API de Gemini para la funcionalidad de acordes. Esto podría ser un remanente o una característica futura.)*

4.  **Ejecutar la Aplicación**:
    Inicia el servidor de desarrollo:
    ```bash
    npm run dev
    ```
    La aplicación estará disponible en tu navegador en `http://localhost:5173` (o un puerto similar).

---

**Desarrollado con ❤️**