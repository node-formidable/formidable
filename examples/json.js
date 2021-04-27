import http from 'http';
import util from 'util';
import formidable from '../src/index.js';


const PORT = 3000;
const server = http.createServer((req, res) => {
  if (req.method !== 'POST') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(`Please POST a JSON payload to http://localhost:${PORT}/`);
    return;
  }

  const form = formidable();
  const fields = {};

  form
    .on('error', (err) => {
      console.error(err);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end(`error:\n\n${util.inspect(err)}`);
    })
    .on('field', (field, value) => {
      console.log(field, value);
      fields[field] = value;
    })
    .on('end', () => {
      console.log('-> post done from "end" event');
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end(`received fields:\n\n${util.inspect(fields)}`);
    });

  form.parse(req);
});

server.listen(PORT, () => {
  const choosenPort = server.address().port;
  console.log(`Listening on http://localhost:${choosenPort}/`);

  const body = JSON.stringify({
    numbers: [1, 2, 3, 4, 5],
    nested: { key: 'some val' },
  });

  const request = http.request(
    {
      host: 'localhost',
      path: '/',
      port: choosenPort,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'content-length': body.length,
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
  request.end(body);
});
