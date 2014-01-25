var http = require('http')
  , multiparty = require('../../')
  , assert = require('assert')
  , superagent = require('superagent')
  , path = require('path')
  , fs = require('fs')

var server = http.createServer(function(req, res) {
  assert.strictEqual(req.url, '/upload');
  assert.strictEqual(req.method, 'POST');

  var form = new multiparty.Form({autoFiles:true,maxFilesSize:768323}); // exact size of pf1y5.png

  var fileCount = 0;
  form.on('file', function(name, file) {
    fileCount += 1;
    fs.unlink(file.path, function() {});
  });

  form.parse(req, function(err, fields, files) {
    assert.ifError(err);
    assert.ok(fileCount === 1);
    res.end();
    server.close();
  });
});
server.listen(function() {
  var url = 'http://localhost:' + server.address().port + '/upload';
  var req = superagent.post(url);
  req.attach('file0', fixture('pf1y5.png'), 'SOG1.JPG');
  req.on('error', function(){});
  req.end();
});

function fixture(name) {
  return path.join(__dirname, '..', 'fixture', 'file', name)
}
