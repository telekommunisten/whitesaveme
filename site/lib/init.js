/* jshint esnext: true, asi: true */

import 'whitesaveme.css!css'
import layout from 'lib/layout'
import xPages from 'components/pages.html!text'

$(document).ready(function () {
	$(function(){
		$('.button-collapse').sideNav()
	})
  $('body').html(xPages)
  layout();
})

