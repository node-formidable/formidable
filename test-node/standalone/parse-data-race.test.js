import { strictEqual, ok } from 'node:assert';
import { createServer, request } from 'node:http';
import formidable from '../../src/index.js';
import test from 'node:test';

const PORT = 13541;

test('parse() does not lose chunks when caller listens on req first', (t, done) => {
  // Reproduce the regression triggered when a caller attaches a 'data'
  // listener to req before calling form.parse(). Since parse() is async and
  // awaits writeHeaders(), the request stream can start flowing and emit
  // chunks before Formidable pipes req into its parser, causing the first
  // part(s) to be silently dropped.
  const parts = { a: 'alpha', b: 'beta', c: 'gamma' };
  const remaining = new Set(Object.keys(parts));

  const server = createServer((req, res) => {
    // External 'data' listener: switches req into flowing mode synchronously.
    let bodyBytes = 0;
    req.on('data', (chunk) => {
      bodyBytes += chunk.length;
    });

    const form = formidable({});
    form.parse(req, (err, fields) => {
      if (err) {
        res.writeHead(500);
        res.end(err.message);
        return;
      }
      strictEqual(bodyBytes, Number(req.headers['content-length']));
      for (const name of Object.keys(parts)) {
        ok(fields[name], `missing field ${name}`);
        strictEqual(fields[name][0], parts[name]);
        remaining.delete(name);
      }
      res.writeHead(200);
      res.end('ok');
    });
  });

  server.listen(PORT, () => {
    const boundary = '----test-boundary-12345';
    const crlf = '\r\n';
    let body = '';
    for (const [name, value] of Object.entries(parts)) {
      body += `--${boundary}${crlf}`;
      body += `Content-Disposition: form-data; name="${name}"${crlf}${crlf}`;
      body += `${value}${crlf}`;
    }
    body += `--${boundary}--${crlf}`;

    const req = request(
      {
        port: PORT,
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        strictEqual(res.statusCode, 200);
        res.resume();
        res.on('end', () => {
          strictEqual(remaining.size, 0, `missed: ${[...remaining].join(',')}`);
          server.close(done);
        });
      }
    );
    req.end(body);
  });
});
