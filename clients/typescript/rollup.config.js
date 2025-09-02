import typescript from 'rollup-plugin-typescript2';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pkg = require('./package.json');

const external = [
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.peerDependencies || {}),
  'fs',
  'path',
  'util',
  'events'
];

const commonConfig = {
  input: 'src/index.ts',
  external,
  plugins: [
    typescript({
      typescript: require('typescript'),
      tsconfig: './tsconfig.json',
      exclude: ['**/*.test.ts', '**/__tests__/**/*']
    })
  ]
};

export default [
  // CommonJS build
  {
    ...commonConfig,
    output: {
      file: pkg.main,
      format: 'cjs',
      sourcemap: true,
      exports: 'named'
    }
  },
  // ES Module build  
  {
    ...commonConfig,
    output: {
      file: pkg.module,
      format: 'esm',
      sourcemap: true
    }
  }
];