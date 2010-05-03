#!/usr/bin/env node
require('../test/common');

var http = require('http')
  , path = require('path')
  , childProcess = require('child_process')
  , fs = require('fs')
  , sourcePath = process.argv[2]
  , sourceName = path.basename(sourcePath, path.extname(sourcePath))
  , fixtureRequestPath = path.join(TEST_FIXTURES, sourceName+'.request')
  , fileStream = new fs.FileWriteStream(fixtureRequestPath, {encoding: 'binary'})
  , cmd = 'curl -H "Expect:" -F my_file=@'+sourcePath+' http://localhost:'+TEST_PORT
  , server;

server = http.createServer(function(req, res) {
  req
    .addListener('data', function(chunk) {
      fileStream.write(chunk.toString('binary'));
    })
    .addListener('end', function() {
      res.writeHead(200);
      res.end('');
      fileStream.end(function() {
        server.close();
      });
    });
});
server.listen(TEST_PORT);

childProcess.exec(cmd, function(err) {
  if (err) throw err;

  puts('Generated fixture: '+fixtureRequestPath);
});