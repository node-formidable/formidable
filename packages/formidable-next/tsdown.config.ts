import { defineConfig } from 'tsdown/config';

export default defineConfig({
  dts: true,
  entry: './src/entrypoints/index.ts',
  format: ['esm', 'cjs'],
  outputOptions: {
    dir: './dist',
  },
  platform: 'node',
});
