/* global $, riot */

// components

import xHeader from 'components/header.html!text'
riot.tag('x-header', xHeader)

riot.tag('x-main',
  `<div id="main"></div>`,
  function (opts) {
    this.on('update', function () {
      $('#main').html(opts.pageBody)
    })
  }
)

import xFooter from 'components/footer.html!text'
riot.tag('x-footer', xFooter)

// pages

let siteMap = {}
let addToSiteMap = function (name, page) {
  siteMap[name] = page
}

import pageAbout from 'pages/about.html!text'
addToSiteMap('how it works', pageAbout)

import pageStart from 'pages/start.html!text'
addToSiteMap('try it now', pageStart)

import pageSuccess from 'pages/success.html!text'
addToSiteMap('success stories', pageSuccess)

import pageStory from 'pages/story.html!text'
addToSiteMap('our story', pageStory)

import pageFAQs from 'pages/faq.html!text'
addToSiteMap('FAQs', pageFAQs)

import pageHome from 'pages/home.html!text'
import pageCall from 'pages/call.html!text'

let siteOptions = { siteMap: siteMap, pageTitle: 'home', pageBody: pageHome }

// route
import start from 'lib/start'

riot.route(function (page, id, action) {
  if (siteMap[page]) {
    siteOptions['pageTitle'] = page
    siteOptions['pageBody'] = siteMap[page]
    riot.update()
  } else if (page === 'home') {
    siteOptions['pageTitle'] = 'home'
    siteOptions['pageBody'] = pageHome
    riot.update()
  } else if (page === 'call') {
    siteOptions['pageTitle'] = 'call'
    siteOptions['pageBody'] = pageCall
    riot.update()
    start()
  }
})

// mount
export default function () {
  riot.mount('*', siteOptions)
  riot.route('home')
  riot.update()
}
