require('../common');
var formidable = require('formidable')
  , events = require('events')
  , Buffer = require('buffer').Buffer
  , fixtures = require('../fixture/multipart')
  , MultipartParser = require('formidable/multipart_parser').MultipartParser
  , sb = function(str, encoding) {
      encoding = encoding || 'utf8';
      // create a buffer from a string
      var b = new Buffer(Buffer.byteLength(str, encoding));
      b.write(str, encoding, 0);
      return b;
    };

(function testConstructor() {
  var PROPERTIES =
      [ 'type'
      , 'headers'
      , 'encoding'
      , 'bytesTotal'
      , 'bytesReceived'
      , '_parser'
      ]
    , form = new formidable.IncomingForm();

  assert.properties(form, PROPERTIES);
  assert.ok(form instanceof events.EventEmitter);
})();

(function testParse() {
  var form = new formidable.IncomingForm()
    , reqMock = {headers: {}}
    , emit = {}
    , callbacks =
        { writeHeaders: -1
        , addListener_data: -1
        , addListener_error: -1
        };

  reqMock.addListener = function(event, fn) {
    var cbId = 'addListener_'+event;
    if (!(cbId in callbacks)) {
      throw new Error('unexpected event: '+event);
    }
    callbacks[cbId]++;

    emit[event] = fn;
    return this;
  };

  form.writeHeaders = function(headers) {
    callbacks.writeHeaders++;
    assert.strictEqual(headers, reqMock.headers);
  };

  form.parse(reqMock);

  (function testPause() {
    var pauseCalled = 0;
    reqMock.pause = function() {
      pauseCalled++;
    };

    assert.strictEqual(form.pause(), true);
    assert.equal(pauseCalled, 1);
  })();

  (function testEmitError() {
    var ERR = new Error('something bad happened')
      , errorCalled = 0;

    form._error = function(err) {
      errorCalled++;
      assert.strictEqual(err, ERR);
    };

    emit.error(ERR);
    assert.equal(errorCalled, 1);
  })();

  (function testEmitData() {
    var BUFFER = [1, 2, 3]
      , writeCalled = 0;
    form.write = function(buffer) {
      writeCalled++;
      assert.strictEqual(buffer, BUFFER);
    };
    emit.data(BUFFER);

    assert.equal(writeCalled, 1);
  })();

  assert.callbacks(callbacks);
})();

(function testPause() {
  var form = new formidable.IncomingForm();
  assert.strictEqual(form.pause(), false);
})();

(function testWriteHeaders() {
  var HEADERS = {}
    , form = new formidable.IncomingForm()
    , callbacks =
      { _parseContentLength: -1
      , _parseContentType: -1
      };

  form._parseContentLength = function() {
    callbacks._parseContentLength++;
  };

  form._parseContentType = function() {
    callbacks._parseContentType++;
  };

  form.writeHeaders(HEADERS);
  assert.strictEqual(form.headers, HEADERS);

  assert.callbacks(callbacks);
})();

(function testWrite() {
  var form = new formidable.IncomingForm();
  form.write();
})();

(function testParseContentType() {
  var HEADERS = {}
    , form = new formidable.IncomingForm();

  form.headers = {'content-type': 'application/x-www-form-urlencoded'};
  form._parseContentType();
  assert.strictEqual(form.type, 'urlencoded');

  // accept anything that has 'urlencoded' in it
  form.headers = {'content-type': 'broken-client/urlencoded-stupid'};
  form._parseContentType();
  assert.strictEqual(form.type, 'urlencoded');

  var BOUNDARY = '---------------------------57814261102167618332366269'
    , initMultipartCalled = 0;
  form.headers = {'content-type': 'multipart/form-data; boundary='+BOUNDARY};
  form._initMultipart = function(boundary) {
    initMultipartCalled++;
    assert.equal(boundary, BOUNDARY);
  };
  form._parseContentType();
  assert.equal(initMultipartCalled, 1);

  (function testNoBoundary() {
    form.headers = {'content-type': 'multipart/form-data'};
    var errorCalled = 0;
    form._error = function(err) {
      errorCalled++;
      assert.ok(err.message.match(/no multipart boundary/i));
    };

    form._parseContentType();
    assert.ok(errorCalled);
  })();

  (function testNoContentType() {
    form.headers = {};
    var errorCalled = 0;
    form._error = function(err) {
      errorCalled++;
      assert.ok(err.message.match(/no content-type/i));
    };

    form._parseContentType();
    assert.ok(errorCalled);
  })();

  (function testUnknownContentType() {
    form.headers = {'content-type': 'invalid'};
    var errorCalled = 0;
    form._error = function(err) {
      errorCalled++;
      assert.ok(err.message.match(/unknown content-type/i));
    };

    form._parseContentType();
    assert.ok(errorCalled);
  })();
})();

