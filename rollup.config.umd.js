import config from './rollup.config';

config.dest = 'dist/coffee-lex.umd.js';
config.format = 'umd';
config.moduleName = 'coffeelex';

export default config;
