var http = require('http')
  , multiparty = require('../../')
  , assert = require('assert')
  , superagent = require('superagent')
  , path = require('path')
  , fs = require('fs')

var server = http.createServer(function(req, res) {
  assert.strictEqual(req.url, '/upload');
  assert.strictEqual(req.method, 'POST');

  var form = new multiparty.Form({autoFiles:true,maxFilesSize:800*1024});

  var first = true;
  form.on('error', function (err) {
    assert.ok(first);
    first = false;
    assert.strictEqual(err.code, 'ETOOBIG');
  });

  var fileCount = 0;
  form.on('file', function(name, file) {
    fileCount += 1;
    fs.unlinkSync(file.path);
  });

  form.parse(req, function(err, fields, files) {
    assert.ok(fileCount <= 1);
    res.statusCode = 413;
    res.end('files too large');
  });
});
server.listen(function() {
  var url = 'http://localhost:' + server.address().port + '/upload';
  var req = superagent.post(url);
  req.attach('file0', fixture('pf1y5.png'), 'SOG1.JPG');
  req.attach('file1', fixture('pf1y5.png'), 'SOG2.JPG');
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
