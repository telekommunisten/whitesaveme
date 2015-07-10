(function () {
  var serve = require('koa-static')
  var koa = require('koa')
  var cors = require('koa-cors')

  var app = koa()

  app.use(cors())
  app.use(serve(__dirname + '/site'))
  var get = require('simple-get')

  var server = require('http').createServer(app.callback())
  var io = require('socket.io')(server)
  var connections = { white: new Map(), not: new Map() }
  io.on('connection', function (socket) {
    var initCall = function (peer1, peer2) {
      if ((typeof io.sockets.connected[peer1] !== 'undefined') &&
        (typeof io.sockets.connected[peer2] !== 'undefined')) {

        var q = [
          'ident=dmytri',
          'domain=whitesave.me',
          'application=default',
          'room=default',
          'secure=1',
          'secret=' + process.env.XIRSYS
        ].join('&')
        
        get.concat('https://service.xirsys.com/ice?' + q, function (err, data, res) {
          if (err) throw err
          console.log(res.statusCode) // 200
          var iceServers = JSON.parse(data.toString())['d']['iceServers']
          console.log(iceServers) // 'this is the server response'

          connections.not.set(peer2, peer1)
          connections.white.set(peer1, peer2)
          io.sockets.connected[peer1].emit('call', iceServers, false)
          io.sockets.connected[peer2].emit('call', iceServers, true)
          console.log('call from ' + peer1 + ' to ' + peer2)
        });
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
    socket.on('signal', function (data) {
      console.log('signal from ' + socket.id)
      console.log(data)
      var s = (connections.white.has(socket.id)) ? connections.white.get(socket.id) : connections.not.get(socket.id)
      if (typeof io.sockets.connected[s] !== 'undefined') {
         console.log('signal to ' + s)
        io.sockets.connected[s].emit('signal', data)
      }
    })
    var remove = function (s) {
      console.log('removing ' + s)
      if (connections.white.has(s)) connections.white.delete(s)
      if (connections.not.has(s)) connections.not.delete(s)
    }
    socket.on('connected', function () {
      //remove(socket.id)
    })
    socket.on('disconnect', function () {
      remove(socket.id)
    })
  })

  var port = process.env.PORT || 5000
  server.listen(port)

  console.log('listening on port ' + port)
}())
