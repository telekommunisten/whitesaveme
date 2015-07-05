(function () {
  var serve = require('koa-static')
  var koa = require('koa')
  var cors = require('koa-cors');

  var app = koa()
  app.use(cors());
  app.use(serve(__dirname + '/site'))

  var server = require('http').createServer(app.callback())
  var io = require('socket.io')(server)
  var connections = { white: new Map(), not: new Map() }
  io.on('connection', function (socket) {
    var initCall = function (peer1, peer2) {
      if ((typeof io.sockets.connected[peer1] !== 'undefined') &&
        (typeof io.sockets.connected[peer2] !== 'undefined')) {
        var room = ['whitesaveme', peer1, peer2].join('/')
        io.sockets.connected[peer1].emit('call', room, '8fy08skh8k1hh')
        io.sockets.connected[peer2].emit('call', room, '8fy08skh8k1hh')
        connections.not.set(peer2, peer1)
        connections.white.set(peer1, peer2)
        console.log('call from ' + peer1 + ' to ' + peer2)
      }
    }
    socket.on('hello', function (data) {
      if (!data.white || (connections.white.size && !connections.not.size)) {
        console.log('new non white user')
        connections.not.set(socket.id, true)
        var w = connections.white.entries().next()
        if (typeof w['value'] !== 'undefined') initCall(w['value'][0], socket.id)
      } else {
        console.log('new white user')
        connections.white.set(socket.id, true)
        var n = connections.not.entries().next()
        if (typeof n['value'] !== 'undefined') initCall(socket.id, n['value'][0])
      }
      console.log('connected ' + socket.id)
      console.log('white ' + connections.white.size)
      console.log('not ' + connections.not.size)
    })
    var remove = function (s) {
      console.log('removing ' + s)
      if (connections.white.has(s)) connections.white.delete(s)
      if (connections.not.has(s)) connections.not.delete(s)
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
