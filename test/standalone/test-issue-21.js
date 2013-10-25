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
    var nameCount = 0;
    var name;
    for (name in fields) {
      assert.strictEqual(name, "title");
      nameCount += 1;

      var values = fields[name];
      assert.strictEqual(values.length, 1);
      assert.strictEqual(values[0], "foofoo");
    }
    assert.strictEqual(nameCount, 1);

    nameCount = 0;
    for (name in files) {
      assert.strictEqual(name, "upload");
      nameCount += 1;

      var filesList = files[name];
      assert.strictEqual(filesList.length, 4);
      assert.strictEqual(filesList[0].fieldName, "upload");
      assert.strictEqual(filesList[1].fieldName, "upload");
      assert.strictEqual(filesList[2].fieldName, "upload");
      assert.strictEqual(filesList[3].fieldName, "upload");
    }
    assert.strictEqual(nameCount, 1);

    res.end();
    client.end();
    server.close();
  });
});
server.listen(function() {
  client = net.connect(server.address().port);

  client.write("POST /upload HTTP/1.1\r\n" +
    "Content-Length: 728\r\n" +
    "Content-Type: multipart/form-data; boundary=----WebKitFormBoundaryvfUZhxgsZDO7FXLF\r\n" +
    "\r\n" +
    "------WebKitFormBoundaryvfUZhxgsZDO7FXLF\r\n" +
    "Content-Disposition: form-data; name=\"title\"\r\n" +
    "\r\n" +
    "foofoo" +
    "\r\n" +
    "------WebKitFormBoundaryvfUZhxgsZDO7FXLF\r\n" +
    "Content-Disposition: form-data; name=\"upload\"; filename=\"blah1.txt\"\r\n" +
    "Content-Type: text/plain\r\n" +
    "\r\n" +
    "hi1\r\n" +
    "\r\n" +
    "------WebKitFormBoundaryvfUZhxgsZDO7FXLF\r\n" +
    "Content-Disposition: form-data; name=\"upload\"; filename=\"blah2.txt\"\r\n" +
    "Content-Type: text/plain\r\n" +
    "\r\n" +
    "hi2\r\n" +
    "\r\n" +
    "------WebKitFormBoundaryvfUZhxgsZDO7FXLF\r\n" +
    "Content-Disposition: form-data; name=\"upload\"; filename=\"blah3.txt\"\r\n" +
    "Content-Type: text/plain\r\n" +
    "\r\n" +
    "hi3\r\n" +
    "\r\n" +
    "------WebKitFormBoundaryvfUZhxgsZDO7FXLF\r\n" +
    "Content-Disposition: form-data; name=\"upload\"; filename=\"blah4.txt\"\r\n" +
    "Content-Type: text/plain\r\n" +
    "\r\n" +
    "hi4\r\n" +
    "\r\n" +
    "------WebKitFormBoundaryvfUZhxgsZDO7FXLF--\r\n"
  );
});
