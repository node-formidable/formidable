const common = require('../common');

const MultipartParserStub = GENTLY.stub(
  './multipart_parser',
  'MultipartParser',
);
const QuerystringParserStub = GENTLY.stub(
  './querystring_parser',
  'QuerystringParser',
);
const EventEmitterStub = GENTLY.stub('events', 'EventEmitter');
const StreamStub = GENTLY.stub('stream', 'Stream');
const FileStub = GENTLY.stub('./file');

const formidable = require(`${common.lib}/index`);
const { IncomingForm } = formidable;
const events = require('events');
const fs = require('fs');
const path = require('path');

const fixtures = require(`${TEST_FIXTURES}/multipart`);
let form;
let gently;

function test(test) {
  gently = new Gently();
  gently.expect(EventEmitterStub, 'call');
  form = new IncomingForm();
  test();
  gently.verify(test.name);
}

test(function constructor() {
  assert.strictEqual(form.error, null);
  assert.strictEqual(form.ended, false);
  assert.strictEqual(form.type, null);
  assert.strictEqual(form.headers, null);
  assert.strictEqual(form.keepExtensions, false);
  // Can't assume dir === '/tmp' for portability
  // assert.strictEqual(form.uploadDir, '/tmp');
  // Make sure it is a directory instead
  assert.doesNotThrow(function() {
    assert(fs.statSync(form.uploadDir).isDirectory());
  });
  assert.strictEqual(form.encoding, 'utf-8');
  assert.strictEqual(form.bytesReceived, null);
  assert.strictEqual(form.bytesExpected, null);
  assert.strictEqual(form.maxFieldsSize, 20 * 1024 * 1024);
  assert.strictEqual(form._parser, null);
  assert.strictEqual(form._flushing, 0);
  assert.strictEqual(form._fieldsSize, 0);
  assert.ok(form instanceof EventEmitterStub);
  assert.equal(form.constructor.name, 'IncomingForm');

  (function testSimpleConstructor() {
    gently.expect(EventEmitterStub, 'call');
    const form = IncomingForm();
    assert.ok(form instanceof IncomingForm);
  })();

  (function testSimpleConstructorShortcut() {
    gently.expect(EventEmitterStub, 'call');
    const form = formidable();
    assert.ok(form instanceof IncomingForm);
  })();
});

