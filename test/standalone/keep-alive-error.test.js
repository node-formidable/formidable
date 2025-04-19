/* eslint-disable max-nested-callbacks */

'use strict';

const net = require('net');
const http = require('http');
const assert = require('assert');
const formidable = require('../../src/index');
const getPort = require('get-port');

let server;
let port = await getPort();
let ok = 0;
let errors = 0;

function randomPort(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

beforeEach(() => {
  server = http.createServer();
  ok = 0;
  errors = 0;
  // port += 1;
});

afterEach(
  () =>
    new Promise((resolve) => {
      if (server.listening) {
        server.close(() => {
          server = null;
          resolve();
        });
      } else {
        resolve();
      }
    }),
);

// Original test untouched from here
test('keep alive error', (done) => {
  server.on('request', (req, res) => {
    const form = formidable();
    form.on('error', () => {
      errors += 1;
      res.writeHead(500);
      res.end();
    });
    form.on('end', () => {
      ok += 1;
      res.writeHead(200);
      res.end();
    });
    form.parse(req);
  });

  server.listen(port, () => {
    const choosenPort = server.address().port;

    const client = net.createConnection(choosenPort);

    // first send malformed (boundary / hyphens) post upload
    client.write(
      'POST /upload-test HTTP/1.1\r\n' +
        'Host: localhost\r\n' +
        'Connection: keep-alive\r\n' +
        'Content-Type: multipart/form-data; boundary=----aaa\r\n' +
        'Content-Length: 10011\r\n\r\n' +
        '------aaa\n\r',
    );

    setTimeout(() => {
      const buf = Buffer.alloc(10000);
      buf.fill('a');
      client.write(buf);
      client.end();

      setTimeout(() => {
        assert.strictEqual(errors, 1, `should "errors" === 1, has: ${errors}`);

        const clientTwo = net.createConnection(choosenPort);

        // correct post upload (with hyphens)
        clientTwo.write(
          'POST /upload-test HTTP/1.1\r\n' +
            'Host: localhost\r\n' +
            'Connection: keep-alive\r\n' +
            'Content-Type: multipart/form-data; boundary=----aaa\r\n' +
            'Content-Length: 13\r\n\r\n' +
            '------aaa--\r\n',
        );
        clientTwo.end();

        setTimeout(() => {
          assert.strictEqual(ok, 2, `should "ok" count === 2, has: ${ok}`);

          server.close();
          done();
        }, 400);
      }, 300);
    }, 200);
  });
});
