import { defineConfig } from 'tsdown/config';

export default defineConfig({
  outputOptions: {
    dir: './dist',
  },
  entry: './src/entrypoints/index.ts',
  platform: 'node',
  format: ['esm', 'cjs'],
  dts: true,
});
