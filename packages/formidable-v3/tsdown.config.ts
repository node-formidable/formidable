import { defineConfig, type UserConfig } from 'tsdown/config';

const cfg: UserConfig = {
  format: ['esm', 'cjs'],
  outDir: 'dist',
}

export default [
  defineConfig({ ...cfg, entry: './src/index.js' }),
  defineConfig({ ...cfg, entry: './src/helpers/*.js', outDir: 'dist/helpers' }),
  defineConfig({ ...cfg, entry: './src/parsers/*.js', outDir: 'dist/parsers' }),
  defineConfig({ ...cfg, entry: './src/plugins/*.js', outDir: 'dist/plugins' }),
];

// export default defineConfig([
//   {
//     dts: true,
//     entry: './src/entrypoints/index.ts',
//     format: ['esm', 'cjs'],
//     outputOptions: {
//       dir: './dist',
//     },
//     platform: 'node',
//   }
// ]);
