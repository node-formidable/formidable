import assert from 'node:assert/strict';
import { createServer, request } from 'node:http';
import { join } from 'node:path';

import formidable from '../../src/index.js';

const UPLOAD_DIR = join(process.cwd(), 'test', 'tmp');

// OS choosing port
const PORT = 13530;
test('content transfer encoding', (done) => {
  const server = createServer(async (req, res) => {
    const form = formidable({
      uploadDir: UPLOAD_DIR,
    });
    form.on('end', () => {
      throw new Error('Unexpected "end" event');
    });
    form.on('error', (e) => {
      assert.strictEqual(e.message, 'Expected error message');
      res.writeHead(500);
      res.end(e.message);
    });
    try {
      await form.parse(req);
    } catch {
    }
  });

  server.listen(PORT, () => {
    const chosenPort = server.address().port;

    const body
      = '--foo\r\n'
        + 'Content-Disposition: form-data; name="file1"; filename="file1"\r\n'
        + 'Content-Type: application/octet-stream\r\n'
        + '\r\nThis is the first file\r\n'
        + '--foo\r\n'
        + 'Content-Type: application/octet-stream\r\n'
        + 'Content-Disposition: form-data; name="file2"; filename="file2"\r\n'
        + 'Content-Transfer-Encoding: unknown\r\n'
        + '\r\nThis is the second file\r\n'
        + '--foo--\r\n';

    const req = request({
      headers: {
        'Content-Length': body.length,
        'Content-Type': 'multipart/form-data; boundary=foo',
      },
      method: 'POST',
      port: chosenPort,
    });

    req.on('response', (res) => {
      assert.strictEqual(res.statusCode, 500);
      res.on('data', () => {});
      res.on('end', () => {
        server.close();
        done();
      });
    });
    req.end(body);
  });
});
