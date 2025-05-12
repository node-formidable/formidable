/* eslint-disable node/callback-return */
/* eslint-disable max-nested-callbacks */

import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createConnection } from 'node:net';

import formidable from '../../src/index.js';

let server;
let port = 13539;
let ok = 0;
let errors = 0;

beforeEach(() => {
  server = createServer();
  ok = 0;
  errors = 0;
  port += 1;
});

afterEach(() => new Promise((resolve) => {
  if (server.listening) {
    server.close(() => resolve());
  } else {
    resolve();
  }
}));

test('keep alive error', (done) => {
  server.on('request', async (req, res) => {
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
    try {
      await form.parse(req);
      // for client two
      assert.strictEqual(ok, 1, `should "ok" count === 1, has: ${ok}`);
      done();
    } catch (err) {
      assert.strictEqual(errors, 1, `should "errors" === 1, has: ${errors} -- ${err}`);

      const clientTwo = createConnection(port);

      // correct post upload (with hyphens)
      clientTwo.write(
        'POST /upload-test HTTP/1.1\r\n'
        + 'Host: localhost\r\n'
        + 'Connection: keep-alive\r\n'
        + 'Content-Type: multipart/form-data; boundary=----aaa\r\n'
        + 'Content-Length: 13\r\n\r\n'
        + '------aaa--\r\n',
      );
      clientTwo.end();
    }
  });

  server.listen(port, () => {
    const client = createConnection(port);

    // first send malformed (boundary / hyphens) post upload
    client.write(
      'POST /upload-test HTTP/1.1\r\n'
      + 'Host: localhost\r\n'
      + 'Connection: keep-alive\r\n'
      + 'Content-Type: multipart/form-data; boundary=----aaa\r\n'
      + 'Content-Length: 10011\r\n\r\n'
      + '------XXX\n\r',
    );

    setTimeout(() => {
      const buf = Buffer.alloc(10000);
      buf.fill('a');
      client.write(buf);
      client.end();
    }, 150);
  });
});
