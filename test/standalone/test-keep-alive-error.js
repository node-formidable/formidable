'use strict';

const net = require('net');
const http = require('http');
const assert = require('assert');
const formidable = require('../../src/index');

let ok = 0;
let errors = 0;

const PORT = 0;
const server = http.createServer((req, res) => {
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
  const url = `http://localhost:${choosenPort}`;
  console.log('Server up and running at:', url);

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
        // ? yup, quite true, it makes sense to be 2
        assert.strictEqual(ok, 2, `should "ok" count === 2, has: ${ok}`);

        server.close();
      }, 300);
    }, 200);
  }, 150);
});
