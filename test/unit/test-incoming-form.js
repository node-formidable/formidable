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

    [`${name}#_getFileName with regular characters`]: () => {
      const filename = 'foo.txt';

      assert.strictEqual(form._getFileName(makeHeader(filename)), 'foo.txt');
    },

    [`${name}#_getFileName with unescaped quote`]: () => {
      const filename = 'my".txt';

      assert.strictEqual(form._getFileName(makeHeader(filename)), 'my".txt');
    },

    [`${name}#_getFileName with escaped quote`]: () => {
      const filename = 'my%22.txt';

      assert.strictEqual(form._getFileName(makeHeader(filename)), 'my".txt');
    },

    [`${name}#_getFileName with bad quote and additional sub-header`]: () => {
      const filename = 'my".txt';

      const header = `${makeHeader(filename)}; foo="bar"`;
      assert.strictEqual(form._getFileName(header), filename);
    },

    [`${name}#_getFileName with semicolon`]: () => {
      const filename = 'my;.txt';

      assert.strictEqual(form._getFileName(makeHeader(filename)), 'my;.txt');
    },

    [`${name}#_getFileName with utf8 character`]: () => {
      const filename = 'my&#9731;.txt';

      assert.strictEqual(form._getFileName(makeHeader(filename)), 'my☃.txt');
    },

    [`${name}#_uploadPath strips harmful characters from extension when keepExtensions`]: () => {
      const opts = {
        keepExtensions: true,
      };

      form = name === 'formidable' ? mod.formidable(opts) : new mod[name](opts);

      let ext = path.extname(form._uploadPath('fine.jpg?foo=bar'));
      assert.strictEqual(ext, '.jpg');

      ext = path.extname(form._uploadPath('fine?foo=bar'));
      assert.strictEqual(ext, '');

      ext = path.extname(form._uploadPath('super.cr2+dsad'));
      assert.strictEqual(ext, '.cr2');

      ext = path.extname(form._uploadPath('super.bar'));
      assert.strictEqual(ext, '.bar');

      ext = path.extname(form._uploadPath('file.aAa'));
      assert.strictEqual(ext, '.aAa');
    },

    [`${name}#_Array parameters support`]: () => {
      const opts = { multiples: true };
      form = name === 'formidable' ? mod.formidable(opts) : new mod[name](opts);

      const req = new Request();
      req.headers = {
        'content-type': 'json',
        'content-length': 8,
      };

      form.parse(req, (error, fields) => {
        assert.strictEqual(Array.isArray(fields.a), true);
        assert.strictEqual(fields.a[0], 1);
        assert.strictEqual(fields.a[1], 2);
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
