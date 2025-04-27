// warning: forcing file into a Buffer elminates the benefits of using streams and may cause memory overflow
import http from 'node:http';
import { Buffer } from 'node:buffer'
import { Writable } from 'node:stream';
import formidable from '../src/index.js';


const server = http.createServer((req, res) => {
  if (req.url === '/api/upload' && req.method.toLowerCase() === 'post') {
    // parse a file upload
    const endBuffers = {};
    const form = formidable({
      fileWriteStreamHandler: (file) => {
        const chunks = [];
        
        const writable = new Writable({
          write (chunk, enc, next) {
            chunks.push(chunk);            
            next();
          },
          destroy() {
            endBuffers = {};
          },
          final(cb) {
            const buffer = Buffer.concat(chunks);
            // if filename option is not provided file.newFilename will be a random string
            endBuffers[file.newFilename] = buffer;
            cb();
          },
        })
        return writable;
      },
    });

    form.parse(req, (err, fields, files) => {
      // available here endBuffers
      if (err) {
        console.error(err);
        res.writeHead(err.httpCode || 400, { 'Content-Type': 'text/plain' });
        res.end(String(err));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ fields, files }, null, 2));

      Object.entries(endBuffers).map(([key, value]) => {
        console.log(key);
        console.log(value.toString("utf8"));
      });
    });

    return;
  }

  // show a file upload form
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(`
    <h2>With Node.js <code>"http"</code> module</h2>
    <form action="/api/upload" enctype="multipart/form-data" method="post">
      <div>Text field title: <input type="text" name="title"></div>
      <div>File: <input type="file" name="myfile"></div>
      <button>Upload</button>
    </form>
  `);
});

server.listen(3000, () => {
  console.log('Server listening on http://localhost:3000 ...');
});
