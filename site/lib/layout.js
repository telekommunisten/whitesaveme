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

var siteMap = {}
var addToSiteMap = function (name, slug, page) {
  siteMap[slug] = { page: page, name: name }
}

import pageAbout from 'pages/about.html!text'
addToSiteMap('how it works', 'how', pageAbout)

import pageStart from 'pages/start.html!text'
addToSiteMap('try it now', 'try', pageStart)

import pageSuccess from 'pages/success.html!text'
addToSiteMap('success stories', 'success', pageSuccess)

import pageStory from 'pages/story.html!text'
addToSiteMap('our story', 'story', pageStory)

import pageFAQs from 'pages/faq.html!text'
addToSiteMap('FAQs', 'faq', pageFAQs)

import pageHome from 'pages/home.html!text'
import pageCall from 'pages/call.html!text'

var siteOptions = { siteMap: siteMap, pageTitle: 'home', pageBody: pageHome }

// route
import start from 'lib/start'

riot.route(function (slug, id, action) {
  if (siteMap[slug]) {
    siteOptions['pageSlug'] = slug
    siteOptions['pageTitle'] = siteMap[slug]['name']
    siteOptions['pageBody'] = siteMap[slug]['page']
    riot.update()
  } else if (slug === 'home') {
    siteOptions['pageTitle'] = 'home'
    siteOptions['pageBody'] = pageHome
    riot.update()
  } else if (slug === 'call') {
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
