## Ractive.JS Playground

This is source for the Ractive.JS playground that's embedded at [ractive.js.org](https://ractive.js.org). It's a Ractive app (surprising, right?) that's built using the Ractive `bin`.

There are no transpilers or bundlers used at this time, only the Ractive component compiler, so all you need is `node` and `npm`. Here's how to build:

```sh
git clone https://github.com/ractivejs/playground.git
cd playground
npm i
node build
npm start
```

`npm start` will kick off an `http-server` instance pointed at your freshly build files. If you make any changes, you can leave the server running and just re-reun `npm run copmonents` in another shell and refresh the browser.

## Data

The runtime- and url-encoded- data is an object with the following structure that lives at `unit` in the main app:

```json
{
  "t": "the template",
  "s": "the script",
  "c": "the css",
  "e": "optional: script to evaluate after everything else",
  "m": "falsey: simple mode, 1: rollup mode",
  "fs": [{
    "name": "the filename",
    "content": "in rollup mode, fs is the list of files"
  }],
  "ef": "in follup mode, the entry file name",
  "h": {
    "r": "optional ractive version",
    "s": ["optional extra head scripts"]
  }
}
```

## Query Params

You can control a few aspects of the playground using query params, in case you want to embed it somewhere other than the docs.

* `env` - an optional environment. Settings are saved per-environment, so you can avoid colliding with the docs or plain playground by specifying your own.
* `fga` - an optional accent color - defaults to `00818a` - notice the missing `#`, which is supplied for you to avoid URL shenanigans.
* `fg` - an optional foreground color - defaults to `222`.
* `bg` - an optional background color - defaults to `fff`.
* `layout` - an optional default layout, that can be overridden by settings. If none is supplied, the width of the window will automatically select the best guess for most convenience. Values: `huge`, `large`, `medium`, `small`.
* `hidemenu` - keep the menu hidden by default
* `tab` - start on the given tab (if there are tabs in the layout): `script`, `html`, `css`, `output`, or `console`
* `file` - start on the given file by name (if there are files in the layout)

## Interacting with the playground window

If you can `postMessage` with the playground window, you can send it code to load and run. The data object can contain `code`, `run`, `eval`, and `tab` members.

* `code` - an encoded, stringified unit object
* `eval` - an encoded js string
* `run` - a boolean - `true` will cause the play button to automatically be pressed
* `tab` - a tab to switch to - `html`, `script`, `css`, `console`, or `output`
* `file` - a file name to switch to