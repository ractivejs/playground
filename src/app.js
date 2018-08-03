import Ractive from 'ractive';

import AppBar from '@evs-chris/raui/es/AppBar';
import Menu from '@evs-chris/raui/es/Menu';
import Shell from '@evs-chris/raui/es/Shell';
import Split from '@evs-chris/raui/es/Split';
import Tabs from '@evs-chris/raui/es/Tabs';
import codemirror from '@evs-chris/raui/es/codemirror';
import keys from '@evs-chris/raui/es/event-keys';
import button from '@evs-chris/raui/es/button';

import play, { outputFrame } from './play.js';
import settings from './settings.js';
import unit from './unit.js'
import ipc from './ipc.js';

export default function init(template, css) {
  const params = window.location.search.slice(1).split('&').map(p => p.split('=')).reduce((a, c) => {
    a[c[0]] = c.length === 1 || c[1];
    return a;
  }, {});

  Ractive.DEBUG = /minified/.test(function() { /* minified */ });
  Ractive.styleSet('raui.primary.fga', params.fga ? `#${params.fga}` : '#00818a');
  Ractive.styleSet('raui.primary.fg', params.fg ? `#${params.fg}` : '#222');
  Ractive.styleSet('raui.primary.bg', params.bg ? `#${params.bg}` : '#fff');
  Ractive.styleSet('raui.menu.primary.fga', params.fg ? `#${params.fg}` : '#222');

  Ractive.styleSet({
    'raui.tabs.menu': {
      bg: '#222',
      fg: '#fff',
      fga: '#fff'
    },
    'raui.tabs.themes': ['menu']
  });

  class App extends Ractive {
    constructor(opts) { super(opts); }

    eval(ev) {
      const str = this.get('eval.str');
      outputFrame.contentWindow.postMessage({ eval: str }, '*');
      this.set('eval.str', '');
      if (str !== this.get('eval.list.0')) this.unshift('eval.list', str);
      this.set('eval.idx', -1)
    }

    evalUp(ev) {
      const idx = this.get('eval.idx') || 0;
      const list = this.get('eval.list');
      if (list && idx + 1 < list.length) {
        this.add('eval.idx');
        this.set('eval.str', list[idx + 1]);
        if (this.consoleInput) {
          this.consoleInput.decorators.codemirror.editor.setCursor({ line: 0, ch: list[idx + 1].length });
        }
      }
    }

    evalDown(ev) {
      const idx = this.get('eval.idx') || -1;
      const list = this.get('eval.list');
      if (list && idx - 1 >= 0) {
        this.subtract('eval.idx');
        this.set('eval.str', list[idx - 1]);
        if (this.consoleInput) {
          this.consoleInput.decorators.codemirror.editor.setCursor({ line: 0, ch: list[idx - 1].length });
        }
      } else if (list && idx < 1) {
        this.set('eval.str', '');
        this.set('eval.idx', -1);
      }
    }
  }

  Ractive.extendWith(App, {
    template, css,
    cssId: 'app',
    noCssTransform: true,
    use: [AppBar(), Menu(), Shell(), Split(), Tabs(), codemirror({ lineNumbers: true }).plugin, keys(), button()],
    decorators: {
      output(node) {
        node.appendChild(outputFrame);

        node.style.position = 'relative';
        node.style.width = '100%';
        node.style.height = '100%';

        return {
          teardown() {
            node.removeChild(outputFrame);
          }
        }
      }
    },
    data() {
      return {
        pickLayout() {
          this.set('other.inCode', false);
          return 'l-' + (this.get('unit.m') || 0) + '-' + (this.get('settings.layout') || (this.params && this.params.layout) || this.get('layout') || 'medium');
        }
      }
    },
    computed: {
      fileMode() {
        const idx = this.get('other.selectedFile');
        const file = this.get(`unit.fs.${idx}`);
        if (file && file.name) {
          let ext = file.name.match(/((?:\.[^\.]+)+)$/);
          if (ext) {
            ext = ext[0];
            switch (ext) {
              case '.js': return 'javascript';
              case '.css': return 'css';
              case '.ractive.html': return { base: 'text/html', name: 'handlebars' };
              case '.html': return 'html';
              default: 'text';
            }
          }
        }
        return 'text';
      }
    },
    on: {
      render() {
        this.shell = this.findComponent('shell');
        this.menu = this.findComponent('menu');
      },
      play,
      select(ctx, idx) {
        this.set('other.selectedFile', idx);
      }
    },
    observe: {
      'other.mobile': {
        handler(v) {
          this.get('settings.editor').mobile = v;
          if (window.localStorage) {
            window.localStorage.setItem('ractive-playground-settings', JSON.stringify(this.get('settings')));
          }
        },
        init: false
      },
      'unit.m'(v) {
        if (!v) {
          this.set('unit.fs', undefined);
        }

        if (v === 1) {
          const unit = this.get('unit');
          if (!unit.fs || !unit.fs.length) {
            const script = unit.s ? unit.s : `const App = Ractive.extend({
    template: $TEMPLATE,
    css: $CSS,
    cssId: 'app'
  });

  const app = window.app = new App({
    target: 'body'
  });`;
            const tpl = unit.t ? unit.t : `<h1>Hello, {{name || 'Ractive'}}!</h1>`
            this.set('unit.fs', [{
              name: 'index.ractive.html',
              content: `${tpl}\n\n<${''}script>\n${script.replace(/^(.)/gm, '  $1')}\n<${''}/script>\n\n<style>\n${this.get('unit.c').replace(/^(.)/gm, '  $1') || '  h1 { color: #00818a; }'}\n</style>\n`
            }]);
            this.set('unit.ef', 'index.ractive.html');
          }
          this.set('other.selectedFile', 0);
          setTimeout(() => this.menuTabs && this.menuTabs.select(0));
        }
      }
    }
  });

  const app = window.app = new App({
    data: {
      unit: { t: '', s: '', c: '' },
      eval: ''
    },
    on: {
      render: {
        once: true,
        handler() { setTimeout(() => this.fire('play', null, { init: params.env !== 'docs' }), 1); }
      }
    },
    params,
    env: params.env
  });

  app.set('other.hidemenu', params.hidemenu);

  function autoLayout() {
    if (window.innerWidth > 1599) app.set('~/layout', `huge`);
    else if (window.innerWidth > 1200) app.set('~/layout', `large`);
    else if (window.innerWidth > 800) app.set('~/layout', `medium`);
    else app.set('~/layout', `small`);
  }
  window.addEventListener('resize', autoLayout);
  autoLayout();

  unit(app);
  settings(app);
  ipc(app);

  app.render(document.body);
}