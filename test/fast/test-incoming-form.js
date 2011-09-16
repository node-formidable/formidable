var common = require('../common');
var test = common.fastOrSlow.fast();
var assert = common.assert;

var IncomingForm = common.require('incoming_form').IncomingForm;

var form;
test.before(function() {
  form = new IncomingForm();
});

function makeHeader(filename) {
  return 'Content-Disposition: form-data; name="upload"; filename="' + filename + '"';
}

test('#_fileName with regular characters', function() {
  var filename = 'foo.txt';
  assert.equal(form._fileName(makeHeader(filename)), 'foo.txt');
});

test('#_fileName with unescaped quote', function() {
  var filename = 'my".txt';
  assert.equal(form._fileName(makeHeader(filename)), 'my".txt');
});

test('#_fileName with escaped quote', function() {
  var filename = 'my%22.txt';
  assert.equal(form._fileName(makeHeader(filename)), 'my".txt');
});

test('#_fileName with bad quote and additional sub-header', function() {
  var filename = 'my".txt';
  var header = makeHeader(filename) + '; foo="bar"';
  assert.equal(form._fileName(header), filename);
});

test('#_fileName with semicolon', function() {
  var filename = 'my;.txt';
  assert.equal(form._fileName(makeHeader(filename)), 'my;.txt');
});

test('#_fileName with utf8 character', function() {
  var filename = 'my&#9731;.txt';
  assert.equal(form._fileName(makeHeader(filename)), 'my☃.txt');
});
