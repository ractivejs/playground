const ractive = require('rollup-plugin-ractive-bin');
const buble = require('@rollup/plugin-buble');
const uglify = require('rollup-plugin-uglify');
const resolve = require('rollup-plugin-node-resolve');
const commonjs = require('rollup-plugin-commonjs');

const output = {
  file: 'public/index.js',
  format: 'iife',
  globals: { ractive: 'Ractive' }
};

const rollupOpts = {
  input: 'src/index.ractive.html',
  output: Object.assign({}, output),
  external: ['ractive'],
  watch: { chokidar: false }
};

const resolveOpts = {
  extensions: ['.js', '.ractive.html']
};

const bubleOpts = {
  transforms: {
    modules: false
  }
};

const plugins = [ractive(), resolve(resolveOpts), commonjs(), buble(bubleOpts)];

module.exports = [
  Object.assign({}, rollupOpts, { plugins }),
  Object.assign({}, rollupOpts, {
    output: Object.assign({}, output, { file: 'public/index.min.js' }),
    plugins: plugins.concat([uglify()])
  })
];
