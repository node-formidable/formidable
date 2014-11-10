var http = require('http')
  , multiparty = require('../../')
  , assert = require('assert')
  , superagent = require('superagent')
  , path = require('path')
  , fs = require('fs')

var server = http.createServer(function(req, res) {
  assert.strictEqual(req.url, '/upload');
  assert.strictEqual(req.method, 'POST');

  var form = new multiparty.Form({autoFiles:true,maxFields:2});

  var first = true;
  form.on('error', function (err) {
    assert.ok(first);
    first = false;
    assert.ok(/maxFields/.test(err.message));
    assert.equal(err.status, 413);
  });

  var fieldCount = 0;
  form.on('field', function() {
    fieldCount += 1;
  });

  form.parse(req, function(err, fields, files) {
    assert.ok(!first);
    assert.ok(fieldCount <= 2);
    res.statusCode = 413;
    res.end('too many fields');
  });
});
server.listen(function() {
  var url = 'http://localhost:' + server.address().port + '/upload';
  var req = superagent.post(url);
  var val = new Buffer(10 * 1024);
  req.field('a', val);
  req.field('b', val);
  req.field('c', val);
  req.on('error', function(err) {
    assert.ifError(err);
  });
  req.end();
  req.on('response', function(res) {
    assert.equal(res.statusCode, 413);
    server.close();
  });
});

function fixture(name) {
  return path.join(__dirname, '..', 'fixture', 'file', name)
}
