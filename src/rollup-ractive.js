function reducePromiseFunctions(fnList, init) {
  if (!fnList || !fnList.length) return Promise.resolve(init);
  const fns = fnList.slice();
  let res = init;

  return new Promise((done, fail) => {
    function step() {
      const fn = fns.shift();
      if (!fn) done(res);
      else {
        Promise.resolve(
          Promise.resolve(fn(res)).then(r => {
            res = r;
            step();
          }, fail)
        );
      }
    }
    step();
  });
}

// https://gist.github.com/mathiasbynens/1243213
function escape(string) {
  return string.replace(/[^]/g, char => {
    const code = char.charCodeAt();

    if (code < 256) return char;

    const escape = code.toString(16);
    const long = escape.length > 2;
    return `\\${long ? 'u' : 'x'}${('0000' + escape).slice(long ? -4 : -2)}`;
  });
}

const ident = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;
function safeKey(string) {
  if (ident.test(string)) return string;
  else return JSON.stringify(string);
}

function stringify(tpl, opts) {
  let result;

  if (tpl.e) {
    let str = '{';
    let i = 0;
    for (const k in tpl) {
      if (i++ > 0) str += ',';
      if (k === 'e') {
        str += 'e:{';
        let i = 0;
        for (const k in tpl.e) {
          if (i++ > 0) str += ',';
          str += `${JSON.stringify(k)}:${tpl.e[k].toString()}`;
        }
        str += '}';
      } else {
        str += `${safeKey(k)}:${toString(tpl[k], opts)}`;
      }
    }
    result = str + '}';
  } else {
    result = toString(tpl, opts);
  }

  if (opts && opts.escapeUnicode) result = escape(result);

  return result;
}

function toString(thing, opts) {
  if (Array.isArray(thing)) {
    return '[' + thing.map(v => toString(v, opts)).join(',') + ']';
  } else if (typeof thing === 'object') {
    let str = '{';
    let trail = false;
    for (const k in thing) {
      if (thing[k] === undefined) continue;
      if (trail) str += ',';
      str += safeKey(k) + ':' + stringify(thing[k], opts);
      trail = true;
    }
    str += '}';
    return str;
  } else {
    return JSON.stringify(thing);
  }
}

function build(string, opts, readFile) {
  const rootOpts = Object.create(opts);
  rootOpts.interpolate = Object.assign({}, opts.interpolate, {
    script: false,
    style: false,
    template: false
  });
  const tpl = opts.Ractive.parse(string, rootOpts);
  const partials = {};
  let script = [];
  const style = [];

  const promises = [];

  // walk the template finding any script, style, or link tags to process them as appropriate
  let i = tpl.t.length;
  while (i--) {
    const item = tpl.t[i];
    // top-level elements
    if (item.t === 7) {
      if (item.e === 'script') {
        const type = getAttr('type', item);
        const id = getAttr('id', item) || getAttr('name', item);
        const src = getAttr('src', item);

        if (id && (type === 'text/ractive' || type === 'text/html')) {
          if (!src) {
            partials[id] = item.f[0];
          } else {
            promises.push(readFile(src).then(str => (partials[id] = str)));
          }
        } else if (!type || type === 'text/javascript' || type === 'application/javascript') {
          const rel = getAttr('rel', item);
          let cssFn;

          if (rel === 'css') {
            const name = getAttr('data-name', item) || 'data';
            cssFn = { name, type: 'fn' };
            style.unshift(cssFn);
          }

          if (!src) {
            if (cssFn) {
              cssFn.body = item.f.join('');
            } else {
              script.unshift(item.f);
            }
          } else {
            if (cssFn) {
              promises.push(readFile(src).then(str => (cssFn.body = str)));
            } else {
              script.unshift(`script!${src}`);
              promises.push(
                readFile(src).then(str => script.splice(script.indexOf(`script!${src}`), 1, str))
              );
            }
          }
        }

        i = drop(i, tpl.t);
      } else if (item.e === 'template') {
        const id = getAttr('id', item) || getAttr('name', item);
        if (id) {
          partials[id] = item.f ? item.f[0] : '';
        }

        i = drop(i, tpl.t);
      } else if (item.e === 'style') {
        const rel = getAttr('rel', item);

        if (rel === 'ractive') {
          style.unshift({ type: 'tpl', body: item.f[0] });
        } else {
          style.unshift({ type: 'css', body: item.f[0] || '' });
        }

        i = drop(i, tpl.t);
      } else if (item.e === 'link') {
        const href = getAttr('href', item);
        const type = getAttr('type', item);
        const rel = getAttr('rel', item);

        if (
          href &&
          (type === 'component' ||
            ((!type || type === 'text/css' || type === 'text/css+ractive') &&
              (rel === 'ractive' || rel === 'component')))
        ) {
          const css = { type: type === 'text/css+ractive' ? 'tpl' : 'css' };
          style.unshift(css);
          promises.push(readFile(href).then(str => (css.body = str)));
          // only links that are consumed are removed
          i = drop(i, tpl.t);
        }
      }
    }
  }

  return Promise.all(promises).then(() => {
    script = dedent(script.join(''));

    if (!script && opts.autoExport)
      script = `${tpl ? `export const template = $TEMPLATE;\n` : ''}${
        style.length ? `export const css = $CSS;\n` : ''
      }`;

    for (const k in partials) {
      if (!tpl.p) tpl.p = {};

      // just in case, don't overwrite any existing partial and skip empty partials
      if (tpl.p[k] || !partials[k]) continue;

      const t = opts.Ractive.parse(partials[k], opts);

      // copy any expressions
      if (t.e) {
        if (!tpl.e) tpl.e = {};
        for (const e in t.e) tpl.e[e] = t.e[e];
      }

      // copy any partials
      if (t.p) {
        for (const p in t.p) {
          if (!tpl.p[p]) tpl.p[p] = t.p[p];
        }
      }

      tpl.p[k] = t.t;
    }

    return Promise.all([
      compileCss(style, opts),
      reducePromiseFunctions(opts.partialProcessors, partials),
      reducePromiseFunctions(opts.templateProcessors, tpl)
    ]).then(list => {
      script = script.replace(/\$TEMPLATE/g, stringify(list[2], opts));
      script = script.replace(/\$CSS/g, list[0]);
      script = script.replace(/\$PARTIALS\['([-a-zA-Z0-9_\/]+)'\]/g, (m, n) =>
        stringify({ v: list[2].v, t: list[2].p[n] || '' }, opts)
      );
      script = script.replace(/\$PARTIALS/g, stringify(list[2].p || {}, opts));

      return reducePromiseFunctions(opts.scriptProcessors, script);
    });
  });
}

