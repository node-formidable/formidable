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
      , 'index'
      ];

  assert.properties(parser, PROPERTIES);
  assert.ok(parser instanceof events.EventEmitter);
})();

// (function testWrite() {
//   var parser = new MultipartParser();
// 
//   assert.throws(function() {
//     parser.write(bufferMock);
//   });
// 
//   (function testBasic() {
//     parser.initWithBoundary('AaB03x');
//     parser.write(parser.markerBuffer.slice(0, parser.markerBuffer.length-1));
//     assert.equal(parser.markerIndex, parser.markerBuffer.length-1);
// 
//     parser.write(parser.markerBuffer.slice(parser.markerBuffer.length-1, parser.markerBuffer.length));
//     assert.equal(parser.state, multipartParser.HEADER_END);
//     assert.equal(parser.markerIndex, 0);
// 
//     p(parser);
//   })();
// })();

(function testInitWithBoundary() {
  var parser = new MultipartParser();

  parser.initWithBoundary('abc');
  assert.deepEqual(Array.prototype.slice.call(parser.boundary), [97, 98, 99]);
  assert.equal(parser.state, multipartParser.STREAM_BEGIN);
})();

// (function testAdvanceState() {
//   var parser = new MultipartParser()
//     , callbacks = {setState: -3};
// 
//   parser.initWithBoundary('--abc');
// 
//   parser.setState = function(state) {
//     callbacks.setState++;
//     this.state = state;
//   };
// 
//   parser.advanceState();
//   assert.equal(parser.state, multipartParser.HEADER_END);
// 
//   parser.advanceState();
//   assert.equal(parser.state, multipartParser.PART_END);
// 
//   parser.advanceState();
//   assert.equal(parser.state, multipartParser.PART_BEGIN);
// 
//   assert.callbacks(callbacks);
// })();

// (function testSetState() {
//   var parser = new MultipartParser();
// 
//   parser.boundary = new Buffer(6);
//   parser.setState(multipartParser.PART_BEGIN);
// 
//   assert.equal(parser.state, multipartParser.PART_BEGIN);
//   assert.equal(parser.markerIndex, 0);
//   assert.deepEqual
//     ( Array.prototype.slice.call(parser.markerBuffer)
//     , Array.prototype.slice.call(parser.boundary).concat([13, 10])
//     );
// 
//   parser.setState(multipartParser.PART_END);
// 
//   assert.equal(parser.state, multipartParser.PART_END);
//   assert.equal(parser.markerIndex, 0);
//   assert.deepEqual
//     ( Array.prototype.slice.call(parser.markerBuffer)
//     , [13, 10].concat(Array.prototype.slice.call(parser.boundary).concat([13, 10]))
//     );
// 
// 
//   parser.setState(multipartParser.HEADER_END);
//   assert.deepEqual
//     ( Array.prototype.slice.call(parser.markerBuffer)
//     , [13, 10, 13, 10]
//     );
// 
//   parser.setState(multipartParser.STREAM_END);
//   assert.deepEqual
//     ( Array.prototype.slice.call(parser.markerBuffer)
//     , [13, 10].concat(Array.prototype.slice.call(parser.boundary).concat([45, 45, 13, 10]))
//     );
// })();