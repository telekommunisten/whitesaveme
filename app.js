(function() {
var serve = require('koa-static')
var koa = require('koa')
var app = koa()

app.use(serve(__dirname + '/site'))

var server = require('http').createServer(app.callback())
var io = require('socket.io')(server)
var connections = {white:{}, not:{}}
io.on('connection', function(socket){
  socket.emit('connections', connections)
  socket.on('hello', function (data) {
    if (data.white) {
      connections.white[socket.id] = true
    } else {
      connections.not[socket.id] = true
    }
    console.log('connected ' + socket.id)
    console.log(connections)
  })
  socket.on('disconnect', function() {
    if (typeof connections.white[socket.id] !== undefined) delete connections.white[socket.id]
    if (typeof connections.not[socket.id] !== undefined) delete connections.not[socket.id]
    console.log('disconnected ' + socket.id)
    console.log(connections)
  });
})

var port = process.env.PORT || 5000
server.listen(port)

console.log('listening on port ' + port)
}())
