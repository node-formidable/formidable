var common     = require('../common');
var fs         = require('fs');
var http       = require('http');
var assert     = require('assert');
var formidable = common.formidable;

var files = [];
var server = http.createServer(function(req, res) {
  var form = new formidable.IncomingForm();
  form.uploadDir = common.dir.tmp;
  form.parse(req);

  form
    .on('file', function(name, file) {
      files.push(file);
    })
    .on('end', function() {
      res.end('ok');
    });
}).listen(common.port, function(err) {
  if (err) throw err;

  var options = {
    host    : 'localhost',
    port    : common.port,
    path    : '/',
    method  : 'POST',
    headers : {
      'Content-Type': 'multipart/alternative; boundary=Apple-Mail-2-1061547935',
    }
  };

  var req = http.request(options, function(res) {
    server.close();
  });

  var file = fs.createReadStream(common.dir.fixture + '/mail.txt');
  file.pipe(req);
});

process.on('exit', function() {
  assert.equal(files.length, 1);

  var file = files[0];
  assert.equal(file.size, 1668);
  assert.equal(file.filename, 'favourite.gif');
});
