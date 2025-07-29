import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// 1. Estilos de UnoCSS (se procesan en tiempo de build)
import 'virtual:uno.css'

// 2. Nuestros estilos CSS personalizados (se importan directamente)
import './index.css' 

// 3. El componente principal de la App
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
