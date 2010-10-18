var path = require('path'),
    fs = require('fs');

require.paths.unshift(path.dirname(__dirname)+'/lib');
var util = require('formidable/util');

try {
  global.Gently = require('gently');
} catch (e) {
  throw new Error('this test suite requires node-gently');
}

global.GENTLY = new Gently();

global.puts = util.puts;
global.p = function() {
  util.error(util.inspect.apply(null, arguments));
};
global.assert = require('assert');
global.TEST_PORT = 13532;
global.TEST_FIXTURES = path.join(__dirname, 'fixture');
global.TEST_TMP = path.join(__dirname, 'tmp');
