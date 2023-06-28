import { createServer, request } from "node:http";
import { ok, strictEqual } from "node:assert";
import { Buffer } from 'node:buffer';
import formidable from "../../src/index.js";

// OS choosing port
const PORT = 13531;
const type = "multipart/related; boundary=a7a65b99-8a61-4e2c-b149-f73a3b35f923"
const body = "LS1hN2E2NWI5OS04YTYxLTRlMmMtYjE0OS1mNzNhM2IzNWY5MjMNCmNvbnRlbnQtZGlzcG9zaXRpb246IGZvcm0tZGF0YTsgbmFtZT0iZm9vIg0KDQpiYXJyeQ0KLS1hN2E2NWI5OS04YTYxLTRlMmMtYjE0OS1mNzNhM2IzNWY5MjMtLQ";
const buffer = Buffer.from(body, 'base64url');

test("issue 46", (done) => {
  const server = createServer(async (req, res) => {
    // Parse form and write results to response.
    const form = formidable();
    const [fields] = await form.parse(req);
    ok(fields.foo, 'should have fields.foo === barry');
    strictEqual(fields.foo[0], 'barry');
    server.close(() => {
      done();
    });
  });

  server.listen(PORT, () => {
    const chosenPort = server.address().port;
    const url = `http://localhost:${chosenPort}`;

    const req = request(url, {
      method: "POST",
      headers: {
        "Content-Type": type,
        "Content-Length": buffer.byteLength
      }
    });

    req.write(buffer);
    req.end();
    
  });
});
