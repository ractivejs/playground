import debounce from 'lodash-es/debounce';

export default function settings(app) {
  if (window.localStorage) {
    var start = window.localStorage.getItem(`ractive-playground-settings${app.env ? `[${app.env}]` : ''}`);

    if (start) app.set('settings', JSON.parse(start));
    else app.set('settings.editor', { autoTag: true, autoBracket: true, highlightActive: true, wrap: true }, { deep: true });

    app.observe('settings', debounce(function(value) {
        window.localStorage.setItem(`ractive-playground-settings${app.env ? `[${app.env}]` : ''}`, JSON.stringify(value));
    }, 3000), { init: false });

    app.set('other.mobile', app.get('settings.editor.mobile'));
  } else {
    app.set('settings.editor', { autoTag: true, autoBracket: true, highlightActive: true, wrap: true }, { deep: true });
  }
}