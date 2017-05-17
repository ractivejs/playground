## Ractive.JS Playground

This is source for the Ractive.JS playground that's embedded at [ractive.js.org](https://ractive.js.org). It's a Ractive app (surprising, right?) that's build from two components using the `ractive` bin.

There are no transpilers or bundlers used at this time, only the Ractive component compiler, so all you need is `node` and `npm`. Here's how to build:

```sh
git clone https://github.com/ractivejs/playground.git
cd playground
npm i
node build
npm start
```

`npm start` will kick off an `http-server` instance pointed at your freshly build files. If you make any changes, you can leave the server running and just re-reun `npm run copmonents` in another shell and refresh the browser.
