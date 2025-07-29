import {
  defineConfig,
  presetAttributify,
  presetIcons,
  presetUno,
} from 'unocss'
import transformerDirectives from '@unocss/transformer-directives'

export default defineConfig({
  // Atajos para clases comunes
  shortcuts: [
    {
      'input-panel': 'w-680px max-w-98vw flex flex-col items-center bg-none',
      'textarea-style': 'w-full min-h-160px max-w-full bg-textarea-bg-color text-textarea-text-color border-2.2px border-solid border-textarea-border-color rounded-11px font-inherit text-1.11rem p-16px px-20px mb-24px resize-y shadow-0_4px_26px_shadow-color-black/20 transition-border-color_0.16s,box-shadow_0.16s outline-none focus:border-textarea-focus-border-color focus:shadow-0_0_0_3px_textarea-focus-shadow-color/13 focus:bg-textarea-bg-color focus:text-white',
      'button-row': 'flex gap-20px mt-0 w-full justify-end flex-wrap',
      'btn-base': 'py-12px px-30px border-none rounded-11px text-1.09rem font-inherit font-bold cursor-pointer shadow-0_4px_12px_shadow-color-black/20,0_1px_2px_shadow-color-blue-dark/10 transition-background_0.17s,color_0.17s,box-shadow_0.18s mb-0 tracking-0.6px flex-grow-0',
      'btn-azul': 'btn-base bg-gradient-to-b from-btn-blue-start to-btn-blue-end text-white border-b-2px border-solid border-btn-blue-border hover:bg-gradient-to-b hover:from-btn-blue-hover-start hover:to-btn-blue-end hover:shadow-0_6px_18px_shadow-color-blue-light/30,0_4px_12px_shadow-color-black/20 hover:text-white',
      'btn-verde': 'btn-base bg-gradient-to-b from-btn-green-start to-btn-green-end text-[#181818] border-b-2px border-solid border-btn-green-border filter-drop-shadow-0_0_4px_shadow-color-green-light/20 hover:bg-gradient-to-b hover:from-btn-green-hover-start hover:to-btn-green-hover-end hover:text-[#161616]',
      'btn-rojo': 'btn-base bg-gradient-to-b from-btn-red-start to-btn-red-end text-white border-b-2px border-solid border-btn-red-border hover:bg-gradient-to-b hover:from-btn-red-hover-start hover:to-btn-red-end hover:text-white',
      'transposition-controls-container': 'flex items-center gap-3',
    },
  ],
  // Tema personalizado con los nuevos colores y fuentes
  theme: {
    fontFamily: {
      'fira': ['Fira Mono', 'Consolas', 'Menlo', 'monospace'],
      'victor': ['Victor Mono', 'monospace'],
      'jetbrains': ['JetBrains Mono', 'monospace'],
    },
    colors: {
      'brand': {
        'green': '#66cc33', // Verde principal
        'green-light': '#99ff33', // Verde para hover/activo
      },
      'dark': {
        'main': '#222', // Fondo principal
        'light': '#2a2a2a', // Fondo de selectores
        'lighter': '#232323', // Fondo de botones
      },
      'light': {
        'main': '#fff', // Texto blanco
        'muted': '#b6b6b6', // Etiquetas grises
      },
      'accent': {
        'orange': '#f97316',
        'yellow': '#F39C12',
        'red': '#C0392B',
        'red-dark': '#A93226',
      },
      'interactive': {
        'blue': '#418dcc',
        'blue-hover': '#367bbd',
      },
      'indigo': '#4f46e5',
      'grey': '#3A3A3A',
      'bg-card': '#2a2a2a', // Fondo para tarjetas y elementos como el textarea
      'text-main': '#fff', // Color de texto principal

      'btn-blue-start': '#3ca0ff',
      'btn-blue-end': '#1558b4',
      'btn-blue-border': '#134186',
      'btn-blue-hover-start': '#59b5ff',

      'btn-green-start': '#99ff33',
      'btn-green-end': '#56b100',
      'btn-green-border': '#3e8100',
      'btn-green-hover-start': '#baff49',
      'btn-green-hover-end': '#6cff1e',

      'btn-red-start': '#ef3232',
      'btn-red-end': '#be1818',
      'btn-red-border': '#900',
      'btn-red-hover-start': '#ff5050',

      'textarea-bg-color': '#222',
      'textarea-text-color': '#c3d6cc',
      'textarea-border-color': '#4a77bb',
      'textarea-focus-border-color': '#99ff33',
      'textarea-focus-shadow-color': '#99ff33',

      'shadow-color-black': '#000',
      'shadow-color-blue-light': '#00aaff',
      'shadow-color-blue-dark': '#004b8a',
      'shadow-color-green-light': '#a7ff7e',
    },
    // Añadimos el efecto de brillo para el texto
    textShadow: {
      'glow': '0 0 6px rgba(153, 255, 51, 0.6)',
    },
  },
  presets: [
    presetUno(),
    presetAttributify(),
    presetIcons({
      scale: 1.2,
      warn: true,
    }),
  ],
  transformers: [
    transformerDirectives(),
  ],
})
