import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import test from 'node:test';

import formidable from '../../src/index.js';

const PORT = 13538;
const uploadsDir = './test-node/tmp-uploads';
let server;
let port = PORT;

test.beforeEach(() => {
  // Increment port to avoid conflicts between tests
  port += 1;
  server = http.createServer();
});

test.afterEach(() => new Promise((resolve) => {
  if (server && server.listening) {
    fs.rmSync(uploadsDir, { force: true, recursive: true });
    server.close(() => resolve());
  } else {
    resolve();
  }
}));

test('create dirs from filename', async () => {
  server.on('request', (req, res) => {
    const form = formidable({
      createDirsFromUploads: true,
      filename: () => 'x/y/z.txt',
      uploadDir: uploadsDir,
    });

    const promise = form.parse(req);

    promise
      .then(([fields, files]) => {
        assert.ok(typeof fields === 'object');
        assert.ok(typeof files === 'object');
        res.writeHead(200);
        res.end('ok');
      })
      .catch((err) => {
        console.error('err>>>>', err);
        res.writeHead(500);
        res.end(String(err));
      });
  });

  await new Promise((resolve) => {
    server.listen(port, resolve);
  });

  const body = `----13068458571765726332503797717\r
Content-Disposition: form-data; name="title"\r
\r
a\r
----13068458571765726332503797717\r
Content-Disposition: form-data; name="multipleFiles"; filename="x.txt"\r
Content-Type: application/x-javascript\r
\r
\r
\r
a\r
b\r
c\r
d\r
\r
----13068458571765726332503797717--\r
`;

  const res = await fetch(`http://localhost:${port}`, {
    body,
    headers: {
      'Content-Length': body.length,
      'Content-Type': 'multipart/form-data; boundary=--13068458571765726332503797717',
      'Host': `localhost:${port}`,
    },
    method: 'POST',
  });

  assert.strictEqual(res.status, 200);
  assert.deepEqual(fs.readdirSync(uploadsDir).includes('x'), true);
  assert.deepEqual(fs.readdirSync(`${uploadsDir}/x`), ['y']);
  assert.deepEqual(fs.readdirSync(`${uploadsDir}/x/y`), ['z.txt']);
});
