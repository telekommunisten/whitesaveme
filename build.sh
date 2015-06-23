#!/bin/sh
jspm bundle-sfx 'lib/init'
uglify -s site/build.js -o site/whitesaveme.js
uglify -cs site/whitesaveme.css -o site/whitesaveme.min.css
uglify -cs site/bundle.html -o site/index.html
