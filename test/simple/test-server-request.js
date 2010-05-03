require('../common');
var formidable = require('formidable')
  , events = require('events');

(function testConstructor() {
  var PROPERTIES =
      [ 'tmpDir'
      , 'httpRequest'
      , 'headers'
      , 'bytesTotal'
      , 'type'
      , 'multipartBoundary'
      ]
    , request = new formidable.ServerRequest();

  assert.properties(request, PROPERTIES);

  assert.ok(request instanceof events.EventEmitter);
})();

(function testFromNodeRequest() {
  var request = new formidable.ServerRequest()
    , callbacks =
      { addDataListener: -1
      , addEndListener: -1
      , writeHeaders: -1
      , write: -1
      , end: -1
      }
    , reqMock =
      { headers: {foo: 'bar'}
      , addListener: function(event, fn) {
          if (event == 'data') {
            callbacks.addDataListener++;

            var TEST_BUFFER = [1, 2, 3];
            request.write = function(buffer) {
              callbacks.write++;
              assert.equal(buffer, TEST_BUFFER);
              assert.strictEqual(this, request);
            };
            fn(TEST_BUFFER);
          } else if (event == 'end') {
            callbacks.addEndListener++;

            request.end = function() {
              callbacks.end++;
              assert.strictEqual(this, request);
            };
            fn();
          } else {
            throw new Error('unexpected event handler: '+event);
          }

          return this;
        }
      };

  request.writeHeaders = function(headers) {
    callbacks.writeHeaders++;
    assert.strictEqual(headers, reqMock.headers);
  };
  request.fromNodeRequest(reqMock);
  assert.strictEqual(request.httpRequest, reqMock);

  assert.callbacks(callbacks);
})();

(function testParseContentLength() {
  var HEADERS = {}
    , request = new formidable.ServerRequest();

  request.headers = {};
  request.parseContentLength();
  assert.equal(request.bytesTotal, null);

  request.headers['content-length'] = '8';
  request.parseContentLength();
  assert.strictEqual(request.bytesTotal, 8);

  // JS can be evil, lets make sure we are not
  request.headers['content-length'] = '08';
  request.parseContentLength();
  assert.strictEqual(request.bytesTotal, 8);
})();

(function testParseContentType() {
  var HEADERS = {}
    , request = new formidable.ServerRequest();

  request.headers = {};
  request.parseContentType();
  assert.strictEqual(request.type, null);

  request.headers = {'content-type': 'application/x-www-form-urlencoded'};
  request.parseContentType();
  assert.strictEqual(request.type, 'urlencoded');

  // accept anything that has 'urlencoded' in it
  request.headers = {'content-type': 'broken-client/urlencoded-stupid'};
  request.parseContentType();
  assert.strictEqual(request.type, 'urlencoded');

  var BOUNDARY = '---------------------------57814261102167618332366269';
  request.headers = {'content-type': 'multipart/form-data; boundary='+BOUNDARY};
  request.parseContentType();
  assert.strictEqual(request.type, 'multipart');
  assert.strictEqual(request.boundary, BOUNDARY);

  // no boundary!
  request.headers = {'content-type': 'multipart/form-data'};
  var emitCalled = false;
  request.emit = function(event, err) {
    assert.ok(event, 'error');

    emitCalled = true; 
    assert.equal(request.boundary, null);
    assert.ok(err.message.match(/malformed request/i));
  };

  var pauseCalled = false;
  request.pause = function() {
    pauseCalled = true;
  };
  request.parseContentType();
  assert.ok(emitCalled);
  assert.ok(pauseCalled);
})();

(function testWriteHeaders() {
  var HEADERS = {}
    , request = new formidable.ServerRequest()
    , callbacks =
      { parseContentLength: -1
      , parseContentType: -1
      };

  request.parseContentLength = function() {
    callbacks.parseContentLength++;
  };

  request.parseContentType = function() {
    callbacks.parseContentType++;
  };

  request.writeHeaders(HEADERS);
  assert.strictEqual(request.headers, HEADERS);

  assert.callbacks(callbacks);
})();