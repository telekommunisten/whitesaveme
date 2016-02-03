#!/bin/sh
node_modules/.bin/jspm install
#node_modules/.bin/jspm bundle-sfx 'lib/init'
node_modules/.bin/jspm bundle-sfx 'lib/init'
node_modules/.bin/uglifyjs site/build.js -vo site/whitesaveme.js
#uglify -s site/build.js -o site/whitesaveme.js
#uglify -cs site/whitesaveme.css -o site/whitesaveme.min.css
cp site/bundle.html site/index.html
