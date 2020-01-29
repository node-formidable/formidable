'use strict';

// @TODO: this test should be fixed?! later.

const http = require('http');
const assert = require('assert');
const request = require('request');
const Formidable = require('../../src/index');

// OS choosing port
const PORT = 13532;

const indexForm = `
  <form action="/" method="post" enctype="multipart/form-data">
    <input type="text" name="foo" />
    <input type="submit" />
  </form>
`;

const server = http.createServer((req, res) => {
  // Show a form for testing purposes.
  if (req.method === 'GET') {
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end(indexForm);
    return;
  }

  // Parse form and write results to response.
  const form = new Formidable();
  form.parse(req, (err, fields, files) => {
    res.writeHead(200, { 'content-type': 'text/plain' });
    res.write(JSON.stringify({ err, fields, files }));
    res.end();
  });
});

server.listen(PORT, () => {
  const choosenPort = server.address().port;
  const url = `http://localhost:${choosenPort}`;
  console.log('Server up and running at:', url);

  const parts = [
    {
      'content-disposition': 'form-data; name="foo"',
      body: 'barry',
    },
  ];

  request({ method: 'POST', url, multipart: parts }, (e, res, body) => {
    const obj = JSON.parse(body);
    console.log(obj);

    assert.strictEqual('foo' in obj.fields, true);
    assert.strictEqual('barry', obj.fields.foo);
    server.close();
  });
});
