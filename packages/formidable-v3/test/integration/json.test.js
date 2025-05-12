/* eslint-disable node/handle-callback-err */
import assert from 'node:assert/strict';
import { createServer, request as httpRequest } from 'node:http';

import formidable from '../../src/index.js';

const testData = {
  nested: { key: 'val' },
  numbers: [1, 2, 3, 4, 5],
};

const PORT = 13535;
test('json', (done) => {
  const server = createServer((req, res) => {
    const form = formidable({ });

    form.parse(req, (err, fields) => {
      assert.deepStrictEqual(fields, {
        nested: { key: 'val' },
        numbers: [1, 2, 3, 4, 5],
      });

      res.end();
      server.close();
      done();
    });
  });

  server.listen(PORT, (err) => {
    assert.ok(!err, 'should not have error, but be falsey');

    const req = httpRequest({
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
      port: PORT,
    });

    req.write(JSON.stringify(testData));
    req.end();
  });
});
