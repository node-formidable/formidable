import { existsSync, mkdirSync, createWriteStream, readdirSync, statSync, unlinkSync, createReadStream } from 'fs';
import { tmpdir } from 'os';
import { createServer, request as _request } from 'http';
import path, { join, dirname } from 'path';
import url from 'url';
import assert, { strictEqual, ok } from 'assert';

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

const createDirs = (dirs) => {
  dirs.forEach((dir) => {
    if (!existsSync(dir)) {
      mkdirSync(dir);
    }
  });
};

test('file write stream handler', (done) => {
  const server = createServer((req, res) => {
    createDirs([DEFAULT_UPLOAD_DIR, CUSTOM_UPLOAD_DIR]);
    const form = formidable({
      uploadDir: DEFAULT_UPLOAD_DIR,
      fileWriteStreamHandler: () =>
        createWriteStream(CUSTOM_UPLOAD_FILE_PATH),
    });

    form.parse(req, (err, fields, files) => {
      strictEqual(Object.keys(files).length, 1);
      const file = files.file[0];

      strictEqual(file.size, 301);
      strictEqual(typeof file.filepath, 'string');

      const dirFiles = readdirSync(DEFAULT_UPLOAD_DIR);
      ok(dirFiles.length === 0);

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
