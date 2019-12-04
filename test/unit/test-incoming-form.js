var common       = require('../common');
var test         = require('utest');
var assert       = common.assert;
var IncomingForm = common.require('incoming_form').IncomingForm;
var path         = require('path');
var Request = require('http').ClientRequest

var form;
test('IncomingForm', {
  before: function() {
    form = new IncomingForm();
  },

  '#_fileName with regular characters': function() {
    var filename = 'foo.txt';
    assert.equal(form._fileName(makeHeader(filename)), 'foo.txt');
  },

  '#_fileName with unescaped quote': function() {
    var filename = 'my".txt';
    assert.equal(form._fileName(makeHeader(filename)), 'my".txt');
  },

  '#_fileName with escaped quote': function() {
    var filename = 'my%22.txt';
    assert.equal(form._fileName(makeHeader(filename)), 'my".txt');
  },

  '#_fileName with bad quote and additional sub-header': function() {
    var filename = 'my".txt';
    var header = makeHeader(filename) + '; foo="bar"';
    assert.equal(form._fileName(header), filename);
  },

  '#_fileName with semicolon': function() {
    var filename = 'my;.txt';
    assert.equal(form._fileName(makeHeader(filename)), 'my;.txt');
  },

  '#_fileName with utf8 character': function() {
    var filename = 'my&#9731;.txt';
    assert.equal(form._fileName(makeHeader(filename)), 'my☃.txt');
  },

  '#_uploadPath strips harmful characters from extension when keepExtensions': function() {
    form.keepExtensions = true;

    var ext = path.extname(form._uploadPath('fine.jpg?foo=bar'));
    assert.equal(ext, '.jpg');

    ext = path.extname(form._uploadPath('fine?foo=bar'));
    assert.equal(ext, '');

    ext = path.extname(form._uploadPath('super.cr2+dsad'));
    assert.equal(ext, '.cr2');

    ext = path.extname(form._uploadPath('super.bar'));
    assert.equal(ext, '.bar');

    ext = path.extname(form._uploadPath('file.aAa'));
    assert.equal(ext, '.aAa');
  },
  
  '#_Array parameters support': function () {
    form = new IncomingForm({multiples: true});
    const req = new Request();
    req.headers = 'content-type: json; content-length:8'
    form.parse(req, function (error, fields, files) {
      assert.equal(Array.isArray(fields.a), true);
      assert.equal(fields.a[0], 1);
      assert.equal(fields.a[1], 2);
    })
    form.emit('field', 'a[]', 1);
    form.emit('field', 'a[]', 2);
    form.emit('end');
  },
});

function makeHeader(filename) {
  return 'Content-Disposition: form-data; name="upload"; filename="' + filename + '"';
}
