'use strict';

const http = require('http');
const util = require('util');
const { Formidable } = require('../src/index');

// random OS choosen port
const PORT = 13532;
const server = http.createServer((req, res) => {
  if (req.method !== 'POST') {
    res.writeHead(200, { 'content-type': 'text/plain' });
    res.end(`Please POST a JSON payload to http://localhost:${PORT}/`);
    return;
  }

  const form = new Formidable();
  const fields = {};

  form
    .on('error', (err) => {
      res.writeHead(500, { 'content-type': 'text/plain' });
      res.end(`error:\n\n${util.inspect(err)}`);
      console.error(err);
    })
    .on('field', (field, value) => {
      console.log(field, value);
      fields[field] = value;
    })
    .on('end', () => {
      console.log('-> post done');
      res.writeHead(200, { 'content-type': 'text/plain' });
      res.end(`received fields:\n\n ${util.inspect(fields)}`);
    });
  form.parse(req);
});

server.listen(PORT, () => {
  const choosenPort = server.address().port;
  console.log(`Listening on http://localhost:${choosenPort}/`);

  const message = '{"numbers":[1,2,3,4,5],"nested":{"key":"value"}}';
  const request = http.request(
    {
      host: 'localhost',
      path: '/',
      port: choosenPort,
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'content-length': message.length,
      },
    },
    (response) => {
      console.log('\nServer responded with:');
      console.log('Status:', response.statusCode);
      response.pipe(process.stdout);
      response.on('end', () => {
        console.log('\n');
        process.exit();
      });
      // const data = '';
      // response.on('data', function(chunk) {
      //   data += chunk.toString('utf8');
      // });
      // response.on('end', function() {
      //   console.log('Response Data:');
      //   console.log(data);
      //   process.exit();
      // });
    },
  );

  request.write(message);
  request.end();
});
