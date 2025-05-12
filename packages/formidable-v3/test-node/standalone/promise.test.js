import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import test from 'node:test';

import formidable, { errors } from '../../src/index.js';

function isPromise(x) {
  return x && typeof x === `object` && typeof x.then === `function`;
}

let server;
let port = 13540;

test.beforeEach(() => {
  // Increment port to avoid conflicts between tests
  port += 1;
  server = createServer();
});

test.afterEach(() => new Promise((resolve) => {
  if (server.listening) {
    server.close(() => resolve());
  } else {
    resolve();
  }
}));

test('parse returns promise if no callback is provided', async () => {
  server.on('request', (req, res) => {
    const form = formidable();

    const promise = form.parse(req);
    assert.strictEqual(isPromise(promise), true);
    promise.then(([fields, files]) => {
      assert.ok(typeof fields === 'object');
      assert.ok(typeof files === 'object');
      res.writeHead(200);
      res.end('ok');
    }).catch((err) => {
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

  const res = await fetch(String(new URL(`http:localhost:${port}/`)), {
    body,
    headers: {
      'Content-Length': body.length,
      'Content-Type': 'multipart/form-data; boundary=--13068458571765726332503797717',
      'Host': `localhost:${port}`,
    },
    method: 'POST',
  });

  assert.strictEqual(res.status, 200);
});

test('parse rejects with promise if it fails', async () => {
  server.on('request', (req, res) => {
    const form = formidable({ minFileSize: 10 ** 6 }); // create condition to fail

    const promise = form.parse(req);
    assert.strictEqual(isPromise(promise), true);
    promise.then(() => {
      res.writeHead(500);
      res.end('should have failed');
    }).catch((err) => {
      res.writeHead(err.httpCode);
      assert.strictEqual(err.code, errors.smallerThanMinFileSize);
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

  const res = await fetch(String(new URL(`http:localhost:${port}/`)), {
    body,
    headers: {
      'Content-Length': body.length,
      'Content-Type': 'multipart/form-data; boundary=--13068458571765726332503797717',
      'Host': `localhost:${port}`,
    },
    method: 'POST',
  });

  assert.strictEqual(res.status, 400);
});
