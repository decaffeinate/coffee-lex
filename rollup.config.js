import ts from 'rollup-plugin-typescript';
import * as TypeScript from 'typescript';

var pkg = require('./package.json');

export default {
  entry: 'src/index.ts',
  plugins: [ts({ typescript: TypeScript })],
  exports: 'named',
  targets: [
    {
      format: 'es',
      dest: pkg.module
    },
    {
      format: 'umd',
      moduleName: 'coffeelex',
      dest: pkg.main
    }
  ]
};
