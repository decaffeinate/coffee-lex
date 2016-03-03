import config from './rollup.config';

config.dest = 'dist/coffee-lex.umd.js';
config.format = 'umd';
config.moduleName = 'coffeelex';
config.outro = 'Object.defineProperty(exports, \'__esModule\', { value: true });';

export default config;
