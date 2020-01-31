'use strict';

const fs = require('fs');
const http = require('http');
const path = require('path');
const assert = require('assert');

const formidable = require('../../src/index');

const PORT = 13532;
const testFilePath = path.join(
  path.dirname(__dirname),
  'fixture',
  'file',
  'binaryfile.tar.gz',
);

const server = http.createServer((req, res) => {
  const form = formidable();

  form.parse(req, (err, fields, files) => {
    assert.strictEqual(Object.keys(files).length, 1);
    const { file } = files;

    assert.strictEqual(file.size, 301);

    const uploaded = fs.readFileSync(file.path);
    const original = fs.readFileSync(testFilePath);

    assert.deepEqual(uploaded, original);

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
      'Content-Type': 'application/octet-stream',
    },
  });

  fs.createReadStream(testFilePath).pipe(request);
});