function dedent(string) {
  const lines = string.split(/\r\n|\r|\n/);
  let strip = /^\s*/.exec(lines[lines.length - 1]);
  if (!strip) return string;
  strip = strip[0];
  return lines.map(l => l.replace(strip, '')).join('\n');
}

const blank = /^\s*$/;
function drop(i, tpl) {
  tpl.splice(i, 1);
  while (blank.test(tpl[i])) tpl.splice(i, 1);
  let restart = i--;
  while (blank.test(tpl[i])) {
    tpl.splice(i, 1);
    restart--;
  }
  return restart;
}

function getAttr(name, node) {
  if (node.m) {
    let i = node.m.length;
    while (i--) {
      const a = node.m[i];
      // plain attribute with a matching name
      if (a.t === 13 && a.n === name && typeof a.f === 'string') return a.f;
    }
  }
}

function compileCss(styles, opts) {
  if (!styles.length || !styles.join('')) return Promise.resolve('""');

  const promises = [];

  styles.forEach(style => {
    if (style.type === 'tpl') {
      const styleOpts = Object.create(opts);
      styleOpts.textOnlyMode = true;
      style.compiled = `(function () { return this.Ractive({ template: ${stringify(
        opts.Ractive.parse(style.body, styleOpts),
        opts
      )}, data: this.cssData }).fragment.toString(false); }).call(this)`;
    } else if (style.type === 'fn') {
      let indent = /^\s/.exec(style.body);
      if (indent) indent = indent[0];
      else indent = '  ';
      style.compiled = `(function(${style.name || 'data'}) {\n${style.body
        .split(/\r\n|\r|\n/)
        .map(l => indent + l)
        .join('\n')}\n}).call(this, data)`;
    } else {
      promises.push(
        reducePromiseFunctions(opts.styleProcessors, style.body).then(
          css => (style.compiled = css.replace(/\s+/g, ' '))
        )
      );
    }
  });

  return Promise.all(promises).then(() => {
    const fn = styles.find(style => style.type === 'tpl' || style.type === 'fn');

    if (!fn) return JSON.stringify(styles.map(style => style.compiled).join(' '));

    return `function(data) { return [${styles
      .map(style => (style.type === 'css' ? JSON.stringify(style.compiled) : style.compiled))
      .join(', ')}].join(' '); }`;
  });
}

const ractives = {};
function getRactive(version) {
  if (!ractives[version]) {
    const main = Ractive.noConflict();
    const script = document.createElement('script');
    script.src = `//cdn.jsdelivr.net/npm/ractive@${version}`;
    document.querySelector('head').appendChild(script);
    let ok;
    const promise = new Promise(cb => {
      ok = cb;
    });

    function done() {
      ractives[version] = Ractive.noConflict();
      Ractive = main;
      ok(ractives[version]);
    }

    script.onload = done;
    script.onreadystatechange = function() {
      if (this.readyState === 'complete') done();
    }

    return promise;
  }
  else return Promise.resolve(ractives[version]);
}

const filter = /\.ractive\.html$/;
const RollupPlugin = {
  name: 'ractive-bin',
  transform(code, id) {
    if (!filter.test(id)) return null;
    return getRactive(app.get('unit.h.r') || 'latest').then(Ractive => {
      return build(code, { Ractive }, () => Promise.reject('nope, lol')).then(res => {
        return { code: res, map: { mappings: '' } };
      });
    });
  }
}

export default RollupPlugin;