(function () {
  var serve = require('koa-static')
  var koa = require('koa')
  var cors = require('koa-cors')

  var app = koa()

  app.use(cors())
  app.use(serve(__dirname + '/site'))

  var server = require('http').createServer(app.callback())
  var io = require('socket.io')(server)
  var connections = { white: new Map(), not: new Map() }
  var available = { white: new Map(), not: new Map() }
  var pconfig = { 'iceServers': [
    {
      'urls': 'stun:telnik.net:3478',
      'credential': process.env.TELNIK,
      'username': 'wsm'
    },
    {
      'urls': ['turn:telnik.net:3478?transport=udp',
        'turn:telnik.net:3478?transport=tcp'],
      'credential': process.env.TELNIK,
      'username': 'wsm'
    }
  ]}
  io.on('connection', function (socket) {
    console.log('init call')
    var initCall = function (peer1, peer2) {
      if ((typeof io.sockets.connected[peer1] !== 'undefined') &&
        (typeof io.sockets.connected[peer2] !== 'undefined')) {
        console.log(pconfig)
        if (available.not.has(peer2)) available.not.delete(peer2)
        if (available.not.has(peer1)) available.not.delete(peer1)
        if (available.white.has(peer1)) available.white.delete(peer1)
        if (available.white.has(peer2)) available.white.delete(peer2)
        connections.not.set(peer2, peer1)
        connections.white.set(peer1, peer2)
        io.sockets.connected[peer1].emit('call', pconfig, false)
        io.sockets.connected[peer2].emit('call', pconfig, true)
        console.log('call from ' + peer1 + ' to ' + peer2)
      }
    }
    socket.on('hello', function (data) {
      if (!data.white || (available.white.size && !available.not.size)) {
        console.log('new non white user')
        available.not.set(socket.id, true)
        var w = available.white.entries().next()
        if (typeof w['value'] !== 'undefined') initCall(w['value'][0], socket.id)
      } else {
        console.log('new white user')
        available.white.set(socket.id, true)
        var n = available.not.entries().next()
        if (typeof n['value'] !== 'undefined') initCall(socket.id, n['value'][0])
      }
      console.log('connected ' + socket.id)
      console.log('white ' + available.white.size)
      console.log('not ' + available.not.size)
    })
    socket.on('signal', function (data) {
      console.log('signal from ' + socket.id)
      console.log(data)
      var s = (connections.white.has(socket.id)) ? connections.white.get(socket.id) : connections.not.get(socket.id)
      if (typeof io.sockets.connected[s] !== 'undefined') {
        console.log('signal to ' + s)
        io.sockets.connected[s].emit('signal', data)
      }
    })
    socket.on('disconnect', function () {
      console.log('removing ' + socket.id)
      if (connections.white.has(socket.id)) connections.white.delete(socket.id)
      if (connections.not.has(socket.id)) connections.not.delete(socket.id)
      if (available.white.has(socket.id)) available.white.delete(socket.id)
      if (available.not.has(socket.id)) available.not.delete(socket.id)
    })
  })

  var port = process.env.PORT || 5000
  server.listen(port)

  console.log('listening on port ' + port)
}())

