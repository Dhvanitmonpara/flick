import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'], // or 'cjs' depending on your project
  dts: true,
  outDir: 'dist',
  splitting: false,
  silent: true,
  sourcemap: true,
  clean: true,
})
