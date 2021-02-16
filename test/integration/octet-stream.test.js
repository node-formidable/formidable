'use strict';

const fs = require('fs');
const http = require('http');
const path = require('path');
const assert = require('assert');

const formidable = require('../../src/index');

const PORT = 13536;
const testFilePath = path.join(
  path.dirname(__dirname),
  'fixture',
  'file',
  'binaryfile.tar.gz',
);

test('octet stream', (done) => {
  const server = http.createServer((req, res) => {
    const form = formidable();

    form.parse(req, (err, fields, files) => {
      assert.strictEqual(Object.keys(files).length, 1);
      const { file } = files;

      assert.strictEqual(file.size, 301);

      const uploaded = fs.readFileSync(file.path);
      const original = fs.readFileSync(testFilePath);

      assert.deepStrictEqual(uploaded, original);

      res.end();
      server.close();
      done();
    });
  });

  server.listen(PORT, (err) => {
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
});
