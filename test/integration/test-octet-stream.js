'use strict';

const fs = require('fs');
const http = require('http');
const path = require('path');
const assert = require('assert');
const hashish = require('hashish');

const Formidable = require('../../src/index');
const common = require('../common');

const testFilePath = path.join(__dirname, '../fixture/file/binaryfile.tar.gz');

const server = http.createServer((req, res) => {
  const form = new Formidable();

  form.parse(req, (err, fields, files) => {
    assert.equal(hashish(files).length, 1);
    const { file } = files;

    assert.equal(file.size, 301);

    const uploaded = fs.readFileSync(file.path);
    const original = fs.readFileSync(testFilePath);

    assert.deepEqual(uploaded, original);

    res.end();
    server.close();
  });
});

server.listen(common.port, (err) => {
  assert.equal(err, null);

  const request = http.request({
    port: common.port,
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
    },
  });

  fs.createReadStream(testFilePath).pipe(request);
});
