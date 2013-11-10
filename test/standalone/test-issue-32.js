var assert = require('assert');
var http = require('http');
var net = require('net');
var multiparty = require('../../');

var client;
var server = http.createServer(function(req, res) {
  var form = new multiparty.Form();

  form.parse(req, function(err, fields, files) {
    if (err) {
      console.error(err.stack);
      return;
    }
    assert.strictEqual(files.image[0].originalFilename, "测试文档")
    res.end();
    client.end();
    server.close();
  });
});
server.listen(function() {
  client = net.connect(server.address().port);

  client.write(
    "POST /upload HTTP/1.1\r\n" +
    "Accept: */*\r\n" +
    "Content-Type: multipart/form-data; boundary=\"893e5556-f402-4fec-8180-c59333354c6f\"\r\n" +
    "Content-Length: 187\r\n" +
    "\r\n" +
    "--893e5556-f402-4fec-8180-c59333354c6f\r\n" +
    "Content-Disposition: form-data; name=\"image\"; filename*=utf-8''%E6%B5%8B%E8%AF%95%E6%96%87%E6%A1%A3\r\n" +
    "\r\n" +
    "\r\n" +
    "--893e5556-f402-4fec-8180-c59333354c6f--\r\n"
  );
});
