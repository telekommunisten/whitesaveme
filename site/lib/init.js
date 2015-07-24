/* global $ */

import 'whitesaveme.css!css'
import layout from 'lib/layout'
import xPages from 'components/pages.html!text'
$(document).ready(function () {
  $(function () {
    $('.button-collapse').sideNav()
    $('.slider').slider({full_width: true})
  })
  $('body').html(xPages)
  layout()
})
