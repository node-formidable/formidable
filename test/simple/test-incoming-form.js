require('../common');
var formidable = require('formidable')
  , events = require('events')
  , fs = require('fs')
  , path = require('path')
  , Buffer = require('buffer').Buffer
  , fixtures = require('../fixture/multipart')
  , MultipartParser = require('formidable/multipart_parser').MultipartParser
  , form
  , gently;

function test(test) {
  gently = new Gently();
  form = new formidable.IncomingForm();
  test();
  gently.verify(test.name);
}

test(function constructor() {
  assert.strictEqual(form.error, null);
  assert.strictEqual(form.ended, false);
  assert.strictEqual(form.type, null);
  assert.strictEqual(form.headers, null);
  assert.strictEqual(form.uploadDir, '/tmp');
  assert.strictEqual(form.encoding, 'utf-8');
  assert.strictEqual(form.bytesTotal, null);
  assert.strictEqual(form.bytesExpected, null);
  assert.strictEqual(form._parser, null);
  assert.strictEqual(form._flushing, 0);
  assert.ok(form instanceof events.EventEmitter);
});

test(function parse() {
  var REQ = {headers: {}}
    , emit = {};

  gently.expect(form, 'writeHeaders', function(headers) {
    assert.strictEqual(headers, REQ.headers);
  });

  var events = ['error', 'data'];
  gently.expect(REQ, 'addListener', 2, function(event, fn) {
    assert.equal(event, events.shift());
    emit[event] = fn;
    return this;
  });

  form.parse(REQ);

  (function testPause() {
    gently.expect(REQ, 'pause');
    assert.strictEqual(form.pause(), true);
  })();
  
  (function testResume() {
    gently.expect(REQ, 'resume');
    assert.strictEqual(form.resume(), true);
  })();
  
  (function testEmitError() {
    var ERR = new Error('something bad happened');
    gently.expect(form, '_error',function(err) {
      assert.strictEqual(err, ERR);
    });
    emit.error(ERR);
  })();
  
  (function testEmitData() {
    var BUFFER = [1, 2, 3];
    gently.expect(form, 'write', function(buffer) {
      assert.strictEqual(buffer, BUFFER);
    });
    emit.data(BUFFER);
  })();
  
  (function testWithCallback() {
    var form = new formidable.IncomingForm()
      , REQ = {headers: {}}
      , parseCalled = 0;
  
    gently.expect(form, 'writeHeaders');
    gently.expect(REQ, 'addListener', 2, function() {
      return this;
    });
  
    gently.expect(form, 'addListener', 4, function(event, fn) {
      if (event == 'field') {
        fn('field1', 'foo');
        fn('field1', 'bar');
        fn('field2', 'nice');
      }
  
      if (event == 'file') {
        fn('file1', '1');
        fn('file1', '2');
        fn('file2', '3');
      }
  
      if (event == 'end') {
        fn();
      }
      return this;
    });
  
    form.parse(REQ, gently.expect(function parseCbOk(err, fields, files) {
      assert.deepEqual(fields, {field1: 'bar', field2: 'nice'});
      assert.deepEqual(files, {file1: '2', file2: '3'});
    }));
  
    gently.expect(form, 'writeHeaders');
    gently.expect(REQ, 'addListener', 2, function() {
      return this;
    });
  
    var ERR = new Error('test');
    gently.expect(form, 'addListener', 3, function(event, fn) {
      if (event == 'field') {
        fn('foo', 'bar');
      }
  
      if (event == 'error') {
        fn(ERR);
        gently.expect(form, 'addListener');
      }
      return this;
    });

    form.parse(REQ, gently.expect(function parseCbErr(err, fields, files) {
      assert.strictEqual(err, ERR);
      assert.deepEqual(fields, {foo: 'bar'});
    }));
  })();
});

test(function pause() {
  assert.strictEqual(form.pause(), false);
});

test(function resume() {
  assert.strictEqual(form.resume(), false);
});


test(function writeHeaders() {
  var HEADERS = {};
  gently.expect(form, '_parseContentLength');
  gently.expect(form, '_parseContentType');

  form.writeHeaders(HEADERS);
  assert.strictEqual(form.headers, HEADERS);
});

test(function write() {
  var parser = {}
    , BUFFER = [1, 2, 3];

  form._parser = parser;

  (function testBasic() {
    gently.expect(parser, 'write', function(buffer) {
      assert.strictEqual(buffer, BUFFER);
      return buffer.length;
    });

    assert.equal(form.write(BUFFER), BUFFER.length);
    assert.equal(form.bytesExpected, BUFFER.length);
  })();

  (function testParserError() {
    gently.expect(parser, 'write', function(buffer) {
      assert.strictEqual(buffer, BUFFER);
      return buffer.length - 1;
    });

    gently.expect(form, '_error', function(err) {
      assert.ok(err.message.match(/parser error/i));
    });

    assert.equal(form.write(BUFFER), BUFFER.length - 1);
    assert.equal(form.bytesExpected, BUFFER.length + BUFFER.length - 1);
  })();

  (function testUninitialized() {
    delete form._parser;

    gently.expect(form, '_error', function(err) {
      assert.ok(err.message.match(/unintialized parser/i));
    });
    form.write(BUFFER);
  })();
});

