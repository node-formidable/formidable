const http = require('http');
const util = require('util');
const os = require('os');
const common = require('../test/common');

const { formidable } = common;
const { port } = common;
let server;

server = http.createServer((req, res) => {
  if (req.url === '/') {
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end(
      `<form action="/upload" enctype="multipart/form-data" method="post">
        <input type="text" name="title"><br>
        <input type="file" name="upload" multiple><br>
        <button>Upload</button>
      </form>`,
    );
  } else if (req.url === '/upload') {
    const form = new formidable.IncomingForm();
    const files = [];
    const fields = [];

    form.uploadDir = os.tmpdir();

    form
      .on('field', (field, value) => {
        console.log(field, value);
        fields.push([field, value]);
      })
      .on('file', (field, file) => {
        console.log(field, file);
        files.push([field, file]);
      })
      .on('end', () => {
        console.log('-> upload done');
        res.writeHead(200, { 'content-type': 'text/plain' });
        res.write(`received fields:\n\n ${util.inspect(fields)}`);
        res.write('\n\n');
        res.end(`received files:\n\n ${util.inspect(files)}`);
      });
    form.parse(req);
  } else {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('404');
  }
});
server.listen(port);

console.log(`listening on http://localhost:${port}/`);
