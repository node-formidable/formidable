var multiparty = require('../../')
  , assert = require('assert')
  , http = require('http')
  , net = require('net');

var server = http.createServer(function(req, resp) {
  var form = new multiparty.Form();

  var partCount = 0;
  form.on('part', function(part) {
    partCount++;
    assert.strictEqual(typeof part.byteCount, 'undefined');
  });
  form.on('close', function() {
    assert.strictEqual(partCount, 1);
    resp.end();
  });

  form.parse(req);
});
server.listen(function() {
  var socket = net.connect(server.address().port, 'localhost', function () {
    socket.write('POST / HTTP/1.1\r\n');
    socket.write('Host: localhost\r\n');
    socket.write('Connection: close\r\n');
    socket.write('Content-Type: multipart/form-data; boundary=foo\r\n');
    socket.write('Transfer-Encoding: chunked\r\n');
    socket.write('\r\n');
    socket.write('7\r\n');
    socket.write('--foo\r\n\r\n');
    socket.write('43\r\n');
    socket.write('Content-Disposition: form-data; name="file"; filename="plain.txt"\r\n\r\n');
    socket.write('12\r\n');
    socket.write('\r\nsome text here\r\n\r\n');
    socket.write('9\r\n');
    socket.write('--foo--\r\n\r\n');
    socket.end('0\r\n\r\n');
    socket.on('close', function () {
      server.close();
    });
  });
});
