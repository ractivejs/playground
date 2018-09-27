import RactiveLoad from './rollup-ractive';

function cdnResolve(app) {
  return {
    name: 'cdn-resolve',
    resolveId(target, unit) {
      if (!unit) return `/${target}`;
      if (target[0] !== '.' && target[0] !== '/') {
        return target;
      }
      else {
        let start = unit.split('/');
        start.pop();
        start.shift();
        const tgt = target.split('/');
        if (tgt[0] === '.') tgt.shift();
        while (start.length && tgt[0] === '..') {
          start.pop();
          tgt.shift();
        }
        return `/${start.concat(tgt).join('/')}`;
      }
      return Promise.reject('lol, nope')
    },
    load(id) {
      if (id[0] === '/') {
        const name = id.slice(1);
        const files = app.get('unit.fs');
        const file = files.find(f => f.name === name);
        if (file) return file.content;
      }
      if (id[0] !== '/' && id[0] !== '.' && id[0] !== '\0') return fetch(`//cdn.jsdelivr.net/npm/${id}${app.get('other.cacheBust') ? `?${+(new Date())}` : ''}`).then(r => r.text());
      if (id === '\0commonjsHelpers') return `
  export var commonjsGlobal = typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};
  export function commonjsRequire () {
  throw new Error('Dynamic requires are not currently supported by rollup-plugin-commonjs');
  }
  export function unwrapExports (x) {
  return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
  }
  export function createCommonjsModule(fn, module) {
  return module = { exports: {} }, fn(module, module.exports), module.exports;
  }`;
      if (id === '/bar.js') return `module.exports = 'something';`;
      return '';
    }
  }
}

const outOpts = {
  output: {
    format: 'iife'
  }
}

export default function build(app, entry) {
  const opts = {
    input: entry,
    plugins: [cdnResolve(app), RactiveLoad, RollupPluginCommonJS()]
  };

  return rollup.rollup(opts).then(bundle => {
    return bundle.generate(outOpts).then(res => {
      return res.code;
    });
  });
}