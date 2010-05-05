require('../test/common');
var multipartParser = require('formidable/multipart_parser')
  , MultipartParser = multipartParser.MultipartParser
  , parser = new MultipartParser()
  , Buffer = require('buffer').Buffer
  , boundary = 'abc'
  , mb = 5
  , buffer = createMultipartBuffer('abc', mb * 1024 * 1024);


parser.initWithBoundary(boundary);
parser.onPartBegin = function() {
  p('found part');
};

parser.onPartData = function(buffer, start, end) {
  // not doing anything
};

var start = +new Date();
parser.write(buffer);

var duration = +new Date - start
  , mbPerSec = (mb / (duration / 1000)).toFixed(2);

p(mbPerSec+' mb/sec');

function createMultipartBuffer(boundary, size) {
  var head =
        '--'+boundary+'\r\n'
      + 'content-disposition: form-data; name="field1"\r\n'
      + '\r\n'
    , tail = '--'+boundary.length+'--\r\n'
    , buffer = new Buffer(size);

  buffer.write(head, 'ascii', 0);
  buffer.write(tail, 'ascii', buffer.length - tail.length);
  return buffer;
}