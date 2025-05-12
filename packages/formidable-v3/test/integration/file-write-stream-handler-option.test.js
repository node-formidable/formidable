/* eslint-disable node/handle-callback-err */
import assert from 'node:assert/strict';
import {
  createReadStream,
  createWriteStream,
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
  unlinkSync,
} from 'node:fs';
import { createServer, request as httpRequest } from 'node:http';
import { tmpdir } from 'node:os';
import path, { dirname, join } from 'node:path';
import url from 'node:url';

import formidable from '../../src/index.js';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 13533;
const DEFAULT_UPLOAD_DIR = join(
  tmpdir(),
  'test-store-files-option-default',
);
const CUSTOM_UPLOAD_DIR = join(
  tmpdir(),
  'test-store-files-option-custom',
);
const CUSTOM_UPLOAD_FILE_PATH = join(CUSTOM_UPLOAD_DIR, 'test-file');
const testFilePath = join(
  dirname(__dirname),
  'fixture',
  'file',
  'binaryfile.tar.gz',
);

function createDirs(dirs) {
  dirs.forEach((dir) => {
    if (!existsSync(dir)) {
      mkdirSync(dir);
    }
  });
}

test('file write stream handler', (done) => {
  const server = createServer((req, res) => {
    createDirs([DEFAULT_UPLOAD_DIR, CUSTOM_UPLOAD_DIR]);
    const form = formidable({
      fileWriteStreamHandler: () => createWriteStream(CUSTOM_UPLOAD_FILE_PATH),
      uploadDir: DEFAULT_UPLOAD_DIR,
    });

    form.parse(req, (err, fields, files) => {
      assert.strictEqual(Object.keys(files).length, 1);
      const file = files.file[0];

      assert.strictEqual(file.size, 301);
      assert.strictEqual(typeof file.filepath, 'string');

      const dirFiles = readdirSync(DEFAULT_UPLOAD_DIR);
      assert.ok(dirFiles.length === 0);

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
