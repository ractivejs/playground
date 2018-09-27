import RactiveLoad from './rollup-ractive';

const CDN = '//cdn.jsdelivr.net/npm';
const ext = /\.[a-zA-Z0-9]$/;

let cache = {};

function getScript(app, id) {
  if (id === 'ractive') return Promise.resolve('export const Ractive = window.Ractive;\nexport default Ractive;\n');
  if (!app.get('other.cacheBust') && cache[id]) {
    if (cache[id] === 404) return Promise.reject(`Module ${id} not found`);
    else return cache[id];
  }
  console.info(`fetching npm module ${id}`);
  const bust = app.get('other.cacheBust') ? `?${Date.now()}` : '';
  return fetch(`${CDN}/${id}${bust}`).then(r => {
    if (r.status > 299) {
      if (!ext.test(id)) return fetch(`${CDN}/${id}.js${bust}`).then(r => {
        if (r.status > 299) throw new Error(`Module ${id} not found`);
        else return r.text();
      });
      else throw new Error(`Module ${id} not found`);
    } else return r.text();
  }).then(t => {
    cache[id] = t;
    return t;
  }, e => {
    cache[id] = 404;
    throw e;
  });
}

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
        const tgt = target.split('/');
        if (tgt[0] === '.') tgt.shift();
        while (start.length && tgt[0] === '..') {
          start.pop();
          tgt.shift();
        }
        return `${start.concat(tgt).join('/')}`;
      }
    },
    load(id) {
      if (id[0] === '/') {
        const name = id.slice(1);
        const files = app.get('unit.fs');
        const file = files.find(f => f.name === name);
        if (file) return file.content;
      }
      if (id[0] !== '/' && id[0] !== '.' && id[0] !== '\0') return getScript(app, id);
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
    format: 'iife',
    globals: {}
  }
}

export default function build(app, entry) {
  const opts = {
    input: entry,
    plugins: [cdnResolve(app), RactiveLoad, RollupPluginCommonJS()]
  };

  return rollup.rollup(opts).then(bundle => {
    outOpts.output.globals = Object.assign({}, { ractive: 'Ractive' });
    (app.get('unit.gs') || []).forEach(o => outOpts.output.globals[o.key] = o.value);
    return bundle.generate(outOpts).then(res => {
      return res.code;
    });
  }, err => {
    err = JSON.stringify(err.stack);
    err = err.substr(1, err.length - 2);
    return `const div = document.createElement('div');
div.innerHTML = '<h1>Error building script:</h1><code><pre style="white-space: pre-wrap; word-break: break-all;">${err}</pre></code>';
div.setAttribute('style', 'position: absolute; top: 0; bottom: 0; left: 0; right: 0; padding: 2em; border: 1px solid red; color: red; background-color: rgba(255, 0, 0, 0.1); box-sizing: border-box; overflow: auto;');
document.body.appendChild(div);
document.body.style.margin = 0;
document.body.style.padding = 0;
`;
  });
}