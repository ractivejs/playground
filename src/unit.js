import lz from 'lz-string';
import debounce from 'lodash-es/debounce';

export default function unit(app) {
  app.observe('unit', debounce(function(value) {
    const str = JSON.stringify(value);
    const compressed = lz.compressToEncodedURIComponent(str);
    this.set('compressed', compressed);

    const l = window.location;
    const url = l.protocol + '//' + l.host + l.pathname + l.search + '#' + compressed;

    if (!this.get('settings.skipUrlUpdate')) {
      window.location.replace(url);
    }

    this.set({ 'other.url': url, 'other.encoded': compressed });
  }, 3000, app), { init: false });

  if (window.location.hash) {
    try {
      const unit = JSON.parse(lz.decompressFromEncodedURIComponent(window.location.hash.slice(1)));
      if (unit) {
        app.set('unit', unit);
      }
    } catch (e) {
      console.error('Failed to load hashed content', e);
    }
  }

  app.on('pasted-content', (ctx, content) => {
    try {
      const unit = JSON.parse(lz.decompressFromEncodedURIComponent(content));
      if (unit) {
        app.set('unit', unit);
      }
    } catch (e) {
      console.error('Failed to load pasted content', e);
    }
  });

  app.on('encode-text', (ctx, txt) => {
    try {
      app.set('other.helpDecode', lz.compressToEncodedURIComponent(txt));
    } catch (e) {}
  });

  app.on('decode-text', (ctx, txt) => {
    try {
      app.set('other.helpEncode', lz.decompressFromEncodedURIComponent(txt));
    } catch (e) {}
  })
}