import http from 'http';
import util from 'util';
import os from 'os';
import formidable from '../src/index.js';


const server = http.createServer((req, res) => {
  if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <form action="/upload" enctype="multipart/form-data" method="post">
        <input type="text" name="title"><br>
        <input type="file" name="someCoolFiles" multiple><br>
        <button>Upload</button>
      </form>
    `);
  } else if (req.url === '/upload') {
    const form = formidable({ uploadDir: os.tmpdir() });
    const files = [];
    const fields = [];

    form
      .on('field', (fieldName, value) => {
        console.log(fieldName, value);
        fields.push({ fieldName, value });
      })
      .on('file', (fieldName, file) => {
        console.log(fieldName, file);
        files.push({ fieldName, file });
      })
      .on('end', () => {
        console.log('-> upload done');
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.write(`received fields:\n\n${util.inspect(fields)}`);
        res.write('\n\n');
        res.end(`received files:\n\n${util.inspect(files)}`);
      });

    form.parse(req);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404');
  }
});

server.listen(3000, () => {
  console.log('Server listening on http://localhost:3000 ...');
});
