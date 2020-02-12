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

    let ext = path.extname(form._uploadPath('fine.jpg?foo=bar'));
    expect(ext).toBe('.jpg');

    ext = path.extname(form._uploadPath('fine?foo=bar'));
    expect(ext).toBe('');

    ext = path.extname(form._uploadPath('super.cr2+dsad'));
    expect(ext).toBe('.cr2');

    ext = path.extname(form._uploadPath('super.bar'));
    expect(ext).toBe('.bar');

    ext = path.extname(form._uploadPath('file.aAa'));
    expect(ext).toBe('.aAa');
  });

  test(`${name}#_Array parameters support`, () => {
    const form = getForm(name, { multiples: true });

    const req = new Request();
    req.headers = 'content-type: json; content-length:8';
    form.parse(req, (error, fields) => {
      expect(Array.isArray(fields.a)).toBe(true);
      expect(fields.a[0]).toBe(1);
      expect(fields.a[1]).toBe(2);
    });
    form.emit('field', 'a[]', 1);
    form.emit('field', 'a[]', 2);
    form.emit('end');
  });
});
