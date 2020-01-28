'use strict';

const assert = require('assert');
const http = require('http');
const net = require('net');
const Formidable = require('../../src/index');

const PORT = 13532;
const server = http.createServer((req) => {
  const form = new Formidable();
  let abortedReceived = false;
  form.on('aborted', () => {
    abortedReceived = true;
  });
  form.on('error', () => {
    assert(abortedReceived, 'Error event should follow aborted');
    server.close();
  });
  form.on('end', () => {
    throw new Error('Unexpected "end" event');
  });
  form.parse(req);
});

server.listen(PORT, 'localhost', () => {
  const choosenPort = server.address().port;
  const url = `http://localhost:${choosenPort}`;
  console.log('Server up and running at:', url);

  const client = net.connect(choosenPort);

  client.write(
    'POST / HTTP/1.1\r\n' +
      'Content-Length: 70\r\n' +
      'Content-Type: multipart/form-data; boundary=foo\r\n\r\n',
  );
  client.end();
});
