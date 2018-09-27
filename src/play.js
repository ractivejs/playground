import rollup from './rollup';

export const outputFrame = document.createElement('iframe');
outputFrame.className = 'output';

const consoleRedirect = `
<${''}script>(function() {
var csl = console.log, csw = console.warn; cse = console.error; csi = console.info || console.log;
function proxy(fn, type) {
  return function() {
    var args = Array.prototype.slice.call(arguments);
    try {
      window.parent.postMessage({ log: args.map(a => {
        if (!a) return a === undefined ? 'undefined' : JSON.stringify(a);
        else if (typeof a === 'string' || typeof a === 'number' || typeof a === 'boolean') return a;
        else if (typeof a === 'function') return a.toString();
        else if (a.stack) return a.stack;
        else if (typeof a === 'object') return JSON.stringify(a, null, '  ');
        else return '???';
      }), type: type }, '*');
    } catch (e) {
      window.parent.postMessage({ log: ['Failed to proxy message from output console.', e.message], type: 'error' }, '*');
    }
    fn.apply(console, args);
  };
}

console.log = proxy(csl, 'log');
console.warn = proxy(csw, 'warn');
console.error = proxy(cse, 'error');
console.info = proxy(csi, 'info');
var result = proxy(csl, 'result');

window.addEventListener('message', function(ev) {
  if (ev.data.eval) {
    try {
      result(eval(ev.data.eval));
    } catch (e) {
      console.error(e.stack);
    }
  }
});

window.onerror = function(message, source, line, col, err) { console.error(message, err); }
})();
//# sourceURL=util.js
<${''}/script>`;

export default function play(ctx, opts) {
  const unit = (opts && opts.init) ? {} : this.get('unit');
  let render;

  if (!unit.m) {
    let tpl = unit.t;
    if (!tpl && !unit.s && !unit.c) tpl = `<style>html { height: 100%; } body { display: flex; flex-direction: column; align-items: center; justify-content: center; color: #ccc; padding: 2em; margin: 0; height: 100%; box-sizing: border-box; text-align: center; }</style><h1>Output</h1><h3>Click the play button in the upper-left corner to run</h3>`;
    var scripts = ((unit.h || {}).s || []).map(function(s) { return `\n\t\t<${''}script src="${s}"><${''}/script>`; }).join('');
    if (unit.h && unit.h.r) scripts = `\n\t\t<${''}script src="//cdn.jsdelivr.net/npm/ractive@${unit.h.r}/ractive.js${this.get('other.cacheBust') ? `?${+new Date()}` : ''}"><${''}/script>` + scripts;
    scripts += consoleRedirect;
    const ev = unit.e ? `<${''}script>${unit.e}\n//# sourceURL=eval.js\n<${''}/script>\n` : '';
    if (ev) delete unit.e;
    const html = Promise.resolve(`<!DOCTYPE html>
  <html>
  <head>
  <title>Ractive Playground Output</title>
  <style>${unit.c || ''}
  /*# sourceURL=style.css */
  </style>${scripts}
  </head>
  <body>
  ${(tpl || '').replace(/\n/g, '\n\t\t')}
  <${''}script>${unit.s || ''}
  //# sourceURL=script.js
  <${''}/script>
  ${ev}
  </body>
  </html>`);

    render = html;
  } else if (unit.m === 1) {
    const files = this.get('unit.fs');
    const entry = this.get('unit.ef') || 'index.ractive.html';
    const index = files.find(f => f.name === entry);
    if (index) {
      render = rollup(this, entry).then(src => {
        return `<!DOCTYPE html>
<html>
<head>
<title>Ractive Playground Output</title>
${consoleRedirect}
${unit.h && unit.h.r ? `<${''}script src="//cdn.jsdelivr.net/npm/ractive@${unit.h.r}/ractive.js${this.get('other.cacheBust') ? `?${+new Date()}` : ''}"><${''}/script>\n` : ''}
${unit.h && unit.h.s ? unit.h.s.map(s => `<${''}script src="${s}"><${''}/script>`).join('\n') : ''}
</head>
<body>
<${''}script>${src}
//# sourceURL=script.js
<${''}/script>
</body>
</html>`;
      });
    }
  }

  if (render && render.then) {
    render.then(html => {
      if (outputFrame.contentWindow) {
        outputFrame.contentWindow.location = 'about:blank';

        setTimeout(function() {
          var doc = outputFrame.contentDocument;
          doc.open();
          doc.write(html);
          doc.close();
        }, 1);

        const tab = document.querySelector('[data-output-tab]');
        if ((!opts || !opts.init) && tab) {
          Ractive.getContext(tab).ractive.select(+tab.getAttribute('data-output-tab'));
        }
      }
    });
  }
}