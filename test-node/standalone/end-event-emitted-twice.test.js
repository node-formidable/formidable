import {strictEqual} from 'node:assert';
import { createServer, request } from 'node:http';
import formidable from '../../src/index.js';
import test from 'node:test';

const PORT = 13539;

test('end event emitted twice', (t,done) => {
  const server = createServer((req, res) => {
    const form = formidable();

    let i = 0;
    form.on('end', () => {
      i += 1;
      strictEqual(i, 1, 'end should be emitted once  (on end)');
    });
    form.parse(req, () => {
      try {
        strictEqual(i, 1, 'end should be emitted once (callback)');
      } catch (e) {
        done(e);
      }
      res.writeHead(200);
      res.end("ok")
    });
  });

  server.listen(PORT, () => {
    const chosenPort = server.address().port;
    const  body = `----13068458571765726332503797717\r
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
      method: 'POST',
      
      headers: {
        'Content-Length': body.length,
        Host: `localhost:${chosenPort}`,
        'Content-Type': 'multipart/form-data; boundary=--13068458571765726332503797717',
      },
      body
    }).then(res => {
      strictEqual(res.status, 200);
        server.close();
        done();
    });
   
  });
});
