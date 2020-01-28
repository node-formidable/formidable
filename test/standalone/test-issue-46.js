'use strict';

const http = require('http');
const request = require('request');
const assert = require('assert');
const Formidable = require('../../src/index');

const host = 'localhost';

const index = [
  '<form action="/" method="post" enctype="multipart/form-data">',
  '  <input type="text" name="foo" />',
  '  <input type="submit" />',
  '</form>',
].join('\n');

const server = http.createServer((req, res) => {
  // Show a form for testing purposes.
  if (req.method === 'GET') {
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end(index);
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

server.listen(0, host, () => {
  console.log('Server up and running...');

  const url = `http://${host}:${server.address().port}`;

  const parts = [
    { 'Content-Disposition': 'form-data; name="foo"', body: 'bar' },
  ];

  request({ method: 'POST', url, multipart: parts }, (e, res, body) => {
    const obj = JSON.parse(body);
    console.log(obj);
    assert.equal('bar', obj.fields.foo);
    server.close();
  });
});
