import { strictEqual } from "node:assert";
import { createServer } from "node:http";
import test from "node:test";
import { gzipSync } from "node:zlib";
import formidable, { errors } from "../../src/index.js";

let server;
let port = 13100;

test.beforeEach(() => {
  port += 1;
  server = createServer();
});

test("gzip-compressed JSON body exceeding maxTotalFileSize triggers 413", async () => {
  const maxSize = 1024 * 1024; // 1MB

  server.on("request", async (req, res) => {
    const form = formidable({ maxTotalFileSize: maxSize });

    try {
      await form.parse(req);
      res.writeHead(200);
      res.end("ok");
    } catch (err) {
      res.writeHead(err.httpCode || 500);
      res.end(
        JSON.stringify({ code: err.code, httpCode: err.httpCode }),
      );
    }
  });

  await new Promise((resolve) => server.listen(port, resolve));

  // 2MB JSON body compressed to ~2KB
  const body = JSON.stringify({ data: "a".repeat(2 * 1024 * 1024) });
  const compressed = gzipSync(Buffer.from(body));

  const res = await fetch(`http://localhost:${port}/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Encoding": "gzip",
      "Content-Length": compressed.length,
    },
    body: compressed,
  });

  strictEqual(res.status, 413);

  const result = JSON.parse(await res.text());
  strictEqual(result.code, errors.biggerThanTotalMaxFileSize);
  strictEqual(result.httpCode, 413);
});

test("gzip-compressed JSON body within limit succeeds", async () => {
  const maxSize = 5 * 1024 * 1024; // 5MB

  server.on("request", async (req, res) => {
    const form = formidable({ maxTotalFileSize: maxSize });

    try {
      const [fields] = await form.parse(req);
      res.writeHead(200);
      res.end(JSON.stringify({ fieldCount: Object.keys(fields).length }));
    } catch (err) {
      res.writeHead(err.httpCode || 500);
      res.end(err.message);
    }
  });

  await new Promise((resolve) => server.listen(port, resolve));

  // 1MB JSON body, under the 5MB limit
  const body = JSON.stringify({ data: "a".repeat(1024 * 1024) });
  const compressed = gzipSync(Buffer.from(body));

  const res = await fetch(`http://localhost:${port}/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Encoding": "gzip",
      "Content-Length": compressed.length,
    },
    body: compressed,
  });

  strictEqual(res.status, 200);

  const result = JSON.parse(await res.text());
  strictEqual(result.fieldCount, 1);
});

test.afterEach(async () => {
  await new Promise((resolve) => {
    if (server.listening) {
      server.close(() => resolve());
    } else {
      resolve();
    }
  });
});
