/* eslint-disable max-nested-callbacks */

import { createConnection } from 'net';
import { createServer } from 'http';
import { strictEqual } from 'assert';
import formidable from '../../src/index.js';

let ok = 0;
let errors = 0;

const PORT = 0;

test('keep alive error', (done) => {
  const server = createServer((req, res) => {
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

  server.listen(PORT, () => {
    const choosenPort = server.address().port;

    const client = createConnection(choosenPort);

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

      setTimeout(() => {
        strictEqual(errors, 1, `should "errors" === 1, has: ${errors}`);

        const clientTwo = createConnection(choosenPort);

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
          // ? yup, quite true, it makes sense to be 2
          strictEqual(ok, 2, `should "ok" count === 2, has: ${ok}`);

          server.close();
          done();
        }, 300);
      }, 200);
    }, 150);
  });
});
