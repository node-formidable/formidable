import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { connect } from 'node:net';

import formidable from '../../src/index.js';

let server;
let port = 13540;

beforeEach(() => {
  server = createServer();
  port += 1;
});

afterEach(() => new Promise((resolve) => {
  if (server.listening) {
    server.close(() => resolve());
  } else {
    resolve();
  }
}));

test('connection aborted', (done) => {
  server.on('request', (req) => {
    const form = formidable();

    let abortedReceived = false;
    form.on('aborted', () => {
      abortedReceived = true;
    });
    form.on('error', () => {
      assert.ok(abortedReceived, 'Error event should follow aborted');
    });
    form.on('end', () => {
      throw new Error('Unexpected "end" event');
    });
    form.parse(req, () => {
      assert.ok(
        abortedReceived,
        'from .parse() callback: Error event should follow aborted',
      );
      done();
    });
  });

  server.listen(port, 'localhost', () => {
    const client = connect(port);

    client.write(
      'POST / HTTP/1.1\r\n'
      + 'Host: localhost\r\n'
      + 'Content-Length: 70\r\n'
      + 'Content-Type: multipart/form-data; boundary=foo\r\n\r\n',
    );
    client.end();
  });
});
