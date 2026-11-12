import { createServer, request as _request } from "node:http";
import assert, { strictEqual, deepStrictEqual } from "node:assert";

import formidable from "../../src/index.js";
import {
  noEmptyFiles,
  smallerThanMinFileSize,
} from "../../src/FormidableError.js";

function upload({ port, options, headers, body }, check, done) {
  let request;
  let parsed = false;
  const server = createServer((req, res) => {
    const form = formidable(options);

    form.parse(req, (err, fields, files) => {
      parsed = true;
      res.end();
      request.destroy();
      server.close();
      try {
        check(err, files);
        done();
      } catch (error) {
        done(error);
      }
    });
  });

  server.listen(port, (err) => {
    assert(!err, "should not have error, but be falsey");

    request = _request({
      port,
      method: "POST",
      headers: { "Content-Type": "application/octet-stream", ...headers },
    });

    request.on("error", (error) => {
      if (parsed) return;
      server.close();
      done(error);
    });
    request.end(body);
  });
}

test("octet stream applies filter", (done) => {
  const calls = [];
  upload(
    {
      port: 13552,
      options: {
        filter: ({ name, originalFilename, mimetype }) => {
          calls.push({ name, originalFilename, mimetype });
          return false;
        },
      },
      headers: { "X-File-Name": "a.bin" },
      body: Buffer.alloc(1000, 0x42),
    },
    (err, files) => {
      assert(!err, "a filtered file should not make the parse fail");
      strictEqual(Object.keys(files).length, 0);
      deepStrictEqual(calls, [
        {
          name: "file",
          originalFilename: "a.bin",
          mimetype: "application/octet-stream",
        },
      ]);
    },
    done
  );
});

test("octet stream enforces minFileSize", (done) => {
  upload(
    {
      port: 13553,
      options: { minFileSize: 1000 },
      body: Buffer.alloc(10, 0x42),
    },
    (err, files) => {
      assert(
        err,
        "expected an error for an octet-stream upload under minFileSize"
      );
      strictEqual(err.code, smallerThanMinFileSize);
      strictEqual(Object.keys(files).length, 0);
    },
    done
  );
});

test("octet stream rejects an empty chunked body", (done) => {
  upload(
    {
      port: 13554,
      options: {},
      headers: { "Transfer-Encoding": "chunked" },
      body: Buffer.alloc(0),
    },
    (err, files) => {
      assert(err, "expected an error for an empty octet-stream upload");
      strictEqual(err.code, noEmptyFiles);
      strictEqual(Object.keys(files).length, 0);
    },
    done
  );
});

test("octet stream accepts an empty chunked body with allowEmptyFiles", (done) => {
  upload(
    {
      port: 13555,
      options: { allowEmptyFiles: true, minFileSize: 0 },
      headers: { "Transfer-Encoding": "chunked" },
      body: Buffer.alloc(0),
    },
    (err, files) => {
      assert(!err, "an empty file is allowed with allowEmptyFiles");
      strictEqual(files.file.length, 1);
      strictEqual(files.file[0].size, 0);
    },
    done
  );
});
