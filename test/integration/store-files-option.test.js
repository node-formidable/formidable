import { existsSync, mkdirSync, WriteStream, statSync, unlinkSync, createReadStream } from 'fs';
import { tmpdir } from 'os';
import { createServer, request as _request } from 'http';
import assert, { strictEqual, ok } from 'assert';

import path, { join, dirname } from 'path';
import url from 'url';

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
      uploadDir: DEFAULT_UPLOAD_DIR,
      fileWriteStreamHandler: () => new WriteStream(CUSTOM_UPLOAD_FILE_PATH),
    });

    form.parse(req, (err, fields, files) => {
      strictEqual(Object.keys(files).length, 1);
      const file = files.file[0];

      strictEqual(file.size, 301);
      strictEqual(typeof file.filepath, 'string');

      const uploadedFileStats = statSync(CUSTOM_UPLOAD_FILE_PATH);
      ok(uploadedFileStats.size === file.size);

      unlinkSync(CUSTOM_UPLOAD_FILE_PATH);
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
