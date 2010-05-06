require('../common');
var multipartParser = require('formidable/multipart_parser')
  , MultipartParser = multipartParser.MultipartParser
  , events = require('events')
  , Buffer = require('buffer').Buffer;

(function testConstructor() {
  var parser = new MultipartParser()
    , PROPERTIES =
      [ 'boundary'
      , 'state'
      , 'flags'
      , 'boyerMooreShift'
      , 'index'
      , 'lookbehind'
      ];

  assert.properties(parser, PROPERTIES);
})();

(function testInitWithBoundary() {
  var parser = new MultipartParser()
    , boundary = 'abc';

  parser.initWithBoundary(boundary);
  assert.deepEqual(Array.prototype.slice.call(parser.boundary), [45, 45, 97, 98, 99]);
  assert.equal(parser.state, multipartParser.START);

  assert.equal(parser.boyerMooreShift.length, 256);
  for (var i = 0; i < parser.boyerMooreShift.length; i++) {
    assert.equal(parser.boyerMooreShift[i], boundary.length+2);
  }

  // assert.equal(parser.boyerMooreShift[97], );
})();