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
var siteMenu = []
var addToSiteMap = function (name, slug, page, menu) {
  siteMap[slug] = { page: page, name: name }
  if (menu) siteMenu.push({ slug: slug, name: name })
}

import pageAbout from 'pages/about.html!text'
addToSiteMap('how it works', 'how', pageAbout, true)

import pageCall from 'pages/call.html!text'
addToSiteMap('try it now', 'call', pageCall, true)

import pageSuccess from 'pages/success.html!text'
addToSiteMap('success stories', 'success', pageSuccess, true)

import pageStory from 'pages/story.html!text'
addToSiteMap('our story', 'story', pageStory, true)

import pageFAQs from 'pages/faq.html!text'
addToSiteMap('FAQs', 'faq', pageFAQs, true)

import pageHome from 'pages/home.html!text'
addToSiteMap('home', 'home', pageHome, false)

import pagePartners from 'pages/partners.html!text'
addToSiteMap('partners', 'partners', pagePartners, false)

import pageContact from 'pages/contact.html!text'
addToSiteMap('contact', 'contact', pageContact, false)

import pageStatement from 'pages/statement.html!text'
addToSiteMap('statement', 'statement', pageStatement, false)

var siteOptions = { siteMenu: siteMenu, pageTitle: 'home', pageBody: pageHome }

// route
import start from 'lib/start'

riot.route(function (slug, id, action) {
  if (slug === 'call') {
    siteOptions['pageTitle'] = 'call'
    siteOptions['pageBody'] = pageCall
    riot.update()
    start()
  } else if (siteMap[slug]) {
    siteOptions['pageSlug'] = slug
    siteOptions['pageTitle'] = siteMap[slug]['name']
    siteOptions['pageBody'] = siteMap[slug]['page']
    riot.update()
  }
  window.scrollTo(0, 0)
})

// mount
export default function () {
  riot.mount('*', siteOptions)
  riot.route('home')
  riot.update()
}

