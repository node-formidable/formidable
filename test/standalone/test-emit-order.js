var http = require('http');
var multiparty = require('../../');
var assert = require('assert');
var superagent = require('superagent');
var path = require('path');
var bigFile = path.join(__dirname, "..", "fixture", "file", "pf1y5.png");

var server = http.createServer(function(req, res) {
  assert.strictEqual(req.url, '/upload');
  assert.strictEqual(req.method, 'POST');

  var fieldsInOrder = [
    'a',
    'b',
    'myimage.png',
    'c',
  ];

  var form = new multiparty.Form({
    autoFields: true,
  });

  form.on('error', function (err) {
    assert.ifError(err);
  });

  form.on('part', function(part) {
    assert.ok(part.filename);
    var expectedFieldName = fieldsInOrder.shift();
    assert.strictEqual(part.name, expectedFieldName);
    part.resume();
  });

  form.on('field', function(name, value) {
    var expectedFieldName = fieldsInOrder.shift();
    assert.strictEqual(name, expectedFieldName);
  });

  form.on('close', function() {
    assert.strictEqual(fieldsInOrder.length, 0);
    res.end("OK");
  });

  form.parse(req);
});
server.listen(function() {
  var url = 'http://localhost:' + server.address().port + '/upload';
  var req = superagent.post(url);
  req.field('a', 'a-value');
  req.field('b', 'b-value');
  req.attach('myimage.png', bigFile);
  req.field('c', 'hello');
  req.on('error', function(err) {
    assert.ifError(err);
  });
  req.on('response', function(res) {
    assert.equal(res.statusCode, 200);
    server.close();
  });
  req.end();
});
