import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import dts from 'rollup-plugin-dts';

const external = [
  'node-fetch',
  'zod',
  'dotenv',
  'ws',
  'isomorphic-ws',
  'eventsource',
  'js-base64'
];

const plugins = [
  resolve({
    preferBuiltins: true,
    browser: false
  }),
  commonjs(),
  typescript({
    tsconfig: './tsconfig.json',
    declaration: false,
    declarationMap: false
  }),
  terser()
];

const browserPlugins = [
  resolve({
    preferBuiltins: false,
    browser: true
  }),
  commonjs(),
  typescript({
    tsconfig: './tsconfig.json',
    declaration: false,
    declarationMap: false
  }),
  terser()
];

export default [
  // Main entry - ESM
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.js',
      format: 'es',
      sourcemap: true
    },
    external,
    plugins
  },

  // Main entry - CommonJS
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.cjs',
      format: 'cjs',
      sourcemap: true,
      exports: 'auto'
    },
    external,
    plugins
  },

  // Browser entry - ESM
  {
    input: 'src/indexBrowser.ts',
    output: {
      file: 'dist/indexBrowser.js',
      format: 'es',
      sourcemap: true
    },
    external,
    plugins: browserPlugins
  },

  // Browser entry - CommonJS
  {
    input: 'src/indexBrowser.ts',
    output: {
      file: 'dist/indexBrowser.cjs',
      format: 'cjs',
      sourcemap: true,
      exports: 'auto'
    },
    external,
    plugins: browserPlugins
  },

  // TypeScript declarations - Main
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.d.ts',
      format: 'es'
    },
    plugins: [dts()]
  },

  // TypeScript declarations - Browser
  {
    input: 'src/indexBrowser.ts',
    output: {
      file: 'dist/indexBrowser.d.ts',
      format: 'es'
    },
    plugins: [dts()]
  }
];
