const http = require('http');
const util = require('util');
const common = require('../test/common');

const { formidable } = common;
const { port } = common;
let server;

server = http.createServer((req, res) => {
  if (req.url === '/') {
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end(
      `<form action="/post" method="post">
        <input type="text" name="title"><br>
        <input type="text" name="data[foo][]"><br>
        <button>Submit</button>
      '</form>`,
    );
  } else if (req.url === '/post') {
    const form = new formidable.IncomingForm();
    const fields = [];

    form
      .on('error', (err) => {
        res.writeHead(200, { 'content-type': 'text/plain' });
        res.end(`error:\n\n${util.inspect(err)}`);
      })
      .on('field', (field, value) => {
        console.log(field, value);
        fields.push([field, value]);
      })
      .on('end', () => {
        console.log('-> post done');
        res.writeHead(200, { 'content-type': 'text/plain' });
        res.end(`received fields:\n\n ${util.inspect(fields)}`);
      });
    form.parse(req);
  } else {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('404');
  }
});
server.listen(port);

console.log(`listening on http://localhost:${port}/`);
