import http from 'http';
import os from 'os';
import formidable from '../src/index.js';


const server = http.createServer((req, res) => {
  if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <form action="/upload" enctype="multipart/form-data" method="post">
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
      </form>
    `);
  } else if (req.url === '/upload') {
    const form = formidable({ uploadDir: os.tmpdir() });

    form.parse(req, (err, fields, files) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ err, fields, files }, null, 2));
    });
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404');
  }
});

server.listen(3000, () => {
  console.log('Server listening on http://localhost:3000 ...');
});
