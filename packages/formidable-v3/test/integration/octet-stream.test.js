import assert from 'node:assert/strict';
import { createReadStream, readFileSync } from 'node:fs';
import { createServer, request as httpRequest } from 'node:http';
import path, { dirname, join } from 'node:path';
import url from 'node:url';

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

    form.parse(req, (_, fields, files) => {
      assert.strictEqual(Object.keys(files).length, 1);
      const file = files.file[0];

      assert.strictEqual(file.size, 301);

      const uploaded = readFileSync(file.filepath);
      const original = readFileSync(testFilePath);

      assert.deepStrictEqual(uploaded, original);

      res.end();
      server.close();
      done();
    });
  });

  server.listen(PORT, (err) => {
    assert.ok(!err, 'should not have error, but be falsey');

    const req = httpRequest({
      headers: {
        'Content-Type': 'application/octet-stream',
      },
      method: 'POST',
      port: PORT,
    });

    createReadStream(testFilePath).pipe(req);
  });
});