test(function parseContentType() {
  var HEADERS = {};

  form.headers = {'content-type': 'application/x-www-form-urlencoded'};
  form._parseContentType();
  assert.strictEqual(form.type, 'urlencoded');

  // accept anything that has 'urlencoded' in it
  form.headers = {'content-type': 'broken-client/urlencoded-stupid'};
  form._parseContentType();
  assert.strictEqual(form.type, 'urlencoded');

  var BOUNDARY = '---------------------------57814261102167618332366269';
  form.headers = {'content-type': 'multipart/form-data; boundary='+BOUNDARY};

  gently.expect(form, '_initMultipart', function(boundary) {
    assert.equal(boundary, BOUNDARY);
  });
  form._parseContentType();

  (function testNoBoundary() {
    form.headers = {'content-type': 'multipart/form-data'};

    gently.expect(form, '_error', function(err) {
      assert.ok(err.message.match(/no multipart boundary/i));
    });
    form._parseContentType();
  })();

  (function testNoContentType() {
    form.headers = {};

    gently.expect(form, '_error', function(err) {
      assert.ok(err.message.match(/no content-type/i));
    });
    form._parseContentType();
  })();

  (function testUnknownContentType() {
    form.headers = {'content-type': 'invalid'};

    gently.expect(form, '_error', function(err) {
      assert.ok(err.message.match(/unknown content-type/i));
    });
    form._parseContentType();
  })();
});

test(function parseContentLength() {
  var HEADERS = {};

  form.headers = {};
  form._parseContentLength();
  assert.equal(form.bytesTotal, null);

  form.headers['content-length'] = '8';
  form._parseContentLength();
  assert.strictEqual(form.bytesExpected, 0);
  assert.strictEqual(form.bytesTotal, 8);

  // JS can be evil, lets make sure we are not
  form.headers['content-length'] = '08';
  form._parseContentLength();
  assert.strictEqual(form.bytesTotal, 8);
});

test(function _initMultipart() {
  var BOUNDARY = '123'
    , PARSER = {};

  gently.expect(form, '_newParser', function() {
    return PARSER;
  });

  gently.expect(PARSER, 'initWithBoundary', function(boundary) {
    assert.equal(boundary, BOUNDARY);
  });

  form._initMultipart(BOUNDARY);
  assert.equal(form.type, 'multipart');
  assert.strictEqual(form._parser, PARSER);

  (function testRegularField() {
    gently.expect(form, 'onPart', function(part) {
      assert.deepEqual
        ( part.headers
        , { 'content-disposition': 'form-data; name="field1"'
          , 'foo': 'bar'
          }
        );
      assert.equal(part.name, 'field1');

      var strings = ['hello', ' world'];
      gently.expect(part, 'emit', 2, function(event, b) {
          assert.equal(event, 'data');
          assert.equal(b.toString(), strings.shift());
      });

      gently.expect(part, 'emit', function(event, b) {
          assert.equal(event, 'end');
      });
    });

    PARSER.onPartBegin();
    PARSER.onHeaderField(new Buffer('content-disposition'), 0, 10);
    PARSER.onHeaderField(new Buffer('content-disposition'), 10, 19);
    PARSER.onHeaderValue(new Buffer('form-data; name="field1"'), 0, 14);
    PARSER.onHeaderValue(new Buffer('form-data; name="field1"'), 14, 24);
    PARSER.onHeaderField(new Buffer('foo'), 0, 3);
    PARSER.onHeaderValue(new Buffer('bar'), 0, 3);
    PARSER.onPartData(new Buffer('hello world'), 0, 5);
    PARSER.onPartData(new Buffer('hello world'), 5, 11);
    PARSER.onPartEnd();
  })();

  (function testFileField() {
    gently.expect(form, 'onPart', function(part) {
      assert.deepEqual
        ( part.headers
        , { 'content-disposition': 'form-data; name="field2"; filename="file1.txt"'
          , 'content-type': 'text/plain'
          }
        );
      assert.equal(part.name, 'field2');
      assert.equal(part.filename, 'file1.txt');
      assert.equal(part.mime, 'text/plain');

      gently.expect(part, 'emit', function(event, b) {
        assert.equal(event, 'data');
        assert.equal(b.toString(), '... contents of file1.txt ...');
      });

      gently.expect(part, 'emit', function(event, b) {
          assert.equal(event, 'end');
      });
    });

    PARSER.onPartBegin();
    PARSER.onHeaderField(new Buffer('content-disposition'), 0, 19);
    PARSER.onHeaderValue(new Buffer('form-data; name="field2"; filename="file1.txt"'), 0, 46);
    PARSER.onHeaderField(new Buffer('Content-Type'), 0, 12);
    PARSER.onHeaderValue(new Buffer('text/plain'), 0, 10);
    PARSER.onPartData(new Buffer('... contents of file1.txt ...'), 0, 29);
    PARSER.onPartEnd();
  })();

  (function testEnd() {
    gently.expect(form, '_maybeEnd');
    PARSER.onEnd();
    assert.ok(form.ended);
  })();
});

