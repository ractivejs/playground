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

import './debug.js';

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

  if (params.hidemenu) Ractive.styleSet('shell.sides.initialTimeout', 1);

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

  const layouts = ['huge', 'large', 'medium', 'small'];
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
          let setting = this.get('settings.layout');
          if (!~layouts.indexOf(setting)) setting = null;
          return 'l-' + (this.get('unit.m') || 0) + '-' + (this.get('settings.layout') || (this.params && this.params.layout) || this.get('layout') || 'medium');
        },
        inCode() {
          this.get('settings.layout'); this.get('unit.m'); this.get('layout');
          const tab = document.querySelector('[data-script-tab]');
          const inCode = this.get('other.inCode');
          const files = this.get('unit.fs');
          return files && (!tab || (inCode && tab));
        },
        templates: {
          'Simple Entry Component': 'N4IgFiBcoE5SAbAhgFwKYGcUgL4BoQBbKARgIDMMoBtUAOyULXgEs6ATNADwDoYkAxihYA3NDzApCCEAQEB7OuiXwAPGBIA+ABJoECeXgAEwYAyZGAPpaMByAEqDhY2zhwBCVQHoNmgDp0AaoYAjAsAA4o-nRGRgp0WEYAguHhRgC8Ro5CouLcyuwAFMABsbHohOHI6JBGACQAKgCiALIACgAySc14pWUCGBi1dQDCAMpjvTH9gwCS7LW2SKm2fTgAlADcAX3xictpmQDubOzyRzwHGUZ0aEfJqcV95UgwAOZoKIsARvLsAJ6raYbbZ0bwhMKRaJBLD-BBoaKxDQmOLyAwwWoAYgADNiABwkPFITZGHBBLyw+HRXAAXQIaHIrA43D4TlyEikMhwQA',
          'Simple Entry JS': 'N4IgFiBcoE5SAbAhgFwKYGcUgL4BoQBbKARgIDMMoBtUAOyULXgEs6ATNADwDoArKgQDGAezrpx8UXSwACAIIAHRbIC8sgEpIhKFgDc0PbhPYAKYAB06FlOkKLk6SLIAGAHjAkAfAAk0CBBE8WWBgBiZZAB9I2QByLR19NFicHABCNwB6Ty8XPCtZWSEMDGcXTxCikUCYZwBiAAYGgA4SZqQAblkcPIKikoBJdmdYpGVYqxwASg6rK2k5MZV1AHc2dhEVniW1WTo0FYVlcz6UJBgAczQUEYAjEXYATwm6aY7cAF0CNHJWDm5+FQcEA',
          'Split Entry Component': 'N4IgFiBcoE5SAbAhgFwKYGcUgL4BoQBbKARgIDMMoBtUAOyULXgEs6ATNADwDoArKgQDGAezrpxrQgAcRMFAAJgC9DOTo8CoRgwKcC8jBGEFAch4B6Np14wkQlCwBuaHmBSEEpgNwAdOv6idFgKAILS0goAvAoASvaOLjzcEuwAFMD+vijaGJqq0upoeP4KWjoAkuyQZkgRpv44AJR+AXRBIXWRMQDu1iI9PF3RCnRoPWERGaUqSDAA5mgoNaYARiLsAJ4NdM3euHj0jMyQINbcPHYOzq7uniDCYhLYpwA8YCQAfAASaAgIIk0wGADCYCgAPuCzPFri5TDgcABCV4WD6fLJ0V5YTYINDouhlD5KLQiAEwGoAYgADFSABwkWlIbx6fwo7G4z64AC6BDQ5FYHAuAlwQA',
          'Basic App Template': 'N4IgFiBcoE5SAbAhgFwKYGcUgL4BoQBbKARgIDMMoBtUAOyULXgEs6ATNADwDoArKgQDGAezrpxrQgAcRMFAAIAgtOkLyMEYQUByHgHoV0nQG4AOnQui6WBUlUKAvAoDubdiJc97a53TQuyqoAFMAWCgooSDAA5mgokLoARiLsAJ46FjgAlCa4ePSMzJAgRjwwSEIoLABuaDxgKIQIIMJiEtglADxgJAB8ABJoCAgieArAwAxMCgA+s7oASpXVdTo4OACEXfq9fRZdSQCuKChiCmIAtEIILEIA1o5mIAACPEwoYKnB2c-7dBEAMK3B4KACyaE2B30x1OYn+BywaQQaH+EV6EwUolGMESAGIAAwEgAcJGJSBMChw0KRKL6+UKTHgZQErRA1g6Ulk8kx6BkyHQ4yEGAwVPUmm0ekMqnKK1q9UazVMFgs3G5ik45CQRwQihuSBFQTU3Ak7FFyyq8om4SxYiwMCOVTkwRE0hQGGymIwR2kaBgLrdHsp1IBChtHy+7B+1tDEWsGBEKJ4oxiwR0EdSmx0uRtIZDFgtq3qJrQHAA6ixPsEjOMwpYUMKMOM+dIBWg8DbGwBJdiJHQ+TJ0HJ5HAAXQIaHIrA43H4VBwQA',
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
        this.menuTabs.select(1);
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
    },
    tab(tab) {
      const attr = `data-${tab}-tab`;
      const node = document.querySelector(`[${attr}]`);
      if (node) {
        const tabs = this.getContext(node).ractive;
        tabs.select(+node.getAttribute(attr));
        setTimeout(() => tabs.updateIndicator(), 100);
      }
    },
    file(name) {
      const files = this.get('unit.fs');
      if (files) {
        const idx = files.findIndex(f => f.name === name);
        if (idx) this.set('other.selectedFile', idx);
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

  setTimeout(() => unit(app), 14);
  settings(app);
  ipc(app);

  app.render(document.body);

  if (params.tab) app.tab(params.tab);
  if (params.file) app.file(params.file);
}
