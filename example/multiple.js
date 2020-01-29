'use strict';

const os = require('os');
const http = require('http');
const util = require('util');
const Formidable = require('../src/index');

const PORT = 13532;
const server = http.createServer((req, res) => {
  if (req.url === '/') {
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end(
      `<form action="/upload" enctype="multipart/form-data" method="post">
        <label>simple<input type="text" name="text_single" autofocus /></label><br />

        <label>array text 0<input type="text" name="text_multiple[]" /></label><br />
        <label>array text 1<input type="text" name="text_multiple[]" /></label><br />

        <label>file simple<input type="file" name="file_single" /></label><br />

        <label>file attribute multiple<input type="file" name="file_multiple" multiple /></label><br />

        <label>file html array0<input type="file" name="filearray[]" /></label><br />
        <label>file html array1<input type="file" name="filearray[]" /></label><br />

        <label>file html array and mulitple0<input type="file" name="filearray_with_multiple[]" multiple /></label><br />
        <label>file html array and mulitple1<input type="file" name="filearray_with_multiple[]" multiple /></label><br />
        <br />
        <button>Upload</button>
      </form>`,
    );
  } else if (req.url === '/upload') {
    const form = new Formidable({ multiples: true, uploadDir: os.tmpdir() });

    form.parse(req, (error, fields, files) => {
      res.writeHead(200, { 'content-type': 'text/plain' });
      res.write(`received fields:\n\n ${util.inspect(fields)}`);
      res.write('\n\n');
      res.end(`received files:\n\n ${util.inspect(files)}`);
    });
  } else {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('404');
  }
});

server.listen(PORT, () => {
  console.log(`listening on http://localhost:${PORT}/`);
});
