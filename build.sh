#!/bin/sh
node_modules/.bin/jspm install
node_modules/.bin/jspm bundle-sfx 'lib/init'
cp site/build.js site/whitesaveme.js
cp site/whitesaveme.css site/whitesaveme.min.css
cp site/bundle.html site/index.html
