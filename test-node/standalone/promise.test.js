import {strictEqual, ok} from 'node:assert';
import { createServer, request } from 'node:http';
import formidable, {errors} from '../../src/index.js';
import test from 'node:test';

const PORT = 13539;

const isPromise = (x) => {
    return x && typeof x === `object` && typeof x.then === `function`; 
};

test('parse returns promise if no callback is provided', (t,done) => {
  const server = createServer((req, res) => {
    const form = formidable();

    const promise = form.parse(req);
    strictEqual(isPromise(promise), true);
    promise.then(([fields, files]) => {
      ok(typeof fields === 'object');
      ok(typeof files === 'object');
      res.writeHead(200);
      res.end("ok")
    }).catch(e => {
      done(e)
    })
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

test('parse rejects with promise if it fails', (t,done) => {
  const server = createServer((req, res) => {
    const form = formidable({minFileSize: 10 ** 6}); // create condition to fail

    const promise = form.parse(req);
    strictEqual(isPromise(promise), true);
    promise.then(() => {
      done('should have failed')
    }).catch(e => {
      res.writeHead(e.httpCode);
      strictEqual(e.code, errors.smallerThanMinFileSize);
      res.end(String(e))
    })
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
        strictEqual(res.status, 400);
        server.close();
        done();
    });
   
  });
});
