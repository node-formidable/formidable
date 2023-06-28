/* eslint-disable max-nested-callbacks */

import { createConnection } from 'node:net';
import { createServer } from 'node:http';
import { strictEqual } from 'node:assert';
import formidable from '../../src/index.js';

let ok = 0;
let errors = 0;

const PORT = 89;

test('keep alive error', (done) => {
  const server = createServer(async (req, res) => {
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
      strictEqual(ok, 1, `should "ok" count === 1, has: ${ok}`);

      server.close(() => {
        done();
      });
    } catch (formidableError) {
      strictEqual(errors, 1, `should "errors" === 1, has: ${errors}`);

      const clientTwo = createConnection(PORT);

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

    }
  });

  server.listen(PORT, () => {

    const client = createConnection(PORT);

    // first send malformed (boundary / hyphens) post upload
    client.write(
      'POST /upload-test HTTP/1.1\r\n' +
        'Host: localhost\r\n' +
        'Connection: keep-alive\r\n' +
        'Content-Type: multipart/form-data; boundary=----aaa\r\n' +
        'Content-Length: 10011\r\n\r\n' +
        '------XXX\n\r',
    );

    setTimeout(() => {
      const buf = Buffer.alloc(10000);
      buf.fill('a');
      client.write(buf);
      client.end();

    }, 150);
  });
});
