var assert = require('assert')
  , MultipartParser = require('../lib/multipart_parser')
  , parser = new MultipartParser()
  , boundary = '-----------------------------168072824752491622650073'
  , mb = 100
  , buffer = createMultipartBuffer(boundary, mb * 1024 * 1024)

var callbacks = {
  partBegin: -1,
  partEnd: -1,
  headerField: -1,
  headerValue: -1,
  partData: -1,
  end: -1,
};


parser.initWithBoundary(boundary);
parser.onHeaderField = function() {
  callbacks.headerField++;
};

parser.onHeaderValue = function() {
  callbacks.headerValue++;
};

parser.onPartBegin = function() {
  callbacks.partBegin++;
};

parser.onPartData = function() {
  callbacks.partData++;
};

parser.onPartEnd = function() {
  callbacks.partEnd++;
};

parser.onEnd = function() {
  callbacks.end++;
};

var start = new Date();
parser.write(buffer, function(err) {
  var duration = new Date() - start;
  assert.ifError(err);
  var mbPerSec = (mb / (duration / 1000)).toFixed(2);
  console.log(mbPerSec+' mb/sec');
});

process.on('exit', function() {
  for (var k in callbacks) {
    assert.equal(0, callbacks[k], k+' count off by '+callbacks[k]);
  }
});

function createMultipartBuffer(boundary, size) {
  var head =
        '--'+boundary+'\r\n' +
        'content-disposition: form-data; name="field1"\r\n' +
        '\r\n'
    , tail = '\r\n--'+boundary+'--\r\n'
    , buffer = new Buffer(size);

  buffer.write(head, 'ascii', 0);
  buffer.write(tail, 'ascii', buffer.length - tail.length);
  return buffer;
}

