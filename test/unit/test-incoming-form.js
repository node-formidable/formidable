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
    console.log('xxxxxxxxxxxx1')
    assert.equal(form._fileName(makeHeader(filename)), 'foo.txt');
    console.log('xxxxxxxxxxxx1')
  },

  '#_fileName with unescaped quote': function() {
    var filename = 'my".txt';
    console.log('xxxxxxxxxxxx2')
    assert.equal(form._fileName(makeHeader(filename)), 'my".txt');
    console.log('xxxxxxxxxxxx2')
  },

  '#_fileName with escaped quote': function() {
    var filename = 'my%22.txt';
    console.log('xxxxxxxxxxxx3')
    assert.equal(form._fileName(makeHeader(filename)), 'my".txt');
    console.log('xxxxxxxxxxxx3')
  },

  '#_fileName with bad quote and additional sub-header': function() {
    var filename = 'my".txt';
    console.log('xxxxxxxxxxxx4')
    var header = makeHeader(filename) + '; foo="bar"';
    assert.equal(form._fileName(header), filename);
    console.log('xxxxxxxxxxxx4')
  },

  '#_fileName with semicolon': function() {
    var filename = 'my;.txt';
    console.log('xxxxxxxxxxxx5')
    assert.equal(form._fileName(makeHeader(filename)), 'my;.txt');
    console.log('xxxxxxxxxxxx5')
  },

  '#_fileName with utf8 character': function() {
    var filename = 'my&#9731;.txt';
    console.log('xxxxxxxxxxxx6')
    assert.equal(form._fileName(makeHeader(filename)), 'my☃.txt');
    console.log('xxxxxxxxxxxx6')
  },

  '#_uploadPath strips harmful characters from extension when keepExtensions': function() {
    form.keepExtensions = true;
    console.log('xxxxxxxxxxxx7.1')

    var ext = path.extname(form._uploadPath('fine.jpg?foo=bar'));
    assert.equal(ext, '.jpg');
    console.log('xxxxxxxxxxxx7.2')

    ext = path.extname(form._uploadPath('fine?foo=bar'));
    assert.equal(ext, '');
    console.log('xxxxxxxxxxxx7.3')

    ext = path.extname(form._uploadPath('super.cr2+dsad'));
    assert.equal(ext, '.cr2');
    console.log('xxxxxxxxxxxx7.4')

    ext = path.extname(form._uploadPath('super.bar'));
    assert.equal(ext, '.bar');
    console.log('xxxxxxxxxxxx7.5')

    ext = path.extname(form._uploadPath('file.aAa'));
    assert.equal(ext, '.aAa');
    console.log('xxxxxxxxxxxx7.6')
  },

  '#_Array parameters support': function () {
    console.log('xxxxxxxxxxxx8')
    form = new IncomingForm({multiples: true});
    const req = new Request();
    req.headers = 'content-type: json; content-length:8'
    form.parse(req, function (error, fields, files) {
      console.log('xxxxxxxxxxxx8.1')
      assert.equal(Array.isArray(fields.a), true);
      assert.equal(fields.a[0], 1);
      assert.equal(fields.a[1], 2);
      console.log('xxxxxxxxxxxx8.2')
    })
    form.emit('field', 'a[]', 1);
    form.emit('field', 'a[]', 2);
    form.emit('end');
    console.log('xxxxxxxxxxxx8')
  },
});

function makeHeader(filename) {
  return 'Content-Disposition: form-data; name="upload"; filename="' + filename + '"';
}
