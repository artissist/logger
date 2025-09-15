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

const browserExternal = [
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.peerDependencies || {}),
  // Don't include fs and path as external for browser - they'll be ignored
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

const browserConfig = {
  input: 'src/index.browser.ts',
  external: browserExternal,
  plugins: [
    typescript({
      typescript: require('typescript'),
      tsconfig: './tsconfig.json',
      exclude: ['**/*.test.ts', '**/__tests__/**/*']
    }),
    // Plugin to replace Node.js modules with browser-safe alternatives
    {
      name: 'browser-polyfills',
      resolveId(id) {
        if (id === 'fs' || id === 'path') {
          return id;
        }
        return null;
      },
      load(id) {
        if (id === 'fs') {
          // Provide all fs methods used in the FileAdapter as no-op functions
          return `
            export const existsSync = () => false;
            export const mkdirSync = () => {};
            export const statSync = () => ({ size: 0, mtime: new Date() });
            export const createWriteStream = () => ({
              write: () => {},
              end: () => {},
              on: () => {},
              once: () => {},
              destroy: () => {}
            });
            export const renameSync = () => {};
            export const readdirSync = () => [];
            export const unlinkSync = () => {};
            export const accessSync = () => {};
            export const constants = { W_OK: 2 };
            export default {
              existsSync,
              mkdirSync,
              statSync,
              createWriteStream,
              renameSync,
              readdirSync,
              unlinkSync,
              accessSync,
              constants
            };
          `;
        }
        if (id === 'path') {
          // Provide all path methods used in the FileAdapter
          return `
            export const dirname = (path) => path.split('/').slice(0, -1).join('/') || '/';
            export const basename = (path) => path.split('/').pop() || '';
            export const join = (...paths) => paths.join('/').replace(/\\/+/g, '/');
            export default {
              dirname,
              basename,
              join
            };
          `;
        }
        return null;
      }
    }
  ]
};

export default [
  // CommonJS build (Node.js)
  {
    ...commonConfig,
    output: {
      file: pkg.main,
      format: 'cjs',
      sourcemap: true,
      exports: 'named'
    }
  },
  // ES Module build (Node.js)
  {
    ...commonConfig,
    output: {
      file: pkg.module,
      format: 'esm',
      sourcemap: true
    }
  },
  // Browser-compatible ES Module build
  {
    ...browserConfig,
    output: {
      file: 'dist/index.browser.js',
      format: 'esm',
      sourcemap: true
    }
  }
];