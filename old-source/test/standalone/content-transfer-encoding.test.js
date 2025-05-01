import { join } from 'node:path';
import { createServer, request } from 'node:http';
import { strictEqual } from 'node:assert';

import formidable from '../../src/index.js';

const UPLOAD_DIR = join(process.cwd(), 'test', 'tmp');

// OS choosing port
const PORT = 13530;
test('content transfer encoding', (done) => {
  const server = createServer(async (req, res) => {
    const form = formidable({
      uploadDir: UPLOAD_DIR
    });
    form.on('end', () => {
      throw new Error('Unexpected "end" event');
    });
    form.on('error', (e) => {
      res.writeHead(500);
      res.end(e.message);
    });
    try {
      await form.parse(req);
    } catch (formidableError) {
    }
  });

  server.listen(PORT, () => {
    const chosenPort = server.address().port;

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

    const req = request({
      method: 'POST',
      port: chosenPort,
      headers: {
        'Content-Length': body.length,
        'Content-Type': 'multipart/form-data; boundary=foo',
      },
    });

    req.on('response', (res) => {
      strictEqual(res.statusCode, 500);
      res.on('data', () => {});
      res.on('end', () => {
        server.close();
        done();
      });
    });
    req.end(body);
  });
});
