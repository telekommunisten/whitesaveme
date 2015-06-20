"use strict"

var $ = require('jquery');
require('materialize');

jQuery(document).ready(function () {
  document.getElementsByTagName('body')[0]
    .innerHTML = require('../pages/hello.html!text');
});


