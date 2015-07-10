/* global io */

import SimplePeer from 'lib/vendor/simplepeer.min'

export default function (inputStream, white) {
  var socket = io(window.socketUrl)
  socket.on('connect', function () {
    socket.emit('hello', { white: white })
    console.log('connected to server!')
  })
  socket.on('call', function (iceServers, initiator) {
    console.log('call recieved')
    var peer = new SimplePeer({ initiator: initiator, stream: inputStream })
    //var peer = new SimplePeer({ initiator: initiator, stream: inputStream, config: { iceServers: iceServers } })
    peer.on('signal', function (data) {
      socket.emit('signal', JSON.stringify(data))
    })
    peer.on('stream', function (stream) {
      socket.emit('connected')
      var video = document.querySelector('#peerVideo')
      video.src = window.URL.createObjectURL(stream)
      video.play()
    })
    socket.on('signal', function (data) {
      peer.signal(data)
    })
  })
}
