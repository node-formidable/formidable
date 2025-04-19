'use strict';

const assert = require('assert');
const http = require('http');
const net = require('net');
const formidable = require('../../src/index');

let port = 13533;
let server;

beforeEach(() => {
  server = http.createServer();
  port += 1;
});

afterEach(
  () =>
    new Promise((resolve) => {
      if (server.listening) {
        server.close(() => resolve());
      } else {
        resolve();
      }
    }),
);

test('connection aborted', (done) => {
  server.on('request', (req) => {
    const form = formidable();

    let abortedReceived = false;
    form.on('aborted', () => {
      abortedReceived = true;
    });
    form.on('error', () => {
      assert(abortedReceived, 'Error event should follow aborted');
      if (server) {
        server.close();
      }
    });
    form.on('end', () => {
      throw new Error('Unexpected "end" event');
    });
    form.parse(req, () => {
      assert(
        abortedReceived,
        'from .parse() callback: Error event should follow aborted',
      );
      done();
    });
  });

  server.listen(port, 'localhost', () => {
    const client = net.connect(port);

    client.write(
      'POST / HTTP/1.1\r\n' +
        'Host: localhost\r\n' +
        'Content-Length: 70\r\n' +
        'Content-Type: multipart/form-data; boundary=foo\r\n\r\n',
    );
    client.end();
  });
});
