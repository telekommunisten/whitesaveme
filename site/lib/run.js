"use strict"

var $ = require('jquery');
require('materialize');

require('style.css!css');

jQuery(document).ready(function () {
  document.getElementsByTagName('body')[0]
    .innerHTML = require('../pages/hello.html!text');
  require('lib/init');
});


