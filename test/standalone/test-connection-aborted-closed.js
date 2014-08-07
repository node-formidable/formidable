var assert = require('assert');
var http = require('http');
var net = require('net');
var multiparty = require('../../');

var socket;
var server = http.createServer(function (req, res) {
  var called = false;
  var form = new multiparty.Form();

  form.parse(req, function (err, fields, files) {
    assert.ok(!called);
    called = true;

    assert.ifError(err);
    assert.equal(Object.keys(fields).length, 1);
    socket.end();
  });
});

server.listen(0, 'localhost', function () {
  socket = net.connect(server.address().port, 'localhost', function () {
    socket.write('POST / HTTP/1.1\r\n');
    socket.write('Host: localhost\r\n');
    socket.write('Connection: close\r\n');
    socket.write('Content-Type: multipart/form-data; boundary=foo\r\n');
    socket.write('Transfer-Encoding: chunked\r\n');
    socket.write('\r\n');
    socket.write('7\r\n');
    socket.write('--foo\r\n\r\n');
    socket.write('2D\r\n');
    socket.write('Content-Disposition: form-data; name="data"\r\n\r\n');
    socket.write('12\r\n');
    socket.write('\r\nsome text here\r\n\r\n');
    socket.write('7\r\n');
    socket.write('--foo--\r\n');
    socket.write('2\r\n');
    socket.write('\r\n\r\n');
    socket.write('0\r\n\r\n');
    socket.on('close', function () {
      server.close();
    });
  });
});
