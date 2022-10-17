import {strictEqual} from 'node:assert';
import { createServer } from 'node:http';
import { connect } from 'node:net';
import formidable from '../../src/index.js';

const PORT = 13539;

test('end event emitted twice', (done) => {
  const server = createServer((req) => {
    const form = formidable();

    let i = 0;
    form.on('end', () => {
      i += 1;
      strictEqual(i, 1, 'end should be emitted once');
    });
    form.parse(req, () => {

      server.close();
      strictEqual(i, 1, 'end should be emitted once');
      done();
    });
  });

  server.listen(PORT, 'localhost', () => {
    const chosenPort = server.address().port;

    const client = connect(chosenPort);

    client.write(
`POST /api/upload HTTP/1.1
Host: localhost:${chosenPort}
User-Agent: N
Content-Type: multipart/form-data; boundary=---------------------------13068458571765726332503797717


-----------------------------13068458571765726332503797717
Content-Disposition: form-data; name="title"

a
-----------------------------13068458571765726332503797717
Content-Disposition: form-data; name="multipleFiles"; filename="x.txt"
Content-Type: application/x-javascript



a
b
c
d

-----------------------------13068458571765726332503797717--
`,
    );
    client.end();
  });
});
