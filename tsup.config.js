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
  },
  {
    entry: ['src/SourceLocation.ts'],
    dts: true,
    format: 'cjs',
  },
  {
    entry: ['src/SourceLocation.ts'],
    format: 'esm',
  },
  {
    entry: ['src/SourceToken.ts'],
    dts: true,
    format: 'cjs',
  },
  {
    entry: ['src/SourceToken.ts'],
    format: 'esm',
  },
  {
    entry: ['src/SourceTokenList.ts'],
    dts: true,
    format: 'cjs',
  },
  {
    entry: ['src/SourceTokenList.ts'],
    format: 'esm',
  },
  {
    entry: ['src/SourceTokenListIndex.ts'],
    dts: true,
    format: 'cjs',
  },
  {
    entry: ['src/SourceTokenListIndex.ts'],
    format: 'esm',
  },
  {
    entry: ['src/SourceType.ts'],
    dts: true,
    format: 'cjs',
  },
  {
    entry: ['src/SourceType.ts'],
    format: 'esm',
  }
]);
