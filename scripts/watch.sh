#!/bin/sh

export PATH="./node_modules/.bin:../node_modules/.bin:$PATH"

if [ -z "$PORT" ]; then
  PORT=3000
fi

http-server -c-1 -p $PORT public &
rollup -c -w