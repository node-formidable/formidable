import { createServer, request as httpRequest } from 'http';
import assert from 'node:assert/strict';
import {
  createReadStream,
  existsSync,
  mkdirSync,
  statSync,
  unlinkSync,
  WriteStream,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path, { dirname, join } from 'node:path';
import url from 'node:url';

import formidable from '../../src/index.js';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = 13537;
const DEFAULT_UPLOAD_DIR = join(
  tmpdir(),
  'test-store-files-option-default',
);
const CUSTOM_UPLOAD_FILE_PATH = join(DEFAULT_UPLOAD_DIR, 'test-file');
const testFilePath = join(
  dirname(__dirname),
  'fixture',
  'file',
  'binaryfile.tar.gz',
);

test('store files option', (done) => {
  const server = createServer((req, res) => {
    if (!existsSync(DEFAULT_UPLOAD_DIR)) {
      mkdirSync(DEFAULT_UPLOAD_DIR);
    }
    const form = formidable({
      fileWriteStreamHandler: () => new WriteStream(CUSTOM_UPLOAD_FILE_PATH),
      uploadDir: DEFAULT_UPLOAD_DIR,
    });

    form.parse(req, (_, fields, files) => {
      assert.strictEqual(Object.keys(files).length, 1);
      const file = files.file[0];

      assert.strictEqual(file.size, 301);
      assert.strictEqual(typeof file.filepath, 'string');

      const uploadedFileStats = statSync(CUSTOM_UPLOAD_FILE_PATH);
      assert.ok(uploadedFileStats.size === file.size);

      unlinkSync(CUSTOM_UPLOAD_FILE_PATH);
      res.end();
      server.close();
      done();
    });
  });

  server.listen(PORT, (err) => {
    assert.ok(!err, 'should not have error, but be falsey');

    const request = httpRequest({
      headers: {
        'Content-Type': 'application/octet-stream',
      },
      method: 'POST',
      port: PORT,
    });

    createReadStream(testFilePath).pipe(request);
  });
});
