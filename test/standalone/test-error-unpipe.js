var multiparty = require('../../');
var assert = require('assert');
var http = require('http');
var net = require('net');
var Pend = require('pend');
var stream = require('stream');

var err = null;
var form = new multiparty.Form();
var pend = new Pend();
var req = new stream.Readable();
var unpiped = false;

req.headers = {
  'content-type': 'multipart/form-data; boundary=foo'
};
req._read = function(){
  this.push(new Buffer('--foo!'));
};

pend.go(function(){
  form.on('error', function(e){
    err = e;
  });
});

pend.go(function(){
  form.on('unpipe', function(){
    unpiped = true;
  });
});

pend.wait(function(){
  // verification that error event implies unpipe call
  assert.ok(err);
  assert.ok(unpiped, 'req was unpiped');
  assert.equal(req._readableState.flowing, false, 'req not flowing');
  assert.equal(req._readableState.pipesCount, 0, 'req has 0 pipes');
})

form.parse(req)
assert.equal(req._readableState.flowing, true, 'req flowing');
assert.equal(req._readableState.pipesCount, 1, 'req has 1 pipe');
