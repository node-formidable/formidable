import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import test from 'node:test';

import formidable from '../../src/index.js';

const PORT = 13540;

test('end event emitted twice', (_t, done) => {
  const server = createServer((req, res) => {
    const form = formidable();

    let i = 0;
    form.on('end', () => {
      i += 1;
      assert.strictEqual(i, 1, 'end should be emitted once  (on end)');
    });
    form.parse(req, () => {
      try {
        assert.strictEqual(i, 1, 'end should be emitted once (callback)');
      } catch (err) {
        // eslint-disable-next-line node/callback-return
        done(err);
      }
      res.writeHead(200);
      res.end('ok');
    });
  });

  server.listen(PORT, () => {
    const chosenPort = server.address().port;
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
    fetch(String(new URL(`http:localhost:${chosenPort}/`)), {
      body,

      headers: {
        'Content-Length': body.length,
        'Content-Type': 'multipart/form-data; boundary=--13068458571765726332503797717',
        'Host': `localhost:${chosenPort}`,
      },
      method: 'POST',
    }).then((res) => {
      assert.strictEqual(res.status, 200);
      server.close();
      done();
    });
  });
});
