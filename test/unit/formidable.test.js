/* eslint-disable max-statements */
/* eslint-disable no-underscore-dangle */

'use strict';

const path = require('path');
// const assert = require('assert');
const Request = require('http').ClientRequest;

// const test = require('utest');
const mod = require('../../src/index');

function getForm(name, opts) {
  return name === 'formidable' ? mod.formidable(opts) : new mod[name](opts);
}
function makeHeader(filename) {
  return `Content-Disposition: form-data; name="upload"; filename="${filename}"`;
}

['IncomingForm', 'Formidable', 'formidable'].forEach((name) => {
  test(`${name}#_getFileName with regular characters`, () => {
    const filename = 'foo.txt';
    const form = getForm(name);

    expect(form._getFileName(makeHeader(filename))).toBe('foo.txt');
  });

  test(`${name}#_getFileName with unescaped quote`, () => {
    const filename = 'my".txt';
    const form = getForm(name);

    expect(form._getFileName(makeHeader(filename))).toBe('my".txt');
  });

  test(`${name}#_getFileName with escaped quote`, () => {
    const filename = 'my%22.txt';
    const form = getForm(name);

    expect(form._getFileName(makeHeader(filename))).toBe('my".txt');
  });

  test(`${name}#_getFileName with bad quote and additional sub-header`, () => {
    const filename = 'my".txt';
    const form = getForm(name);

    const header = `${makeHeader(filename)}; foo="bar"`;
    expect(form._getFileName(header)).toBe(filename);
  });

  test(`${name}#_getFileName with semicolon`, () => {
    const filename = 'my;.txt';
    const form = getForm(name);

    expect(form._getFileName(makeHeader(filename))).toBe('my;.txt');
  });

  test(`${name}#_getFileName with utf8 character`, () => {
    const filename = 'my&#9731;.txt';
    const form = getForm(name);

    expect(form._getFileName(makeHeader(filename))).toBe('my☃.txt');
  });

  test(`${name}#_uploadPath strips harmful characters from extension when keepExtensions`, () => {
    const form = getForm(name, { keepExtensions: true });

    const getBasename = (part) => path.basename(form._uploadPath(part));

    let basename = getBasename('fine.jpg?foo=bar');
    expect(basename).toHaveLength(29);
    let ext = path.extname(basename);
    expect(ext).toBe('.jpg');

    basename = getBasename('fine-no-ext?foo=qux');
    expect(basename).toHaveLength(25);
    ext = path.extname(basename);
    expect(ext).toBe('');

    basename = getBasename({ filename: 'super.cr2+dsad' });
    expect(basename).toHaveLength(29);
    ext = path.extname(basename);
    expect(ext).toBe('.cr2');

    basename = getBasename({ filename: 'super.gz' });
    expect(basename).toHaveLength(28);
    ext = path.extname(basename);
    expect(ext).toBe('.gz');

    basename = getBasename('file.aAa');
    expect(basename).toHaveLength(29);
    ext = path.extname(basename);
    expect(ext).toBe('.aAa');

    basename = getBasename('file#!@#koh.QxZs?sa=1');
    expect(basename).toHaveLength(30);
    ext = path.extname(basename);
    expect(ext).toBe('.QxZs');
  });

  test(`${name}#_Array parameters support`, () => {
    const form = getForm(name, { multiples: true });

    const req = new Request();
    req.headers = 'content-type: json; content-length:8';
    form.parse(req, (error, fields) => {
      expect(Array.isArray(fields.a)).toBe(true);
      expect(fields.a[0]).toBe('1');
      expect(fields.a[1]).toBe('2');
    });
    form.emit('field', 'a[]', '1');
    form.emit('field', 'a[]', '2');
    form.emit('end');
  });

  test(`${name}#_Nested array parameters support`, () => {
    const form = getForm(name, { multiples: true });

    const req = new Request();
    req.headers = 'content-type: json; content-length:8';
    form.parse(req, (error, fields) => {
      expect(Array.isArray(fields.a)).toBe(true);
      expect(fields.a[0][0]).toBe('a');
      expect(fields.a[0][1]).toBe('b');
      expect(fields.a[1][0]).toBe('c');
    });
    form.emit('field', 'a[0][]', 'a');
    form.emit('field', 'a[0][]', 'b');
    form.emit('field', 'a[1][]', 'c');
    form.emit('end');
  });

  test(`${name}#_Object parameters support`, () => {
    const form = getForm(name, { multiples: true });

    const req = new Request();
    req.headers = 'content-type: json; content-length:8';
    form.parse(req, (error, fields) => {
      expect(fields.a.x).toBe('1');
      expect(fields.a.y).toBe('2');
    });
    form.emit('field', 'a[x]', '1');
    form.emit('field', 'a[y]', '2');
    form.emit('end');
  });

  test(`${name}#_Nested object parameters support`, () => {
    const form = getForm(name, { multiples: true });

    const req = new Request();
    req.headers = 'content-type: json; content-length:8';
    form.parse(req, (error, fields) => {
      expect(fields.a.l1.k1).toBe('2');
      expect(fields.a.l1.k2).toBe('3');
      expect(fields.a.l2.k3).toBe('5');
    });
    form.emit('field', 'a[l1][k1]', '2');
    form.emit('field', 'a[l1][k2]', '3');
    form.emit('field', 'a[l2][k3]', '5');
    form.emit('end');
  });

  // test(`${name}: use custom options.filename instead of form._uploadPath`, () => {
  //   const form = getForm(name, {
  //     filename: (_) => path.join(__dirname, 'sasa'),
  //   });
  // });
});
