// inital copy of with-http.js
// made a copy so that examples can be changed without impacting tests
import http from 'node:http';
import slugify from '@sindresorhus/slugify';
import formidable, {errors as formidableErrors} from '../src/index.js';

const server = http.createServer((req, res) => {
  // handle common internet errors
  // to avoid server crash
  req.on('error', console.error);
  res.on('error', console.error);


  if (req.url === '/api/upload' && req.method.toLowerCase() === 'post') {
    const form = formidable({
      uploadDir: `benchmark/testuploads`,
      keepExtensions: true,
    });

    form.parse(req, (err, fields, files) => {
      if (err) {
        console.error(err);
        res.writeHead(err.httpCode || 400, { 'Content-Type': 'text/plain' });
        res.end(String(err));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ fields, files }, null, 2));
    });

    return;
  }

  // else not used in tests

});

server.listen(3000, () => {
  console.log('Server listening on http://localhost:3000 ...');
});
