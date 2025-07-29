import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import UnoCSS from 'unocss/vite'
import transformerDirectives from '@unocss/transformer-directives'

export default defineConfig({
  plugins: [
    react(),
    UnoCSS({
      // Este es el transformador que faltaba.
      // Permite que usemos @apply en nuestros archivos CSS.
      transformers: [
        transformerDirectives(),
      ],
    }),
  ],
})


