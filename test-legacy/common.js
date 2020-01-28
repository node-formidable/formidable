const path = require('path');
const fs = require('fs');

exports.lib = path.join(__dirname, '../../lib');

global.assert = require('assert');

global.TEST_PORT = 13532;
global.TEST_FIXTURES = path.join(__dirname, '../fixture');
global.TEST_TMP = path.join(__dirname, '../tmp');

// Stupid new feature in node that complains about gently attaching too many
// listeners to process 'exit'. This is a workaround until I can think of a
// better way to deal with this.
if (process.setMaxListeners) {
  process.setMaxListeners(10000);
}
