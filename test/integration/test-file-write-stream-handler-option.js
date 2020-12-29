'use strict';

const fs = require('fs');
const os = require('os');
const http = require('http');
const path = require('path');
const assert = require('assert');

const formidable = require('../../src/index');

const PORT = 13532;
const DEFAULT_UPLOAD_DIR = path.join(
  os.tmpdir(),
  'test-store-files-option-default',
);
const CUSTOM_UPLOAD_DIR = path.join(
  os.tmpdir(),
  'test-store-files-option-custom',
);
const CUSTOM_UPLOAD_FILE_PATH = path.join(CUSTOM_UPLOAD_DIR, 'test-file');
const testFilePath = path.join(
  path.dirname(__dirname),
  'fixture',
  'file',
  'binaryfile.tar.gz',
);

const createDirs = (dirs) => {
  dirs.forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }
  });
};

const server = http.createServer((req, res) => {
  createDirs([DEFAULT_UPLOAD_DIR, CUSTOM_UPLOAD_DIR]);
  const form = formidable({
    uploadDir: DEFAULT_UPLOAD_DIR,
    fileWriteStreamHandler: () => fs.createWriteStream(CUSTOM_UPLOAD_FILE_PATH),
  });

  form.parse(req, (err, fields, files) => {
    assert.strictEqual(Object.keys(files).length, 1);
    const { file } = files;

    assert.strictEqual(file.size, 301);
    assert.ok(file.path === undefined);

    const dirFiles = fs.readdirSync(DEFAULT_UPLOAD_DIR);
    assert.ok(dirFiles.length === 0);

    const uploadedFileStats = fs.statSync(CUSTOM_UPLOAD_FILE_PATH);
    assert.ok(uploadedFileStats.size === file.size);

    fs.unlinkSync(CUSTOM_UPLOAD_FILE_PATH);
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
