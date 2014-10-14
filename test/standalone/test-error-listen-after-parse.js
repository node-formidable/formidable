var multiparty = require('../../');
var assert = require('assert');
var http = require('http');
var net = require('net');
var stream = require('stream');

var form = new multiparty.Form();
var req = new stream.Readable();

req.headers = {};
req._read = function(){
  this.push(new Buffer('--foo!'));
};

form.parse(req);

form.on('error', function(err){
  // verification that error emitter when attached after form.parse
  assert.ok(err);
});
