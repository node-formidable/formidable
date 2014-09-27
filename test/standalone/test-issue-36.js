var assert = require('assert');
var http = require('http');
var net = require('net');
var multiparty = require('../../');
var superagent = require('superagent');

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
  });
  form.parse(req);
});
server.listen(function() {
  var url = 'http://localhost:' + server.address().port + '/'
  var req = superagent.post(url)
  req.set('Content-Type', 'multipart/form-data; boundary=--WebKitFormBoundaryvfUZhxgsZDO7FXLF')
  req.set('Content-Length', '186')
  req.write('----WebKitFormBoundaryvfUZhxgsZDO7FXLF\r\n');
  req.write('Content-Disposition: form-data; name="upload"; filename="blah1.txt"\r\n');
  req.write('Content-Type: plain/text\r\n');
  req.write('\r\n');
  req.write('hi1\r\n');
  req.write('\r\n');
  req.write('----WebKitFormBoundaryvfUZhxgsZDO7FXLF--\r\n');
  req.end(function(err, resp) {
    server.close();
  });
});
