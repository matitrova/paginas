import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'

// Una página por carpeta. base './' para que ande en matitrova.github.io/paginas/ y en cualquier dominio.
const pagina = (ruta: string) => resolve(import.meta.dirname, ruta, 'index.html')

// Solo entran las páginas que ya tienen su index.html
const paginas = { inicio: '.', cabanas: 'cabanas', casaTala: 'casa-tala' }
const input = Object.fromEntries(
  Object.entries(paginas).map(([nombre, ruta]) => [nombre, pagina(ruta)]).filter(([, archivo]) => existsSync(archivo)),
)

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  build: { rollupOptions: { input } },
})
