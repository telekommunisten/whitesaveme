/* global io, Skylink, attachMediaStream */

export default function (inputStream, white) {
  var skylink = new Skylink()
  skylink.on('incomingStream', function (peerId, stream, isSelf) {
    console.log('incomming stream')
    if (isSelf) {
      var peer = document.getElementById('inputVideo')
      attachMediaStream(peer, stream)
      console.log('input connected')
    } else {
      console.log('peer stream')
      var peer = document.getElementById('peerVideo')
      attachMediaStream(peer, stream)
      socket.emit('connected')
    }
  })
  skylink.init({ apiKey: '4182d87f-f849-4a41-8c84-2863e66cb3ed' }, function (error, success) {
    if (error) {
      console.log('skylink failed ' + JSON.stringify(error))
    } else {
      console.log('skylink init ' + JSON.stringify(success))
    }
    var socket = io(window.socketUrl)
    socket.on('connect', function () {
      socket.emit('hello', { white: white })
      console.log('connected to server!')
    })
    socket.on('call', function (room) {
      console.log('call from room ' + 'room' )
      skylink.joinRoom('room', { audio: false, video: true })
    })
  })
}
