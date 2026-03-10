import { ok,  strictEqual } from 'node:assert';
import { createServer } from 'node:http';
import test from 'node:test';
import formidable, { errors } from '../../src/index.js';



let server;
let port = 13000;

test.beforeEach(() => {
  // Increment port to avoid conflicts between tests
  port += 1;
  server = createServer();
});

test.afterEach(() => {
  return new Promise((resolve) => {
    if (server.listening) {
      server.close(() => resolve());
    } else {
      resolve();
    }
  });
});

test('prototype contamination', async (t) => {
  server.on('request', async (req, res) => {
    const form = formidable();

    const [fields, files] = await form.parse(req);
    strictEqual(typeof String(fields), 'string', "the toString method should not be compromised");
    
    res.writeHead(200);
    res.end("ok");
  
  });

  await new Promise(resolve => server.listen(port, resolve));

  const body = `{"toString":"x","hasOwnProperty":"x","a":5}`;

  const resClient = await fetch(String(new URL(`http:localhost:${port}/`)), {
    method: 'POST',
    headers: {
      'Content-Length': body.length,
      Host: `localhost:${port}`,
      'Content-Type': 'text/json;',
    },
    body
  });

  strictEqual(resClient.status, 200);

  const text = await resClient.text();
  
  t.ok(true)
});