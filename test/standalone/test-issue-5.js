var assert = require('assert');
var http = require('http');
var net = require('net');
var multiparty = require('../../');

// remove this if we actually fix the EMFILE thing inside of multiparty
require('graceful-fs');

var client;
var attachmentCount = 2000;
var server = http.createServer(function(req, res) {
  var form = new multiparty.Form({maxFields: 10000});

  form.parse(req, function(err, fieldsTable, filesTable, fieldsList, filesList) {
    if (err) {
      console.error(err.stack);
      return;
    }
    assert.strictEqual(filesList.length, attachmentCount);
    res.end();
    client.end();
    server.close();
  });
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
  var payloadSize = oneAttachment.length * attachmentCount + boundary.length;

  client.write("POST /upload HTTP/1.1\r\n" +
    "Content-Length: " + payloadSize + "\r\n" +
    "Content-Type: multipart/form-data; boundary=----WebKitFormBoundaryvfUZhxgsZDO7FXLF\r\n" +
    "\r\n");

  for (var i = 0; i < attachmentCount; i += 1) {
    client.write(oneAttachment);
  }
  client.write(boundary);
});
