import http from 'http';
import util from 'util';
import formidable from '../src/index.js';


const server = http.createServer((req, res) => {
  if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <form action="/post" method="post">
        Title: <input type="text" name="title" /><br />
        Data: <input type="text" name="data" /><br />
        <button>Submit</button>
      </form>
    `);
  } else if (req.url === '/post') {
    const form = formidable();
    const fields = [];

    form
      .on('error', (err) => {
        console.log('err!', err);
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end(`error:\n\n${util.inspect(err)}`);
      })
      .on('field', (fieldName, fieldValue) => {
        console.log('fieldName:', fieldName);
        console.log('fieldValue:', fieldValue);

        fields.push({ fieldName, fieldValue });
      })
      .on('end', () => {
        console.log('-> post done from "end" event');
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end(`received fields:\n\n${util.inspect(fields)}`);
      });

    form.parse(req, () => {
      console.log('-> post done from callback');
      // res.writeHead(200, { 'Content-Type': 'text/plain' });
      // res.end(`received fields:\n\n${util.inspect(fields)}`);
    });
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404');
  }
});

server.listen(3000, () => {
  console.log('Server listening on http://localhost:3000 ...');
});
