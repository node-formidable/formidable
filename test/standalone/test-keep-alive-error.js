var assert = require('assert');
var http = require('http');
var net = require('net');
var formidable = require('../../lib/index');

var ok = 0;
var errors = 0;

var server = http.createServer(function (req, res) {
  var form = new formidable.IncomingForm();
  form.on('error', function (e) {
    errors += 1;
    res.writeHead(500);
    res.end();
  });
  form.on('end', function () {
    ok += 1;
    res.writeHead(200);
    res.end();
  });
  form.parse(req);
}).listen(0, 'localhost', function () {
  var client = net.createConnection(server.address().port);

  // first send malformed post upload
  client.write('POST /upload-test HTTP/1.1\r\n' +
        'Host: localhost\r\n' +
        'Connection: keep-alive\r\n' +
        'Content-Type: multipart/form-data; boundary=----aaa\r\n' +
        'Content-Length: 10011\r\n\r\n' +
        '------aaa\n\r'); // expected \r\n

  setTimeout(function () {
    var buf = new Buffer(10000);
    buf.fill('a');
    client.write(buf);

    // correct post upload
    client.write('POST /upload-test HTTP/1.1\r\n' +
        'Host: localhost\r\n' +
        'Connection: keep-alive\r\n' +
        'Content-Type: multipart/form-data; boundary=----aaa\r\n' +
        'Content-Length: 13\r\n\r\n' +
        '------aaa--\r\n');

    setTimeout(function () {
      assert(ok == 1);
      assert(errors == 1);
      client.end();
      server.close();
    }, 100);
  }, 100);
});
