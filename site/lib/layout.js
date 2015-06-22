/* jshint esnext: true, asi: true */

import Riot from 'riot'

// components

import xHeader from 'components/header.html!text'
Riot.tag('x-header', xHeader)

Riot.tag('x-main',
  `<div id="main"></div>`,
  function(opts) {
    this.on('update',function () {
      $('#main').html(opts.pageBody)
    })
  }
)

import xFooter from 'components/footer.html!text'
Riot.tag('x-footer', xFooter)

// pages

let siteMap = {}
let addToSiteMap = function(name, page) {
  siteMap[name]= page
}

import pageHome from 'pages/home.html!text'
addToSiteMap('home', pageHome)

import pageStory from 'pages/story.html!text'
addToSiteMap('story', pageStory)

import pageContact from 'pages/contact.html!text'
addToSiteMap('contact', pageContact)

import pageAbout from 'pages/about.html!text'
addToSiteMap('about', pageAbout)

let siteOptions = { siteMap: siteMap, pageTitle: 'home', pageBody: pageHome }

// route

Riot.route(function(collection, id, action) {
  console.log('clicked ' + collection);
  if (siteMap[collection]) {
    siteOptions['pageTitle'] = collection
    siteOptions['pageBody'] = siteMap[collection]
    Riot.update()
  } 
})

// mount
export default function() {
  Riot.mount('*', siteOptions)
  Riot.route('home');
  Riot.update();
}

