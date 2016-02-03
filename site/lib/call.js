/* global io, $ */

import SimplePeer from 'lib/vendor/simplepeer.min'

export default function (stream, white) {
  var socket = io(window.socketUrl)
  socket.on('connect', function () {
    socket.emit('hello', { white: white })
    console.log('connected to server!')
    $('#whiteness').hide()
  })
  socket.on('call', function (config, initiator) {
    console.log('call recieved')
    var options = { initiator: initiator, stream: stream }
    /* if (typeof config === 'object') {
      options['config'] = config
    } */
    var peer = new SimplePeer(options)
    peer.on('signal', function (data) {
      try {
        socket.emit('signal', JSON.stringify(data))
        console.log('signal sent')
      catch (e) {
        console.log('signal emit failed with', e)
      }
    })
    peer.on('stream', function (stream) {
      console.log('stream recieved')
      var video = document.querySelector('#peerVideo')
      video.src = window.URL.createObjectURL(stream)
      video.play()
    })
    socket.on('signal', function (data) {
      try {
        peer.signal(data)
        console.log('peer signal recieved')
      } catch (e) {
        console.log('peer signal failed with', e)
      }
    })
  })
}
