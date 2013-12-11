var assert = require('assert');
var http = require('http');
var net = require('net');
var multiparty = require('../../');

var client;
var server = http.createServer(function(req, res) {
  var form = new multiparty.Form();
  var endCalled = false;
  form.on('part', function(part) {
    part.on('end', function() {
      endCalled = true;
    });
    part.resume();
  });
  form.on('close', function() {
    assert.ok(endCalled);
    res.end();
    client.end();
    server.close();
  });
  form.parse(req);
});
server.listen(function() {
  client = net.connect(server.address().port);

  var boundary = "------WebKitFormBoundaryvfUZhxgsZDO7FXLF\r\n";
  var oneAttachment = boundary +
    "Content-Disposition: form-data; name=\"upload\"; filename=\"blah1.txt\"\r\n" +
    "Content-Type: text/plain\r\n" +
    "\r\n" +
    "hi1\r\n" +
    "\r\n";
  var payloadSize = oneAttachment.length + boundary.length;

  client.write("POST /upload HTTP/1.1\r\n" +
    "Content-Length: " + payloadSize + "\r\n" +
    "Content-Type: multipart/form-data; boundary=----WebKitFormBoundaryvfUZhxgsZDO7FXLF\r\n" +
    "\r\n");

  client.write(oneAttachment);
  client.write(boundary);
});
