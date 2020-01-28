'use strict';

const assert = require('assert');
const http = require('http');
const common = require('../common');
const Formidable = require('../../src/index');

const server = http.createServer((req, res) => {
  const form = new Formidable();
  form.uploadDir = common.dir.tmp;
  form.on('end', () => {
    throw new Error('Unexpected "end" event');
  });
  form.on('error', (e) => {
    res.writeHead(500);
    res.end(e.message);
  });
  form.parse(req);
});

server.listen(0, () => {
  const body =
    '--foo\r\n' +
    'Content-Disposition: form-data; name="file1"; filename="file1"\r\n' +
    'Content-Type: application/octet-stream\r\n' +
    '\r\nThis is the first file\r\n' +
    '--foo\r\n' +
    'Content-Type: application/octet-stream\r\n' +
    'Content-Disposition: form-data; name="file2"; filename="file2"\r\n' +
    'Content-Transfer-Encoding: unknown\r\n' +
    '\r\nThis is the second file\r\n' +
    '--foo--\r\n';

  const req = http.request({
    method: 'POST',
    port: server.address().port,
    headers: {
      'Content-Length': body.length,
      'Content-Type': 'multipart/form-data; boundary=foo',
    },
  });

  req.on('response', (res) => {
    assert.equal(res.statusCode, 500);
    res.on('data', () => {});
    res.on('end', () => {
      server.close();
    });
  });
  req.end(body);
});
