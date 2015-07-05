/* global io, skylink, attachMediaStream */

export default function (stream, white) {

  var socket = io(window.socketUrl)
  socket.on('connect', function () {
    socket.emit('hello', { white: white })
    console.log('connected to server')
  })

  socket.on('call', function (room, skykey) {
    console.log('call from room ' + room + ' with key ' + skykey)
    var skylink = new Skylink()
    skylink.init('4182d87f-f849-4a41-8c84-2863e66cb3ed', function () {
      console.log('skylink initialzed')
      attachMediaStream(document.getElementById('inputVideo'), stream)
      skylink.on('incomingStream', function(peerId, stream, isSelf) {
        if(!isSelf) {
          console.log('incoming stream')
          attachMediaStream(document.getElementById('peerVideo'), stream)
          socket.emit('connected')
        }
      })
      skylink.joinRoom({
          audio: true,
          video: true
      });
    });
  })
}
