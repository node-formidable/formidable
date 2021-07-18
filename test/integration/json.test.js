import { createServer, request as _request } from 'http';
import assert, { deepStrictEqual } from 'assert';
import formidable from '../../src/index.js';

const testData = {
  numbers: [1, 2, 3, 4, 5],
  nested: { key: 'val' },
};

const PORT = 13535;
test('json', (done) => {
  const server = createServer((req, res) => {
    const form = formidable({ });

    form.parse(req, (err, fields) => {
      deepStrictEqual(fields, {
        numbers: [1, 2, 3, 4, 5],
        nested: { key: 'val' },
      });

      res.end();
      server.close();
      done();
    });
  });

  server.listen(PORT, (err) => {
    assert(!err, 'should not have error, but be falsey');

    const request = _request({
      port: PORT,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    request.write(JSON.stringify(testData));
    request.end();
  });
});
