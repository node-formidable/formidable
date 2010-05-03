require('../common');
var CHUNK_LENGTH = 7
  , multipartParser = require('formidable/multipart_parser')
  , MultipartParser = multipartParser.MultipartParser
  , parser = new MultipartParser()
  , fixtures = require('../fixture/multipart')
  , Buffer = require('buffer').Buffer;

Object.keys(fixtures).forEach(function(name) {
  var fixture = fixtures[name]
    , buffer = new Buffer(Buffer.byteLength(fixture.raw, 'binary'))
    , offset = 0
    , chunk
    , nparsed

    , parts = []
    , part = null
    , headerField = null
    , headerValue = null;

  parser.initWithBoundary(fixture.boundary);
  parser.onPartBegin = function() {
    part = {headers: {}};
    parts.push(part);
    headerField = '';
    headerValue = '';
  };

  parser.onHeaderField = function(b, start, end) {
    var str = b.toString('ascii', start, end);
    // if (headerValue) {
    //   part.headers[headerField] = headerValue;
    //   headerField = '';
    //   headerValue = '';      
    // }
    headerField += str;
  };

  parser.onHeaderValue = function(b, start, end) {
    var str = b.toString('ascii', start, end);
    headerValue += str;
  }

  parser.onPartData = function(b, start, end) {
    var str = b.toString('ascii', start, end);
    p(str);
  }

  buffer.write(fixture.raw, 'binary', 0);

  while (offset < buffer.length) {
    if (offset + CHUNK_LENGTH < buffer.length) {
      chunk = buffer.slice(offset, offset+CHUNK_LENGTH);
    } else {
      chunk = buffer.slice(offset, buffer.length);
    }
    offset = offset + CHUNK_LENGTH;

    nparsed = parser.write(chunk);
    if (nparsed != chunk.length) {
      puts('-- ERROR --');
      p(chunk.toString('ascii'));
      p(parser);
      throw new Error(chunk.length+' bytes written, but only '+nparsed+' bytes parsed!');
    }
  }

  p()
});

// parser.initWithBoundary('AaB03x');
// parser.onPartBegin = function() {
//   
// };
// parser.onHeaderField = function(b, start, len) {
//   
// };
// parser.onHeaderValue = function(b, start, len) {
//   
// };
// parser.onHeaderParamName = function(b, start, len) {
//   
// };
// parser.onHeaderParamValue = function(b, start, len) {
//   
// };
// parser.onHeadersEnd = function() {
//   
// };
// 
// parser.write(...);