test(function parse() {
  const REQ = { headers: {} };
  const emit = {};

  gently.expect(form, 'writeHeaders', function(headers) {
    assert.strictEqual(headers, REQ.headers);
  });

  const EVENTS = ['error', 'aborted', 'data', 'end'];
  gently.expect(REQ, 'on', EVENTS.length, function(event, fn) {
    assert.equal(event, EVENTS.shift());
    emit[event] = fn;
    return this;
  });

  form.parse(REQ);

  (function testPause() {
    gently.expect(REQ, 'pause');
    assert.strictEqual(form.pause(), true);
  })();

  (function testPauseCriticalException() {
    form.ended = false;

    const ERR = new Error('dasdsa');
    gently.expect(REQ, 'pause', function() {
      throw ERR;
    });

    gently.expect(form, '_error', function(err) {
      assert.strictEqual(err, ERR);
    });

    assert.strictEqual(form.pause(), false);
  })();

  (function testPauseHarmlessException() {
    form.ended = true;

    const ERR = new Error('dasdsa');
    gently.expect(REQ, 'pause', function() {
      throw ERR;
    });

    assert.strictEqual(form.pause(), false);
  })();

  (function testResume() {
    gently.expect(REQ, 'resume');
    assert.strictEqual(form.resume(), true);
  })();

  (function testResumeCriticalException() {
    form.ended = false;

    const ERR = new Error('dasdsa');
    gently.expect(REQ, 'resume', function() {
      throw ERR;
    });

    gently.expect(form, '_error', function(err) {
      assert.strictEqual(err, ERR);
    });

    assert.strictEqual(form.resume(), false);
  })();

  (function testResumeHarmlessException() {
    form.ended = true;

    const ERR = new Error('dasdsa');
    gently.expect(REQ, 'resume', function() {
      throw ERR;
    });

    assert.strictEqual(form.resume(), false);
  })();

  (function testEmitError() {
    const ERR = new Error('something bad happened');
    gently.expect(form, '_error', function(err) {
      assert.strictEqual(err, ERR);
    });
    emit.error(ERR);
  })();

  (function testEmitAborted() {
    gently.expect(form, 'emit', function(event) {
      assert.equal(event, 'aborted');
    });
    gently.expect(form, '_error');

    emit.aborted();
  })();

  (function testEmitData() {
    const BUFFER = [1, 2, 3];
    gently.expect(form, 'write', function(buffer) {
      assert.strictEqual(buffer, BUFFER);
    });
    emit.data(BUFFER);
  })();

  (function testEmitEnd() {
    form._parser = {};

    (function testWithError() {
      const ERR = new Error('haha');
      gently.expect(form._parser, 'end', function() {
        return ERR;
      });

      gently.expect(form, '_error', function(err) {
        assert.strictEqual(err, ERR);
      });

      emit.end();
    })();

    (function testWithoutError() {
      gently.expect(form._parser, 'end');
      emit.end();
    })();

    (function testAfterError() {
      form.error = true;
      emit.end();
    })();
  })();

  (function testWithCallback() {
    gently.expect(EventEmitterStub, 'call');
    const form = new IncomingForm();
    const REQ = { headers: {} };
    const parseCalled = 0;

    gently.expect(form, 'on', 4, function(event, fn) {
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

    gently.expect(form, 'writeHeaders');

    gently.expect(REQ, 'on', 4, function() {
      return this;
    });

    const parseCbOk = function(err, fields, files) {
      // assert.deepEqual(fields, {field1: ['foo', 'bar'], field2: 'nice'});
      assert.deepEqual(files, { file1: '2', file2: '3' });
    };
    form.parse(REQ, parseCbOk);

    const ERR = new Error('test');
    gently.expect(form, 'on', 3, function(event, fn) {
      if (event == 'field') {
        fn('foo', 'bar');
      }

      if (event == 'error') {
        fn(ERR);
        gently.expect(form, 'on');
        gently.expect(form, 'writeHeaders');
        gently.expect(REQ, 'on', 4, function() {
          return this;
        });
      }
      return this;
    });

    form.parse(REQ, function parseCbErr(err, fields, files) {
      assert.strictEqual(err, ERR);
      assert.deepEqual(fields, { foo: 'bar' });
    });
  })();

  (function testWriteOrder() {
    gently.expect(EventEmitterStub, 'call');
    const form = new IncomingForm();
    const REQ = new events.EventEmitter();
    const BUF = {};
    const DATACB = null;

    REQ.on('newListener', function(event, fn) {
      if (event === 'data') fn(BUF);
    });

    gently.expect(form, 'writeHeaders');
    gently.expect(form, 'write', function(buf) {
      assert.strictEqual(buf, BUF);
    });

    form.parse(REQ);
  })();
});

test(function pause() {
  assert.strictEqual(form.pause(), false);
});

test(function resume() {
  assert.strictEqual(form.resume(), false);
});

test(function writeHeaders() {
  const HEADERS = {};
  gently.expect(form, '_parseContentLength');
  gently.expect(form, '_parseContentType');

  form.writeHeaders(HEADERS);
  assert.strictEqual(form.headers, HEADERS);
});

test(function write() {
  const parser = {};
  const BUFFER = [1, 2, 3];

  form._parser = parser;
  form.bytesExpected = 523423;

  (function testBasic() {
    gently.expect(form, 'emit', function(event, bytesReceived, bytesExpected) {
      assert.equal(event, 'progress');
      assert.equal(bytesReceived, BUFFER.length);
      assert.equal(bytesExpected, form.bytesExpected);
    });

    gently.expect(parser, 'write', function(buffer) {
      assert.strictEqual(buffer, BUFFER);
      return buffer.length;
    });

    assert.equal(form.write(BUFFER), BUFFER.length);
    assert.equal(form.bytesReceived, BUFFER.length);
  })();

  (function testParserError() {
    gently.expect(form, 'emit');

    gently.expect(parser, 'write', function(buffer) {
      assert.strictEqual(buffer, BUFFER);
      return buffer.length - 1;
    });

    gently.expect(form, '_error', function(err) {
      assert.ok(err.message.match(/parser error/i));
    });

    assert.equal(form.write(BUFFER), BUFFER.length - 1);
    assert.equal(form.bytesReceived, BUFFER.length + BUFFER.length);
  })();

  (function testUninitialized() {
    delete form._parser;

    gently.expect(form, '_error', function(err) {
      assert.ok(err.message.match(/uninitialized parser/i));
    });
    form.write(BUFFER);
  })();
});

test(function parseContentType() {
  const HEADERS = {};

  form.headers = { 'content-type': 'application/x-www-form-urlencoded' };
  gently.expect(form, '_initUrlencoded');
  form._parseContentType();

  // accept anything that has 'urlencoded' in it
  form.headers = { 'content-type': 'broken-client/urlencoded-stupid' };
  gently.expect(form, '_initUrlencoded');
  form._parseContentType();

  const BOUNDARY = '---------------------------57814261102167618332366269';
  form.headers = {
    'content-type': `multipart/form-data; boundary=${BOUNDARY}`,
  };

  gently.expect(form, '_initMultipart', function(boundary) {
    assert.equal(boundary, BOUNDARY);
  });
  form._parseContentType();

  (function testQuotedBoundary() {
    form.headers = {
      'content-type': `multipart/form-data; boundary="${BOUNDARY}"`,
    };

    gently.expect(form, '_initMultipart', function(boundary) {
      assert.equal(boundary, BOUNDARY);
    });
    form._parseContentType();
  })();

  (function testNoBoundary() {
    form.headers = { 'content-type': 'multipart/form-data' };

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
    form.headers = { 'content-type': 'invalid' };

    gently.expect(form, '_error', function(err) {
      assert.ok(err.message.match(/unknown content-type/i));
    });
    form._parseContentType();
  })();
});

test(function parseContentLength() {
  const HEADERS = {};

  form.headers = {};
  gently.expect(form, 'emit', function(event, bytesReceived, bytesExpected) {
    assert.equal(event, 'progress');
    assert.equal(bytesReceived, 0);
    assert.equal(bytesExpected, 0);
  });
  form._parseContentLength();

  form.headers['content-length'] = '8';
  gently.expect(form, 'emit', function(event, bytesReceived, bytesExpected) {
    assert.equal(event, 'progress');
    assert.equal(bytesReceived, 0);
    assert.equal(bytesExpected, 8);
  });
  form._parseContentLength();
  assert.strictEqual(form.bytesReceived, 0);
  assert.strictEqual(form.bytesExpected, 8);

  // JS can be evil, lets make sure we are not
  form.headers['content-length'] = '08';
  gently.expect(form, 'emit', function(event, bytesReceived, bytesExpected) {
    assert.equal(event, 'progress');
    assert.equal(bytesReceived, 0);
    assert.equal(bytesExpected, 8);
  });
  form._parseContentLength();
  assert.strictEqual(form.bytesExpected, 8);
});

test(function _initMultipart() {
  const BOUNDARY = '123';
  let PARSER;

  gently.expect(MultipartParserStub, 'new', function() {
    PARSER = this;
  });

  gently.expect(MultipartParserStub.prototype, 'initWithBoundary', function(
    boundary,
  ) {
    assert.equal(boundary, BOUNDARY);
  });

  form._initMultipart(BOUNDARY);
  assert.equal(form.type, 'multipart');
  assert.strictEqual(form._parser, PARSER);

  (function testRegularField() {
    let PART;
    gently.expect(StreamStub, 'new', function() {
      PART = this;
    });

    gently.expect(form, 'onPart', function(part) {
      assert.strictEqual(part, PART);
      assert.deepEqual(part.headers, {
        'content-disposition': 'form-data; name="field1"',
        foo: 'bar',
      });
      assert.equal(part.name, 'field1');

      const strings = ['hello', ' world'];
      gently.expect(part, 'emit', 2, function(event, b) {
        assert.equal(event, 'data');
        assert.equal(b.toString(), strings.shift());
      });

      gently.expect(part, 'emit', function(event, b) {
        assert.equal(event, 'end');
      });
    });

    PARSER.onPartBegin();
    PARSER.onHeaderField(Buffer.from('content-disposition'), 0, 10);
    PARSER.onHeaderField(Buffer.from('content-disposition'), 10, 19);
    PARSER.onHeaderValue(Buffer.from('form-data; name="field1"'), 0, 14);
    PARSER.onHeaderValue(Buffer.from('form-data; name="field1"'), 14, 24);
    PARSER.onHeaderEnd();
    PARSER.onHeaderField(Buffer.from('foo'), 0, 3);
    PARSER.onHeaderValue(Buffer.from('bar'), 0, 3);
    PARSER.onHeaderEnd();
    PARSER.onHeadersEnd();
    PARSER.onPartData(Buffer.from('hello world'), 0, 5);
    PARSER.onPartData(Buffer.from('hello world'), 5, 11);
    PARSER.onPartEnd();
  })();

  (function testFileField() {
    let PART;
    gently.expect(StreamStub, 'new', function() {
      PART = this;
    });

    gently.expect(form, 'onPart', function(part) {
      assert.deepEqual(part.headers, {
        'content-disposition':
          'form-data; name="field2"; filename="C:\\Documents and Settings\\IE\\Must\\Die\\Sun"et.jpg"',
        'content-type': 'text/plain',
      });
      assert.equal(part.name, 'field2');
      assert.equal(part.filename, 'Sun"et.jpg');
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
    PARSER.onHeaderField(Buffer.from('content-disposition'), 0, 19);
    PARSER.onHeaderValue(
      Buffer.from(
        'form-data; name="field2"; filename="C:\\Documents and Settings\\IE\\Must\\Die\\Sun"et.jpg"',
      ),
      0,
      85,
    );
    PARSER.onHeaderEnd();
    PARSER.onHeaderField(Buffer.from('Content-Type'), 0, 12);
    PARSER.onHeaderValue(Buffer.from('text/plain'), 0, 10);
    PARSER.onHeaderEnd();
    PARSER.onHeadersEnd();
    PARSER.onPartData(Buffer.from('... contents of file1.txt ...'), 0, 29);
    PARSER.onPartEnd();
  })();

  (function testEnd() {
    gently.expect(form, '_maybeEnd');
    PARSER.onEnd();
    assert.ok(form.ended);
  })();
});

test(function _fileName() {
  // TODO
});

test(function _initUrlencoded() {
  let PARSER;

  gently.expect(QuerystringParserStub, 'new', function() {
    PARSER = this;
  });

  form._initUrlencoded();
  assert.equal(form.type, 'urlencoded');
  assert.strictEqual(form._parser, PARSER);

  (function testOnField() {
    const KEY = 'KEY';
    const VAL = 'VAL';
    gently.expect(form, 'emit', function(field, key, val) {
      assert.equal(field, 'field');
      assert.equal(key, KEY);
      assert.equal(val, VAL);
    });

    PARSER.onField(KEY, VAL);
  })();

  (function testOnEnd() {
    gently.expect(form, '_maybeEnd');

    PARSER.onEnd();
    assert.equal(form.ended, true);
  })();
});

test(function _error() {
  const ERR = new Error('bla');

  gently.expect(form, 'emit', function(event, err) {
    assert.equal(event, 'error');
    assert.strictEqual(err, ERR);
  });

  form._error(ERR);
  assert.strictEqual(form.error, ERR);

  // make sure _error only does its thing once
  form._error(ERR);
});

test(function onPart() {
  const PART = {};
  gently.expect(form, 'handlePart', function(part) {
    assert.strictEqual(part, PART);
  });

  form.onPart(PART);
});

test(function handlePart() {
  (function testUtf8Field() {
    const PART = new events.EventEmitter();
    PART.name = 'my_field';

    gently.expect(form, 'emit', function(event, field, value) {
      assert.equal(event, 'field');
      assert.equal(field, 'my_field');
      assert.equal(value, 'hello world: €');
    });

    form.handlePart(PART);
    PART.emit('data', Buffer.from('hello'));
    PART.emit('data', Buffer.from(' world: '));
    PART.emit('data', Buffer.from([0xe2]));
    PART.emit('data', Buffer.from([0x82, 0xac]));
    PART.emit('end');
  })();

  (function testBinaryField() {
    const PART = new events.EventEmitter();
    PART.name = 'my_field2';

    gently.expect(form, 'emit', function(event, field, value) {
      assert.equal(event, 'field');
      assert.equal(field, 'my_field2');
      assert.equal(
        value,
        `hello world: ${Buffer.from([0xe2, 0x82, 0xac]).toString('binary')}`,
      );
    });

    form.encoding = 'binary';
    form.handlePart(PART);
    PART.emit('data', Buffer.from('hello'));
    PART.emit('data', Buffer.from(' world: '));
    PART.emit('data', Buffer.from([0xe2]));
    PART.emit('data', Buffer.from([0x82, 0xac]));
    PART.emit('end');
  })();

  (function testFieldSize() {
    form.maxFieldsSize = 8;
    const PART = new events.EventEmitter();
    PART.name = 'my_field';

    gently.expect(form, '_error', function(err) {
      assert.equal(
        err.message,
        'maxFieldsSize exceeded, received 9 bytes of field data',
      );
    });

    form.handlePart(PART);
    form._fieldsSize = 1;
    PART.emit('data', Buffer.alloc(7));
    PART.emit('data', Buffer.alloc(1));
  })();

  (function testFilePart() {
    const PART = new events.EventEmitter();
    let FILE = new events.EventEmitter();
    const PATH = '/foo/bar';

    PART.name = 'my_file';
    PART.filename = 'sweet.txt';
    PART.mime = 'sweet.txt';

    gently.expect(form, '_uploadPath', function(filename) {
      assert.equal(filename, PART.filename);
      return PATH;
    });

    gently.expect(FileStub, 'new', function(properties) {
      assert.equal(properties.path, PATH);
      assert.equal(properties.name, PART.filename);
      assert.equal(properties.type, PART.mime);
      FILE = this;

      gently.expect(form, 'emit', function(event, field, file) {
        assert.equal(event, 'fileBegin');
        assert.strictEqual(field, PART.name);
        assert.strictEqual(file, FILE);
      });

      gently.expect(FILE, 'open');
    });

    form.handlePart(PART);
    assert.equal(form._flushing, 1);

    let BUFFER;
    gently.expect(form, 'pause');
    gently.expect(FILE, 'write', function(buffer, cb) {
      assert.strictEqual(buffer, BUFFER);
      gently.expect(form, 'resume');
      // @todo handle cb(new Err)
      cb();
    });

    PART.emit('data', (BUFFER = Buffer.from('test')));

    gently.expect(FILE, 'end', function(cb) {
      gently.expect(form, 'emit', function(event, field, file) {
        assert.equal(event, 'file');
        assert.strictEqual(file, FILE);
      });

      gently.expect(form, '_maybeEnd');

      cb();
      assert.equal(form._flushing, 0);
    });

    PART.emit('end');
  })();
});

test(function _uploadPath() {
  (function testUniqueId() {
    let UUID_A;
    let UUID_B;
    gently.expect(GENTLY.hijacked.path, 'join', function(uploadDir, uuid) {
      assert.equal(uploadDir, form.uploadDir);
      UUID_A = uuid;
    });
    form._uploadPath();

    gently.expect(GENTLY.hijacked.path, 'join', function(uploadDir, uuid) {
      UUID_B = uuid;
    });
    form._uploadPath();

    assert.notEqual(UUID_A, UUID_B);
  })();

  (function testFileExtension() {
    form.keepExtensions = true;
    const FILENAME = 'foo.jpg';
    const EXT = '.bar';

    gently.expect(GENTLY.hijacked.path, 'extname', function(filename) {
      assert.equal(filename, FILENAME);
      gently.restore(path, 'extname');

      return EXT;
    });

    gently.expect(GENTLY.hijacked.path, 'join', function(uploadDir, name) {
      assert.equal(path.extname(name), EXT);
    });
    form._uploadPath(FILENAME);
  })();
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
