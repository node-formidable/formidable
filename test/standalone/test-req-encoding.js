var http = require('http')
  , multiparty = require('../../')
  , assert = require('assert')
  , superagent = require('superagent')
  , path = require('path');

var server = http.createServer(function(req, res) {
  assert.strictEqual(req.url, '/upload');
  assert.strictEqual(req.method, 'POST');

  var form = new multiparty.Form();

  // this is invalid
  req.setEncoding('utf8');

  form.parse(req, function(err, fields, files) {
    assert.ok(err);
    assert.equal(err.message, 'request encoding must not be set');
    res.statusCode = 500;
    res.end();
  });
});
server.listen(function() {
  var url = 'http://localhost:' + server.address().port + '/upload';
  var req = superagent.post(url);
  req.attach('file0', fixture('pf1y5.png'), 'SOG1.JPG');
  req.on('error', function(err) {
    assert.ifError(err);
  });
  req.end();
  req.on('response', function(res) {
    assert.equal(res.statusCode, 500);
    server.close();
  });
});

function fixture(name) {
  return path.join(__dirname, '..', 'fixture', 'file', name)
}
