import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  minify: false,
  treeshake: true,
  splitting: false,
  outDir: 'dist',
  platform: 'neutral',
  target: ['es2020', 'node18'],
  esbuildOptions(options) {
    options.conditions = ['browser', 'module', 'import']
  }
})

