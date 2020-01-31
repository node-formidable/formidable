'use strict';

const path = require('path');
const http = require('http');
const assert = require('assert');

const formidable = require('../../src/index');

const UPLOAD_DIR = path.join(process.cwd(), 'test', 'tmp');

// OS choosing port
const PORT = 13532;
const server = http.createServer((req, res) => {
  const form = formidable();
  form.uploadDir = UPLOAD_DIR;
  form.on('end', () => {
    throw new Error('Unexpected "end" event');
  });
  form.on('error', (e) => {
    res.writeHead(500);
    res.end(e.message);
  });
  form.parse(req);
});

server.listen(PORT, () => {
  const choosenPort = server.address().port;
  const url = `http://localhost:${choosenPort}`;
  console.log('Server up and running at:', url);

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
    port: choosenPort,
    headers: {
      'Content-Length': body.length,
      'Content-Type': 'multipart/form-data; boundary=foo',
    },
  });

  req.on('response', (res) => {
    assert.strictEqual(res.statusCode, 500);
    res.on('data', () => {});
    res.on('end', () => {
      server.close();
    });
  });
  req.end(body);
});
