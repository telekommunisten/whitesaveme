/* jshint esnext: true, asi: true */

import 'whitesaveme.css!css'

import layout from 'lib/layout'

$(document).ready(function () {
	$(function(){
		$('.button-collapse').sideNav()
	})
  layout();
})

