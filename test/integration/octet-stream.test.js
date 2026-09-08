import { readFileSync, createReadStream } from "node:fs";
import { createServer, request as _request } from "node:http";
import path, { join, dirname } from "node:path";
import url from "node:url";
import assert, { strictEqual, deepStrictEqual } from "node:assert";

import formidable from "../../src/index.js";

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 13536;
const testFilePath = join(
  dirname(__dirname),
  "fixture",
  "file",
  "binaryfile.tar.gz"
);

test("octet stream", (done) => {
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
    assert(!err, "should not have error, but be falsey");

    const request = _request({
      port: PORT,
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
      },
    });

    createReadStream(testFilePath).pipe(request);
  });
});

test("octet stream enforces maxFileSize", (done) => {
  const PORT2 = PORT + 1;
  const server = createServer((req, res) => {
    const form = formidable({ maxFileSize: 1024, maxTotalFileSize: 2048 });

    form.parse(req, (err, fields, files) => {
      // a 256KB octet-stream body must be rejected, not written to disk
      assert(err, "expected an error for over-sized octet-stream upload");
      strictEqual(err.code, 1016); // biggerThanMaxFileSize
      strictEqual(Object.keys(files).length, 0);

      res.end();
      server.close();
      done();
    });
  });

  server.listen(PORT2, (err) => {
    assert(!err, "should not have error, but be falsey");

    const request = _request({
      port: PORT2,
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
      },
    });

    request.end(Buffer.alloc(256 * 1024, 0x42));
  });
});
