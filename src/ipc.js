import lz from 'lz-string';

export default function ipc(app) {
  window.addEventListener('message', function(event) {
    if (event.data.log) { // aparently firefox doesn't isTrusted the same way chrome does
      const csl = app.find('.console');
      const scroll = csl.scrollTop + csl.clientHeight >= csl.scrollHeight - 5;
      const idx = (app.get('messages') || []).length - 1;
      let last = (app.get('messages') || [])[idx];
      const message = event.data.log.join('\n');

      if (last && last.message === message && last.type === event.data.type) {
        if (typeof last.count !== 'number') app.set(`messages.${idx}.count`, 2);
        else app.add(`messages.${idx}.count`);
      } else {
        app.push('messages', { type: event.data.type, message });
        if (scroll) {
          csl.scrollTop = csl.scrollHeight - csl.clientHeight;
        }
      }

      const content = document.querySelector('[data-console-tab]');
      if (content) {
        const ctx = Ractive.getContext(content);
        if (content.getAttribute('data-console-tab') != ctx.get('~/selected')) {
          const tab = ctx.ractive.find(`[data-tab-index="${content.getAttribute('data-console-tab')}"]`);

          if (!tab.tm) tab.tm = { count: 0 };

          if (!tab.tm.count) tab.tm.color = getComputedStyle(tab).backgroundColor;
          tab.tm.count++;

          tab.style.transitionProperty = 'none';
          tab.style.backgroundColor = '#ee6';
          
          setTimeout(() => {
            tab.style.transitionDuration = '1s';
            tab.style.transitionDelay = '0.1s';
            tab.style.transitionProperty = 'background-color';
            tab.style.backgroundColor = tab.tm.color;

            setTimeout(() => {
              tab.tm.count--;
              if (!tab.tm.count) {
                tab.style.transitionProperty = '';
                tab.style.transitionDuration = '';
                tab.style.transitionDelay = '';
              }
            }, 1000);
          }, 100);
        }
      }
    }
    
    if (event.data.eval && !event.data.code) {
      app.set('eval.str', lz.decompressFromEncodedURIComponent(event.data.eval));
      app.eval();
    } else if (event.data.code) {
      app.fire('pasted-content', {}, event.data.code);
      if (event.data.eval) app.set('unit.e', lz.decompressFromEncodedURIComponent(event.data.eval));
      if (event.data.run || event.data.eval) {
        app.fire('play');
      }
    }

    if (event.data.tab) {
      const name = `data-${event.data.tab}-tab`;
      const tab = document.querySelector(`[${name}]`);
      if (tab) {
        app.getContext(tab).ractive.select(+tab.getAttribute(name));
      }
    }
  }, false);
}