import { readFileSync, createReadStream } from 'fs';
import { createServer, request as _request } from 'http';
import path, { join, dirname } from 'path';
import url from 'url';
import assert, { strictEqual, deepStrictEqual } from 'assert';

import formidable from '../../src/index.js';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 13536;
const testFilePath = join(
  dirname(__dirname),
  'fixture',
  'file',
  'binaryfile.tar.gz',
);

test('octet stream', (done) => {
  const server = createServer((req, res) => {
    const form = formidable();

    form.parse(req, (err, fields, files) => {
      strictEqual(Object.keys(files).length, 1);
      const file = files.file[0];

      strictEqual(file.size, 301);

      const uploaded = readFileSync(file.filepath);
      const original = readFileSync(testFilePath);

      deepStrictEqual(uploaded, original);

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
        'Content-Type': 'application/octet-stream',
      },
    });

    createReadStream(testFilePath).pipe(request);
  });
});
