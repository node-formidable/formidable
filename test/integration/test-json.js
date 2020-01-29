'use strict';

const http = require('http');
const assert = require('assert');
const formidable = require('../../src/index');

const testData = {
  numbers: [1, 2, 3, 4, 5],
  nested: { key: 'val' },
};

const PORT = 13532;
const server = http.createServer((req, res) => {
  const form = formidable();

  form.parse(req, (err, fields) => {
    assert.deepStrictEqual(fields, {
      numbers: [1, 2, 3, 4, 5],
      nested: { key: 'val' },
    });

    res.end();
    server.close();
  });
});

server.listen(PORT, (err) => {
  const choosenPort = server.address().port;
  const url = `http://localhost:${choosenPort}`;
  console.log('Server up and running at:', url);

  assert(!err, 'should not have error, but be falsey');

  const request = http.request({
    port: PORT,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  request.write(JSON.stringify(testData));
  request.end();
});
