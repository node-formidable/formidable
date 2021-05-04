import { createServer } from 'http';
import { ok, strictEqual } from 'assert';
import request from 'request';
import formidable from '../../src/index.js';

// OS choosing port
const PORT = 13531;

const indexForm = `
  <form action="/" method="post" enctype="multipart/form-data">
    <input type="text" name="foo" />
    <input type="submit" />
  </form>
`;

test('issue 46', (done) => {
  const server = createServer((req, res) => {
    // Show a form for testing purposes.
    if (req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(indexForm);
      return;
    }

    // Parse form and write results to response.
    const form = formidable();
    form.parse(req, (err, fields, files) => {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      // ? old, makes more sense to be passed to `.end()`?
      // res.write(JSON.stringify({ err, fields, files }));
      res.end(JSON.stringify({ err, fields, files }));
    });
  });

  server.listen(PORT, () => {
    const choosenPort = server.address().port;
    const url = `http://localhost:${choosenPort}`;

    const parts = [
      {
        'content-disposition': 'form-data; name="foo"',
        body: 'barry',
      },
    ];

    request({ method: 'POST', url, multipart: parts }, (e, res, body) => {
      const obj = JSON.parse(body);

      ok(obj.fields.foo, 'should have fields.foo === barry');
      strictEqual(obj.fields.foo[0], 'barry');

      server.close();
      done();
    });
  });
});
