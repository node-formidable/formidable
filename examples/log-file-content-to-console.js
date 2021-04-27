import http from 'http';
import { Writable } from 'stream';
import formidable from '../src/index.js';


const server = http.createServer((req, res) => {
  if (req.url === '/api/upload' && req.method.toLowerCase() === 'post') {
    // parse a file upload
    const form = formidable({
      fileWriteStreamHandler: (/* file */) => {
        const writable = Writable();
        // eslint-disable-next-line no-underscore-dangle
        writable._write = (chunk, enc, next) => {
          console.log(chunk.toString());
          next();
        };
        return writable;
      },
    });

    form.parse(req, () => {
      res.writeHead(200);
      res.end();
    });

    return;
  }

  // show a file upload form
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(`
    <h2>With Node.js <code>"http"</code> module</h2>
    <form action="/api/upload" enctype="multipart/form-data" method="post">
      <div>Text field title: <input type="text" name="title" /></div>
      <div>File: <input type="file" name="file" /></div>
      <input type="submit" value="Upload" />
    </form>
  `);
});

server.listen(3000, () => {
  console.log('Server listening on http://localhost:3000 ...');
});
