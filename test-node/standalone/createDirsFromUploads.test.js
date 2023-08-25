import {strictEqual, deepEqual} from 'node:assert';
import { createServer, request } from 'node:http';
import formidable from '../../src/index.js';
import test from 'node:test';
import fs from 'node:fs';

const PORT = 13539;
const uploads = './uploads';

test('folder created', (t,done) => {
  const server = createServer((req, res) => {
    const form = formidable({
      createDirsFromUploads: true,
      uploadDir: uploads,
      filename: (x) => {
        return 'x/y/z.txt'
      }
    });

    form.parse(req, () => {
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
      //may also contain tests from other tests
      deepEqual(fs.readdirSync(uploads).includes('x'), true);
      deepEqual(fs.readdirSync(`${uploads}/x`), ['y']);
      deepEqual(fs.readdirSync(`${uploads}/x/y`), ['z.txt']);
      strictEqual(res.status, 200);
      server.close();
      done();
    });
   
  });
});