test(function _initUrlencoded() {
  form._initUrlencoded();
  assert.equal(form.type, 'urlencoded');
});

test(function _error() {
  var ERR = new Error('bla');

  gently.expect(form, 'pause');
  gently.expect(form, 'emit', function(event, err) {
    assert.equal(event, 'error');
    assert.strictEqual(err, ERR);
  });

  form._error(ERR);
  assert.strictEqual(form.error, ERR);

  // make sure _error only does its thing once
  form._error(ERR);
});

test(function _newParser() {
  var parser = form._newParser();
  assert.ok(parser instanceof MultipartParser);
});

test(function onPart() {
  (function testUtf8Field() {
    var PART = new events.EventEmitter();
    PART.name = 'my_field';

    gently.expect(form, 'emit', function(event, field, value) {
      assert.equal(event, 'field');
      assert.equal(field, 'my_field');
      assert.equal(value, 'hello world: €');
    });

    form.onPart(PART);
    PART.emit('data', new Buffer('hello'));
    PART.emit('data', new Buffer(' world: '));
    PART.emit('data', new Buffer([0xE2]));
    PART.emit('data', new Buffer([0x82, 0xAC]));
    PART.emit('end');
  })();

  (function testBinaryField() {
    var PART = new events.EventEmitter();
    PART.name = 'my_field2';

    gently.expect(form, 'emit', function(event, field, value) {
      assert.equal(event, 'field');
      assert.equal(field, 'my_field2');
      assert.equal(value, 'hello world: '+new Buffer([0xE2, 0x82, 0xAC]).toString('binary'));
    });

    form.encoding = 'binary';
    form.onPart(PART);
    PART.emit('data', new Buffer('hello'));
    PART.emit('data', new Buffer(' world: '));
    PART.emit('data', new Buffer([0xE2]));
    PART.emit('data', new Buffer([0x82, 0xAC]));
    PART.emit('end');
  })();

  (function testFilePart() {
    var PART = new events.EventEmitter()
      , FILE = new events.EventEmitter();

    PART.name = 'my_file';
    PART.filename = 'sweet.txt';
    PART.mime = 'sweet.txt';

    FILE.path = form._uploadPath();

    gently.expect(form, '_writeStream', function(file) {
      assert.equal(path.dirname(file), form.uploadDir);
      return FILE;
    });

    form.onPart(PART);
    assert.equal(form._flushing, 1);

    var BUFFER;
    gently.expect(form, 'pause');
    gently.expect(FILE, 'write', function(buffer, cb) {
      assert.strictEqual(buffer, BUFFER);
      gently.expect(form, 'resume');
      // @todo handle cb(new Err)
      cb();
    });

    PART.emit('data', BUFFER = new Buffer('test'));

    gently.expect(FILE, 'end', function(cb) {
      gently.expect(form, 'emit', function(event, field, file) {
        assert.equal(event, 'file');
        assert.deepEqual
          ( file
          , { path: FILE.path
            , filename: PART.filename
            , mime: PART.mime
            }
          );
      });

      gently.expect(form, '_maybeEnd');

      cb();
      assert.equal(form._flushing, 0);
    });

    PART.emit('end');
  })();
});

test(function _uploadPath() {
  var path1 = form._uploadPath()
    , path2 = form._uploadPath();

  assert.equal(form.uploadDir, '/tmp');

  assert.equal(path.dirname(path1), form.uploadDir);
  assert.equal(path.dirname(path2), form.uploadDir);
  assert.notEqual(path1, path2);
});

test(function _writeStream() {
  form.uploadDir = TEST_TMP;

  var file = form._writeStream(form._uploadPath());
  assert.ok(file instanceof fs.WriteStream);
  file.end(function() {
    fs.unlink(file.path);
  });
});

test(function _maybeEnd() {
  gently.expect(form, 'emit', 0);
  form._maybeEnd();

  form.ended = true;
  form._flushing = 1;
  form._maybeEnd();

  gently.expect(form, 'emit', function(event) {
    assert.equal(event, 'end');
  });

  form.ended = true;
  form._flushing = 0;
  form._maybeEnd();
});