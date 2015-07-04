;(function () {
  'use strict'
  var serve = require('koa-static')
  var koa = require('koa')
  var app = koa()

  app.use(serve(__dirname + '/site'))

  var server = require('http').createServer(app.callback())
  var io = require('socket.io')(server)
  var connections = { white: new Map(), not: new Map() }
  io.on('connection', function (socket) {
    var initCall = function (peer1, peer2) {
      if ((typeof io.sockets.connected[peer1] !== 'undefined') &&
           (typeof io.sockets.connected[peer2] !== 'undefined')) {
        io.sockets.connected[peer1].emit('call', false)
        io.sockets.connected[peer2].emit('call', true)
        connections.not.set(peer2, peer1)
        connections.white.set(peer1, peer2)
        console.log('call from ' + peer1 + ' to ' + peer2)
      }
    }
    socket.on('hello', function (data) {
      if (!data.white || (connections.white.size && !connections.not.size)) {
        console.log('new non white user')
        connections.not.set(socket.id, true)
        let e = connections.white.entries().next()
        if (typeof e['value'] !== 'undefined') initCall(e['value'][0], socket.id)
      } else {
        console.log('new white user')
        connections.white.set(socket.id, true)
        let e = connections.not.entries().next()
        if (typeof e['value'] !== 'undefined') initCall(socket.id, e['value'][0])
      }
      console.log('connected ' + socket.id)
    })
    socket.on('signal', function (data) {
      var s = (connections.white.has(socket.id)) ? connections.white.get(socket.id) : connections.not.get(socket.id)
      if (typeof io.sockets.connected[s] !== 'undefined') {
        io.sockets.connected[s].emit('signal', data)
      }
    })
    var remove = function (s) {
      if (connections.white.has(s)) connections.white.delete(s)
      if (connections.not.has(s)) connections.white.delete(s)
    }
    socket.on('connected', function () {
      remove(socket.id)
    })
    socket.on('disconnect', function () {
      remove(socket.id)
    })
  })

  var port = process.env.PORT || 5000
  server.listen(port)

  console.log('listening on port ' + port)
}())
