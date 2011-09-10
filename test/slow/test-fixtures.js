var hashish = require('hashish');
var fs = require('fs');
var findit = require('findit');
var path = require('path');
var http = require('http');
var net = require('net');
var assert = require('assert');

var common = require('../common');
var test = common.fastOrSlow.slow();
var formidable = common.formidable;

var server;
test.before(function(done) {
  if (server) return done();

  server = http.createServer();
  server.listen(common.port, done);
});

findit
  .sync(common.dir.fixture + '/js')
  .forEach(function(jsPath) {
    if (!/\.js$/.test(jsPath)) return;

    var group = path.basename(jsPath, '.js');
    hashish.forEach(require(jsPath), function(fixture, name) {
      addTest(group + '/' + name, fixture);
    });
  });

function addTest(name, fixture) {
  test('fixture: ' + name, function(done) {
    console.error(this.name);
    uploadFixture(name, function(err, parts) {
      if (err) return done(err);

      fixture.forEach(function(expectedPart, i) {
        var parsedPart = parts[i];
        assert.equal(parsedPart.type, expectedPart.type);
        assert.equal(parsedPart.name, expectedPart.name);

        if (parsedPart.type === 'file') {
          var filename = parsedPart.value.name;
          assert.equal(filename, expectedPart.filename);
        }
      });

      done();
    });
  });
};

function uploadFixture(name, cb) {
  server.once('request', function(req, res) {
    var form = new formidable.IncomingForm();
    form.uploadDir = common.dir.tmp;
    form.parse(req);

    function callback() {
      var realCallback = cb;
      cb = function() {};
      realCallback.apply(null, arguments);
    }

    var parts = [];
    form
      .on('error', callback)
      .on('fileBegin', function(name, value) {
        parts.push({type: 'file', name: name, value: value});
      })
      .on('field', function(name, value) {
        parts.push({type: 'field', name: name, value: value});
      })
      .on('end', function() {
        callback(null, parts);
      });
  });

  var socket = net.createConnection(common.port);
  var file = fs.createReadStream(common.dir.fixture + '/http/' + name);

  file.pipe(socket);
}
