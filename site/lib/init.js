/* jshint esnext: true, asi: true */

import 'materialize'
import 'whitesaveme.css!css'

import $ from 'jquery'
import layout from 'lib/layout'

$(document).ready(function () {
	$(function(){
		$('.button-collapse').sideNav()
	})
  layout();
})

