import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: ['src/index.ts'],
    dts: true,
    format: 'cjs',
  },
  {
    entry: ['src/index.ts'],
    format: 'esm',
  }
]);
