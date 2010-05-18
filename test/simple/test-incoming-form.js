require('../common');
var formidable = require('formidable')
  , events = require('events')
  , fs = require('fs')
  , path = require('path')
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
      [ 'hadError'
      , 'type'
      , 'headers'
      , 'uploadDir'
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

  (function testResume() {
    var resumeCalled = 0;
    reqMock.resume = function() {
      resumeCalled++;
    };

    assert.strictEqual(form.resume(), true);
    assert.equal(resumeCalled, 1);
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

(function testResume() {
  var form = new formidable.IncomingForm();
  assert.strictEqual(form.resume(), false);
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
  var form = new formidable.IncomingForm()
    , parser = {}
    , BUFFER = [1, 2, 3];

  form._parser = parser;

  (function testBasic() {
    var writeCalled = 0;
    parser.write = function(buffer) {
      writeCalled++;
      assert.strictEqual(buffer, BUFFER);
      return buffer.length;
    };

    assert.equal(form.write(BUFFER), BUFFER.length);
    assert.equal(writeCalled, 1);
  })();

  (function testParserError() {
    var writeCalled = 0
      , errorCalled = 0;

    parser.write = function(buffer) {
      writeCalled++;
      assert.strictEqual(buffer, BUFFER);
      return buffer.length - 1;
    };

    form._error = function(err) {
      errorCalled++;
      assert.ok(err.message.match(/parser error/i));
    };

    assert.equal(form.write(BUFFER), BUFFER.length - 1);
    assert.equal(writeCalled, 1);
    assert.equal(errorCalled, 1);
  })();

  (function testUninitialized() {
    form = new formidable.IncomingForm();
    var errorCalled = 0;
    form._error = function(err) {
      errorCalled++;
      assert.ok(err.message.match(/unintialized parser/i));
    };
    form.write(BUFFER);
    assert.equal(errorCalled, 1);
  })();
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

  (function testEnd() {
    var emitCalled = 0;
    form.emit = function(event) {
      emitCalled++;
      assert.equal(event, 'end');
    };
    parser.onEnd();
    assert.equal(emitCalled, 1);
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
  assert.ok(form.hadError);
  assert.equal(pauseCalled, 1);
  assert.equal(emitCalled, 1);

  // make sure _error only does its thing once
  form._error(ERR);
  assert.equal(pauseCalled, 1);
  assert.equal(emitCalled, 1);
})();

(function testNewParser() {
  var form = new formidable.IncomingForm()
    , parser = form._newParser();

  assert.ok(parser instanceof MultipartParser);
})();

(function testOnPart() {
  var form = new formidable.IncomingForm();

  (function testUtf8Field() {
    var PART = new events.EventEmitter();
    PART.name = 'my_field';

    var emitCalled = 0;
    form.emit = function(event, field, value) {
      emitCalled++;
      assert.equal(event, 'field');
      assert.equal(field, 'my_field');
      assert.equal(value, 'hello world: €');
    };

    form.onPart(PART);
    PART.emit('data', new Buffer('hello'));
    PART.emit('data', new Buffer(' world: '));
    PART.emit('data', new Buffer([0xE2]));
    PART.emit('data', new Buffer([0x82, 0xAC]));
    PART.emit('end');

    assert.equal(emitCalled, 1);
  })();

  (function testBinaryField() {
    var PART = new events.EventEmitter();
    PART.name = 'my_field2';

    var emitCalled = 0;
    form.emit = function(event, field, value) {
      emitCalled++;
      assert.equal(event, 'field');
      assert.equal(field, 'my_field2');
      assert.equal(value, 'hello world: '+new Buffer([0xE2, 0x82, 0xAC]).toString('binary'));
    };

    form.encoding = 'binary';
    form.onPart(PART);
    PART.emit('data', new Buffer('hello'));
    PART.emit('data', new Buffer(' world: '));
    PART.emit('data', new Buffer([0xE2]));
    PART.emit('data', new Buffer([0x82, 0xAC]));
    PART.emit('end');

    assert.equal(emitCalled, 1);
  })();

  (function testFilePart() {
    var PART = new events.EventEmitter()
      , FILE = new events.EventEmitter();

    PART.name = 'my_file';
    PART.filename = 'sweet.txt';
    PART.mime = 'sweet.txt';

    FILE.path = form._uploadPath();

    var writeStreamCalled = 0;
    form._writeStream = function(file) {
      assert.equal(path.dirname(file), form.uploadDir);
      writeStreamCalled++;
      return FILE;
    };

    form.onPart(PART);
    assert.equal(writeStreamCalled, 1);

    var writeCalled = 0, BUFFER;
    FILE.write = function(buffer, cb) {
      writeCalled++;
      assert.strictEqual(buffer, BUFFER);

      var resumeCalled = 0;
      form.resume = function() {
        resumeCalled++;
      };
      cb();
      assert.equal(resumeCalled, 1);
    };

    var pauseCalled = 0;
    form.pause = function() {
      pauseCalled++;
    };

    PART.emit('data', BUFFER = new Buffer('test'));
    assert.equal(writeCalled, 1);
    assert.equal(pauseCalled, 1);

    var endCalled = 0;
    FILE.end = function(cb) {
      endCalled++;

      var emitCalled = 0;
      form.emit = function(event, field, file) {
        emitCalled++;
        assert.equal(event, 'file');
        assert.deepEqual
          ( file
          , { path: FILE.path
            , filename: PART.filename
            , mime: PART.mime
            }
          );
      };
      cb();
      assert.equal(emitCalled, 1);
    };
    PART.emit('end');
    assert.equal(endCalled, 1);
  })();
})();

(function testUploadPath() {
  var form = new formidable.IncomingForm()
    , path1 = form._uploadPath()
    , path2 = form._uploadPath();

  assert.equal(form.uploadDir, '/tmp');

  assert.equal(path.dirname(path1), form.uploadDir);
  assert.equal(path.dirname(path2), form.uploadDir);
  assert.notEqual(path1, path2);
})();

(function testWriteStream() {
  var form = new formidable.IncomingForm();
  form.uploadDir = TEST_TMP;

  var file = form._writeStream(form._uploadPath());
  assert.ok(file instanceof fs.WriteStream);
  file.end(function() {
    fs.unlink(file.path);
  });
})();