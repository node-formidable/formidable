/* eslint-disable max-statements */
/* eslint-disable no-underscore-dangle */

import {jest} from '@jest/globals';
import Stream from 'node:stream';
import http from 'node:http';
import path from 'node:path';

import formidable from '../../src/index.js';
import * as mod from '../../src/index.js';


function requestStub() {
  return Object.assign(new Stream (), {
    pause() {},
    resume() {},
  });
}

function getForm(name, opts) {
  return name === 'formidable' ? formidable(opts) : new mod[name](opts);
}
function makeHeader(originalFilename) {
  return `Content-Disposition: form-data; name="upload"; filename="${originalFilename}"`;
}

['IncomingForm', 'Formidable', 'formidable'].forEach((name) => {
  test(`${name}#_getFileName with regular characters`, () => {
    const originalFilename = 'foo.txt';
    const form = getForm(name);

    expect(form._getFileName(makeHeader(originalFilename))).toBe('foo.txt');
  });

  test(`${name}#_getFileName with unescaped quote`, () => {
    const originalFilename = 'my".txt';
    const form = getForm(name);

    expect(form._getFileName(makeHeader(originalFilename))).toBe('my".txt');
  });

  test(`${name}#_getFileName with escaped quote`, () => {
    const originalFilename = 'my%22.txt';
    const form = getForm(name);

    expect(form._getFileName(makeHeader(originalFilename))).toBe('my".txt');
  });

  test(`${name}#_getFileName with bad quote and additional sub-header`, () => {
    const originalFilename = 'my".txt';
    const form = getForm(name);

    const header = `${makeHeader(originalFilename)}; foo="bar"`;
    expect(form._getFileName(header)).toBe(originalFilename);
  });

  test(`${name}#_getFileName with semicolon`, () => {
    const originalFilename = 'my;.txt';
    const form = getForm(name);

    expect(form._getFileName(makeHeader(originalFilename))).toBe('my;.txt');
  });

  test(`${name}#_getFileName with utf8 character`, () => {
    const originalFilename = 'my&#9731;.txt';
    const form = getForm(name);

    expect(form._getFileName(makeHeader(originalFilename))).toBe('my☃.txt');
  });

  test(`${name}#_getNewName strips harmful characters from extension when keepExtensions`, () => {
    const form = getForm(name, { keepExtensions: true });

    const getBasename = (part) => path.basename(form._getNewName(part));

    // tests below assume baseline hexoid 25 chars + a few more for the extension
    let basename = getBasename('fine.jpg?foo=bar');
    expect(basename).toHaveLength(29);
    let ext = path.extname(basename);
    expect(ext).toBe('.jpg');

    basename = getBasename('fine-no-ext?foo=qux');
    expect(basename).toHaveLength(25);
    ext = path.extname(basename);
    expect(ext).toBe('');

    basename = getBasename({ originalFilename: 'super.cr2+dsad' });
    expect(basename).toHaveLength(29);
    ext = path.extname(basename);
    expect(ext).toBe('.cr2');

    basename = getBasename({ originalFilename: 'super.gz' });
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

    basename = getBasename('test.pdf.jqlnn<img src=a onerror=alert(1)>.png');
    expect(basename).toHaveLength(35);
    ext = path.extname(basename);
    expect(ext).toBe('.jqlnn');

    basename = getBasename('test.<a.png');
    expect(basename).toHaveLength(25);
    ext = path.extname(basename);
    expect(ext).toBe('');
  });

  test(`${name}#_Array parameters support`, () => {
    const form = getForm(name, {  });

    const req = new http.ClientRequest();
    req.headers = {
      'content-length': '8',
      'content-type': 'multipart/form-data; boundary=----TLVx',
    };
    form.parse(req, (error, fields) => {
      expect(Array.isArray(fields.a)).toBe(true);
      expect(fields.a[0]).toBe('1');
      expect(fields.a[1]).toBe('2');
    });
    form.emit('field', 'a', '1');
    form.emit('field', 'a', '2');
    form.emit('end');
  });

  test(`${name}#_Nested array parameters support`, () => {
    const form = getForm(name, {  });

    const req = new http.ClientRequest();
    req.headers = {
      'content-length': '8',
      'content-type': 'multipart/form-data; boundary=----TLVx',
    };
    form.parse(req, (error, fields) => {
      expect(Array.isArray(fields[`a[0]`])).toBe(true);
      expect(fields[`a[0]`][0]).toBe('a');
      expect(fields[`a[0]`][1]).toBe('b');
      expect(fields[`a[1]`][0]).toBe('c');
    });
    form.emit('field', 'a[0]', 'a');
    form.emit('field', 'a[0]', 'b');
    form.emit('field', 'a[1]', 'c');
    form.emit('end');
  });

  test(`${name}#_Object parameters support`, () => {
    const form = getForm(name, {  });

    const req = new http.ClientRequest();
    req.headers = {
      'content-length': '8',
      'content-type': 'multipart/form-data; boundary=----TLVx',
    };
    form.parse(req, (error, fields) => {
      expect(fields[`a[x]`][0]).toBe('1');
      expect(fields[`a[y]`][0]).toBe('2');
    });
    form.emit('field', 'a[x]', '1');
    form.emit('field', 'a[y]', '2');
    form.emit('end');
  });

  xtest(`${name}#_Nested object parameters support`, () => {
    const form = getForm(name, {  });

    const req = new http.ClientRequest();
    req.headers = {
      'content-length': '8',
      'content-type': 'multipart/form-data; boundary=----TLVx',
    };
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

  describe(`${name}#_onPart`, () => {
    describe('when not allow empty files', () => {
      describe('when file is empty', () => {
        test('emits error when part is received', (done) => {
          const form = getForm(name, {
            allowEmptyFiles: false,
          });
          form.req = requestStub();

          const part = new Stream();
          part.mimetype = 'text/plain';
          // eslint-disable-next-line max-nested-callbacks
          form.on('error', (error) => {
            expect(error.message).toBe(
              'options.allowEmptyFiles is false, file size should be greater than 0',
            );
            done();
          });
          form.onPart(part).then (function () {
            part.emit('end');
            form.emit('end');
          });
        });
      });

      describe('when file is not empty', () => {
        test('not emits error when part is received', () => {
          const form = getForm(name, {
            allowEmptyFiles: false,
          });
          const formEmitSpy = jest.spyOn(form, 'emit');

          const part = new Stream();
          part.mimetype = 'text/plain';
          form.onPart(part);
          part.emit('data', Buffer.alloc(1));
          part.emit('end');
          form.emit('end');
          expect(formEmitSpy).not.toBeCalledWith('error');
        });
      });
    });

    describe('when allow empty files', () => {
      test('not emits error when part is received', () => {
        const form = getForm(name, {  });
        const formEmitSpy = jest.spyOn(form, 'emit');

        const part = new Stream();
        part.mimetype = 'text/plain';
        form.onPart(part);
        part.emit('end');
        form.emit('end');
        expect(formEmitSpy).not.toBeCalledWith('error');
      });
    });

    describe('when file uploaded size is inferior than minFileSize option', () => {
      test('emits error when part is received', (done) => {
        const form = getForm(name, { minFileSize: 5 });

        const part = new Stream();
        const req = requestStub();
        part.mimetype = 'text/plain';
        form.on('error', (error) => {
          expect(error.message).toBe(
            'options.minFileSize (5 bytes) inferior, received 4 bytes of file data',
          );
          done();
        });
        form.req = req;
        form.onPart(part).then(function () {
          part.emit('data', Buffer.alloc(4));
          part.emit('end');
          form.emit('end');
        });

      });
    });

    describe('when file uploaded size is superior than minFileSize option', () => {
      test('not emits error when part is received', () => {
        const form = getForm(name, { minFileSize: 10 });
        const formEmitSpy = jest.spyOn(form, 'emit');

        const part = new Stream();
        part.mimetype = 'text/plain';
        form.onPart(part);
        part.emit('data', Buffer.alloc(11));
        part.emit('end');
        form.emit('end');
        expect(formEmitSpy).not.toBeCalledWith('error');
      });
    });

    describe('when there are more fields than maxFields', () => {
      test('emits error', (done) => {
        const form = getForm(name, {
          maxFields: 1,
        });

        form.on('error', (error) => {
          expect(error.message.includes('maxFields')).toBe(true);
          done();
        });

        form.emit('field', 'a', '1');
        form.emit('field', 'b', '2');
        form.emit('end');
      });
    });
  });

  // test(`${name}: use custom options.originalFilename instead of form._uploadPath`, () => {
  //   const form = getForm(name, {
  //     originalFilename: (_) => path.join(__dirname, 'sasa'),
  //   });
  // });
});
