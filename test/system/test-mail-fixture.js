var common     = require('../common');
var fs         = require('fs');
var http       = require('http');
var assert     = require('assert');
var formidable = common.formidable;

var server = http.createServer(function(req, res) {
  var form = new formidable.IncomingForm();
  form.uploadDir = common.dir.tmp;
  form.parse(req);

  form
    .on('file', function(file) {
      console.log(arguments);
    })
    .on('end', function() {
      res.end('ok');
      server.close();
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
    console.log('got res');
  });

  var file = fs.createReadStream(common.dir.fixture + '/mail.txt');
  file.pipe(req);
});
