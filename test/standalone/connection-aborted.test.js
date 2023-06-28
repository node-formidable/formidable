import assert from 'node:assert';
import { createServer } from 'node:http';
import { connect } from 'node:net';
import formidable from '../../src/index.js';

const PORT = 13540;

test('connection aborted', (done) => {
  const server = createServer((req) => {
    const form = formidable();

    let abortedReceived = false;
    form.on('aborted', () => {
      abortedReceived = true;
    });
    form.on('error', () => {
      assert(abortedReceived, 'Error event should follow aborted');
    });
    form.on('end', () => {
      throw new Error('Unexpected "end" event');
    });
    form.parse(req, () => {
      assert(
        abortedReceived,
        'from .parse() callback: Error event should follow aborted',
      );

      server.close(() => {
        done();
      });
    });
  });

  server.listen(PORT, 'localhost', () => {
    const chosenPort = server.address().port;

    const client = connect(chosenPort);

    client.write(
      'POST / HTTP/1.1\r\n' +
        'Content-Length: 70\r\n' +
        'Content-Type: multipart/form-data; boundary=foo\r\n\r\n',
    );
    client.end();
  });
});