(function testParseContentLength() {
  var HEADERS = {}
    , form = new formidable.IncomingForm();

  form.headers = {};
  form._parseContentLength();
  assert.equal(form.bytesTotal, null);

  form.headers['content-length'] = '8';
  form._parseContentLength();
  assert.strictEqual(form.bytesReceived, 0);
  assert.strictEqual(form.bytesTotal, 8);

  // JS can be evil, lets make sure we are not
  form.headers['content-length'] = '08';
  form._parseContentLength();
  assert.strictEqual(form.bytesTotal, 8);
})();

(function testInitMultipart() {
  var form = new formidable.IncomingForm()
    , BOUNDARY = '123'
    , parserMock = {}
    , newParserCalled = 0
    , initWithBoundaryCalled = 0;

  parserMock.initWithBoundary = function(boundary) {
    initWithBoundaryCalled++;
    assert.equal(boundary, BOUNDARY);
  };

  form._newParser = function() {
    newParserCalled++;
    return parserMock;
  };

  form._initMultipart(BOUNDARY);
  assert.equal(form.type, 'multipart');
  assert.strictEqual(form._parser, parserMock);
  assert.equal(newParserCalled, 1);
  assert.equal(initWithBoundaryCalled, 1);

  var parser = form._parser;

  (function testRegularField() {
    var onPartCalled = 0
      , partDataEmitted = 0
      , partEndEmitted = 0;

    form.onPart = function(part) {
      onPartCalled++;

      assert.deepEqual
        ( part.headers
        , { 'content-disposition': 'form-data; name="field1"'
          , 'foo': 'bar'
          }
        );
      assert.equal(part.name, 'field1');

      part.addListener('data', function(b) {
        partDataEmitted++;
        if (partDataEmitted == 1) {
          assert.equal(b.toString(), 'hello');
        } else if (partDataEmitted == 2) {
          assert.equal(b.toString(), ' world');
        }
      });

      part.addListener('end', function() {
        partEndEmitted++;
      });
    };

    parser.onPartBegin();
    parser.onHeaderField(sb('content-disposition'), 0, 10);
    parser.onHeaderField(sb('content-disposition'), 10, 19);
    parser.onHeaderValue(sb('form-data; name="field1"'), 0, 14);
    parser.onHeaderValue(sb('form-data; name="field1"'), 14, 24);
    parser.onHeaderField(sb('foo'), 0, 3);
    parser.onHeaderValue(sb('bar'), 0, 3);
    parser.onPartData(sb('hello world'), 0, 5);
    parser.onPartData(sb('hello world'), 5, 11);
    parser.onPartEnd();
    assert.equal(onPartCalled, 1);
    assert.equal(partDataEmitted, 2);
    assert.equal(partEndEmitted, 1);
  })();

  (function testFileField() {
    var onPartCalled = 0
      , partDataEmitted = 0
      , partEndEmitted = 0;

    form.onPart = function(part) {
      onPartCalled++;

      assert.deepEqual
        ( part.headers
        , { 'content-disposition': 'form-data; name="field2"; filename="file1.txt"'
          , 'content-type': 'text/plain'
          }
        );
      assert.equal(part.name, 'field2');
      assert.equal(part.filename, 'file1.txt');
      assert.equal(part.mime, 'text/plain');

      part.addListener('data', function(b) {
        partDataEmitted++;
        assert.equal(b.toString(), '... contents of file1.txt ...');
      });

      part.addListener('end', function() {
        partEndEmitted++;
      });
    };

    parser.onPartBegin();
    parser.onHeaderField(sb('content-disposition'), 0, 19);
    parser.onHeaderValue(sb('form-data; name="field2"; filename="file1.txt"'), 0, 46);
    parser.onHeaderField(sb('Content-Type'), 0, 12);
    parser.onHeaderValue(sb('text/plain'), 0, 10);
    parser.onPartData(sb('... contents of file1.txt ...'), 0, 29);
    parser.onPartEnd();
    assert.equal(onPartCalled, 1);
    assert.equal(partDataEmitted, 1);
    assert.equal(partEndEmitted, 1);
  })();
})();

(function testInitUrlencoded() {
  var form = new formidable.IncomingForm();
  form._initUrlencoded();
  assert.equal(form.type, 'urlencoded');
})();

(function testError() {
  var form = new formidable.IncomingForm()
    , ERR = new Error('bla')
    , pauseCalled = 0
    , emitCalled = 0;

  form.pause = function() {
    pauseCalled++;
  };

  form.emit = function(event, err) {
    emitCalled++;

    assert.equal(event, 'error');
    assert.strictEqual(err, ERR);
  };

  form._error(ERR);
  assert.equal(pauseCalled, 1);
  assert.equal(emitCalled, 1);
})();

(function testNewParser() {
  var form = new formidable.IncomingForm()
    , parser = form._newParser();

  assert.ok(parser instanceof MultipartParser);
})();