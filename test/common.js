var path = require('path')
  , fs = require('fs')
  , sys = require('sys')
  , timeout;

require.paths.unshift(path.dirname(__dirname)+'/lib');

try {
  global.Gently = require('gently');
} catch (e) {
  throw new Error('this test suite requires node-gently');
}

global.GENTLY = new Gently();

global.puts = sys.puts;
global.p = function() {
  sys.error(sys.inspect.apply(null, arguments));
};
global.assert = require('assert');
global.TEST_PORT = 13532;
global.TEST_FIXTURES = path.join(__dirname, 'fixture');
global.TEST_TMP = path.join(__dirname, 'tmp');

assert.timeout = function(ms) {
  return setTimeout(function() {
    timeout = 'timeout (after '+ms+' ms): ';
    process.emit('exit');

    throw new Error('timeout after '+ms+' ms');
  }, ms);
};

assert.callbacks = function(callbacks) {
  process.addListener('exit', function() {
    for (var k in callbacks) {
      assert.equal(0, callbacks[k], (timeout || '')+k+' count off by '+callbacks[k]);
    }
  });
};

assert.properties = function(obj, properties) {
  properties.forEach(function(property) {
    assert.ok(property in obj, 'has property: '+property);
  });

  for (var property in obj) {
    if (!obj.hasOwnProperty(property)) {
      continue;
    }

    if (typeof obj[property] == 'function') {
      continue;
    }

    assert.ok(
      properties.indexOf(property) > -1,
      'does not have property: '+property
    );
  }
};