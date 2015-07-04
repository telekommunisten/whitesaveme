/* global io */

import SimplePeer from 'simple-peer'

export default function (stream, white) {

  var socket = io(window.socketUrl)
  socket.on('connect', function () {
    socket.emit('hello', { white: white })
    console.log('connected to server')
  })

  socket.on('call', function (initiator) {
    console.log('recieving call')
    var peer = new SimplePeer({ initiator: initiator, stream: stream })

    peer.on('signal', function (data) {
      socket.emit('signal', JSON.stringify(data))
    })

    socket.on('signal', function (data) {
      peer.signal(data)
    })

    peer.on('stream', function (stream) {
      console.log('recieving stream')
      socket.emit('connected')
      var video = document.querySelector('#peerVideo')
      video.src = window.URL.createObjectURL(stream)
      video.play()
    })
  })
}
