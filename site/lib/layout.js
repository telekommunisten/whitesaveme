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

import pageHome from 'pages/home.html!text'
addToSiteMap('home', pageHome)

import pageStory from 'pages/story.html!text'
addToSiteMap('our story', pageStory)

import pageContact from 'pages/contact.html!text'
addToSiteMap('success stories', pageContact)

import pageAbout from 'pages/about.html!text'
addToSiteMap('about', pageAbout)

import pageStart from 'pages/start.html!text'
addToSiteMap('start', pageStart)

import pageCall from 'pages/call.html!text'

let siteOptions = { siteMap: siteMap, pageTitle: 'home', pageBody: pageHome }

// route
import start from 'lib/start'

riot.route(function (page, id, action) {
  if (siteMap[page]) {
    siteOptions['pageTitle'] = page
    siteOptions['pageBody'] = siteMap[page]
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
