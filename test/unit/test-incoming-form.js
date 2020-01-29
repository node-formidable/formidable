/* eslint-disable no-underscore-dangle */

'use strict';

const path = require('path');
const assert = require('assert');
const Request = require('http').ClientRequest;

const test = require('utest');
const mod = require('../../src/index');

let form;

['IncomingForm', 'Formidable', 'formidable'].forEach((name) => {
  test(name, {
    before() {
      form = name === 'formidable' ? mod.formidable() : new mod[name]();
    },

    [`${name}#_fileName with regular characters`]: () => {
      const filename = 'foo.txt';

      assert.equal(form._fileName(makeHeader(filename)), 'foo.txt');
    },

    [`${name}#_fileName with unescaped quote`]: () => {
      const filename = 'my".txt';

      assert.equal(form._fileName(makeHeader(filename)), 'my".txt');
    },

    [`${name}#_fileName with escaped quote`]: () => {
      const filename = 'my%22.txt';

      assert.equal(form._fileName(makeHeader(filename)), 'my".txt');
    },

    [`${name}#_fileName with bad quote and additional sub-header`]: () => {
      const filename = 'my".txt';

      const header = `${makeHeader(filename)}; foo="bar"`;
      assert.equal(form._fileName(header), filename);
    },

    [`${name}#_fileName with semicolon`]: () => {
      const filename = 'my;.txt';

      assert.equal(form._fileName(makeHeader(filename)), 'my;.txt');
    },

    [`${name}#_fileName with utf8 character`]: () => {
      const filename = 'my&#9731;.txt';

      assert.equal(form._fileName(makeHeader(filename)), 'my☃.txt');
    },

    [`${name}#_uploadPath strips harmful characters from extension when keepExtensions`]: () => {
      form.keepExtensions = true;

      let ext = path.extname(form._uploadPath('fine.jpg?foo=bar'));
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

    [`${name}#_Array parameters support`]: () => {
      const opts = { multiples: true };
      form = name === 'formidable' ? mod.formidable(opts) : new mod[name](opts);

      const req = new Request();
      req.headers = 'content-type: json; content-length:8';
      form.parse(req, (error, fields) => {
        assert.equal(Array.isArray(fields.a), true);
        assert.equal(fields.a[0], 1);
        assert.equal(fields.a[1], 2);
      });
      form.emit('field', 'a[]', 1);
      form.emit('field', 'a[]', 2);
      form.emit('end');
    },
  });
});

function makeHeader(filename) {
  return `Content-Disposition: form-data; name="upload"; filename="${filename}"`;
}
