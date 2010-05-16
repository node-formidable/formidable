require('../common');
var formidable = require('formidable')
  , events = require('events')
  , Buffer = require('buffer').Buffer
  , fixtures = require('../fixture/multipart');

(function testConstructor() {
  var PROPERTIES =
      [ 'type'
      , 'headers'
      , 'bytesTotal'
      , 'bytesReceived'
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
    emit.error(ERR);
    assert.equal(pauseCalled, 1);
    assert.equal(emitCalled, 1);
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

(function testParseContentType() {
  var HEADERS = {}
    , form = new formidable.IncomingForm();

  form.headers = {};
  form._parseContentType();
  assert.strictEqual(form.type, null);

  form.headers = {'content-type': 'application/x-www-form-urlencoded'};
  form._parseContentType();
  assert.strictEqual(form.type, 'urlencoded');

  // accept anything that has 'urlencoded' in it
  form.headers = {'content-type': 'broken-client/urlencoded-stupid'};
  form._parseContentType();
  assert.strictEqual(form.type, 'urlencoded');

  var BOUNDARY = '---------------------------57814261102167618332366269';
  form.headers = {'content-type': 'multipart/form-data; boundary='+BOUNDARY};
  form._parseContentType();
  assert.strictEqual(form.type, 'multipart');
  assert.strictEqual(form.boundary, BOUNDARY);

  // no boundary!
  form.headers = {'content-type': 'multipart/form-data'};
  var emitCalled = false;
  form.emit = function(event, err) {
    assert.ok(event, 'error');

    emitCalled = true; 
    assert.equal(form.boundary, null);
    assert.ok(err.message.match(/bad content-type header/i));
  };

  var pauseCalled = false;
  form.pause = function() {
    pauseCalled = true;
  };
  form._parseContentType();
  assert.ok(emitCalled);
  assert.ok(pauseCalled);
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