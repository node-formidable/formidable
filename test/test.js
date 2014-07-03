var spawn = require('child_process').spawn;
var findit = require('findit');
var path = require('path');
var Pend = require('pend');
var rimraf = require('rimraf');
var fs = require('fs');
var http = require('http');
var net = require('net');
var assert = require('assert');
var multiparty = require('../');
var mkdirp = require('mkdirp');
var STANDALONE_PATH = path.join(__dirname, 'standalone');
var server = http.createServer();
var PORT = 13532;
var FIXTURE_PATH = path.join(__dirname, 'fixture');
var TMP_PATH = path.join(__dirname, 'tmp');

resetTempDir(startFixtureTests);

function startFixtureTests() {
  console.log("Fixture tests:");
  var walker = findit(path.join(FIXTURE_PATH, 'js'));
  var pend = new Pend();
  pend.max = 1;
  pend.go(function(cb) {
    server.listen(PORT, cb);
  });
  walker.on('file', function(jsPath) {
    if (!/\.js$/.test(jsPath)) return;
    var group = path.basename(jsPath, '.js');
    var testInfo = require(jsPath);
    for (var name in testInfo) {
      var fixture = testInfo[name];
      pend.go(createFixtureTest(group + '/' + name, fixture));
    }
  });
  walker.on('end', function() {
    pend.wait(function(err) {
      if (err) throw err;
      server.close(startStandaloneTests);
    });
  });
}

function startStandaloneTests() {
  console.log("\nStandalone tests:");
  var walker = findit(STANDALONE_PATH);
  var pend = new Pend();
  pend.max = 1;
  walker.on('file', function(jsPath) {
    if (!/\.js$/.test(jsPath)) return;
    pend.go(function(cb) {
      var name = path.basename(jsPath, '.js');
      process.stdout.write(name + "...");
      var child = spawn(process.execPath, [jsPath], { env: { TMPDIR: TMP_PATH }, stdio: 'inherit' });
      child.on('error', function(err) {
        throw err;
      });
      child.on('exit', function(code) {
        if (code) throw new Error("exited with code " + code);
        var tmpWalker = findit(TMP_PATH);
        var fileNames = [];
        tmpWalker.on('file', function(file) {
          fileNames.push(file);
        });
        tmpWalker.on('end', function() {
          if (fileNames.length) {
            cleanFiles(fileNames);
            throw new Error("failed to clean up auto files: " + fileNames.join(', '));
          } else {
            console.log("OK");
            cb();
          }
        });
      });
    });
  });
  walker.on('end', function() {
    pend.wait(function(err) {
      if (err) throw err;
      console.log("\nAll tests passed.");
    });
  });
}

function createFixtureTest(name, fixture) {
  return function(cb) {
    process.stdout.write(name + "...");
    uploadFixture(name, function(err, parts) {
      if (err) throw err;
      fixture.forEach(function(expectedPart, i) {
        var parsedPart = parts[i];
        assert.equal(parsedPart.type, expectedPart.type);
        assert.equal(parsedPart.name, expectedPart.name);

        if (parsedPart.type === 'file') {
          var file = parsedPart.value;
          assert.equal(file.originalFilename, expectedPart.filename);
          if(expectedPart.sha1) assert.strictEqual(file.hash, expectedPart.sha1);
          if(expectedPart.size) assert.strictEqual(file.size, expectedPart.size);
        }
      });
      console.log("OK");
      cb();
    });
  };
}

function cleanFiles(fileNames) {
  fileNames.forEach(function(fileName) {
    fs.unlinkSync(fileName);
  });
}

function resetTempDir(cb) {
  rimraf(TMP_PATH, function(err) {
    if (err) throw err;
    mkdirp(TMP_PATH, function(err) {
      if (err) throw err;
      cb();
    });
  });
}

function uploadFixture(name, cb) {
  server.once('request', function(req, res) {
    var parts = [];
    var fileNames = [];
    var form = new multiparty.Form({
      autoFields: true,
      autoFiles: true,
    });
    form.uploadDir = TMP_PATH;
    form.hash = "sha1";

    form.on('error', callback);
    form.on('file', function(name, value) {
      parts.push({type: 'file', name: name, value: value});
      fileNames.push(value.path);
    });
    form.on('field', function(name, value) {
      parts.push({type: 'field', name: name, value: value});
    });
    form.on('close', function() {
      res.end('OK');
      callback(null, parts);
    });
    form.parse(req);

    function callback() {
      var realCallback = cb;
      cb = function() {};
      realCallback.apply(null, arguments);
      cleanFiles(fileNames);
    }
  });

  var socket = net.createConnection(PORT);
  var file = fs.createReadStream(FIXTURE_PATH + '/http/' + name);

  file.pipe(socket, {end: false});
  socket.on('data', function () {
    socket.end();
  });
}
