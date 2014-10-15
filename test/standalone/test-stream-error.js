var assert = require('assert');
var http = require('http');
var net = require('net');
var multiparty = require('../../');

var server = http.createServer(function (req, res) {
  var form = new multiparty.Form();
  var gotPartErr;
  form.on('part', function(part) {
    part.on('error', function(err) {
      gotPartErr = err;
    });
    part.resume();
  });
  form.on('error', function () {
    assert.ok(gotPartErr);
    server.close();
  });
  form.on('close', function () {
    throw new Error('Unexpected "close" event');
  });
  form.parse(req);
}).listen(0, 'localhost', function () {
  var client = net.connect(server.address().port);
  client.write(
    "POST / HTTP/1.1\r\n" +
    "Content-Length: 186\r\n" +
    "Content-Type: multipart/form-data; boundary=--WebKitFormBoundaryvfUZhxgsZDO7FXLF\r\n" +
    "\r\n" +
    "----WebKitFormBoundaryvfUZhxgsZDO7FXLF\r\n" +
    "Content-Disposition: form-data; name=\"upload\"; filename=\"blah1.txt\"\r\n" +
    "Content-Type: plain/text\r\n" +
    "\r\n" +
    "hi1\r\n");
  client.end();
});
