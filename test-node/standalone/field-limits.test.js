import { deepStrictEqual, strictEqual } from 'node:assert';
import { createServer } from 'node:http';
import test from 'node:test';
import formidable, { errors } from '../../src/index.js';

const MAX_FIELDS_SIZE = 1024;
const MAX_FIELDS = 2;
const BIG = 2 * 1024 * 1024;

// Parse one body with the given options and return the parse callback outcome.
async function parseBody(options, contentType, body) {
  let outcome;
  const server = createServer((req, res) => {
    const form = formidable(options);
    form.parse(req, (err, fields) => {
      outcome = { err, fields };
      res.writeHead(204);
      res.end();
    });
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  try {
    const res = await fetch(`http://127.0.0.1:${port}/`, {
      method: 'POST',
      headers: {
        'content-type': contentType,
        'content-length': String(body.length),
      },
      body,
    });
    await res.arrayBuffer();
    // The parse callback runs before the response is written; give the
    // microtask queue a tick so `outcome` is visible here.
    await new Promise((resolve) => setImmediate(resolve));
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
  return outcome;
}

const limits = { maxFieldsSize: MAX_FIELDS_SIZE, maxFields: MAX_FIELDS };
const json = (obj) => Buffer.from(JSON.stringify(obj));
const urlenc = (pairs) =>
  Buffer.from(pairs.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&'));

function multipartField(name, data) {
  const boundary = `----field-limits-${Math.random().toString(16).slice(2)}`;
  const head = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n`,
  );
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`);
  return {
    type: `multipart/form-data; boundary=${boundary}`,
    body: Buffer.concat([head, data, tail]),
  };
}

function assertRejected(outcome, code) {
  strictEqual(outcome.err?.code, code);
  strictEqual(outcome.err?.httpCode, 413);
}

test('maxFieldsSize is enforced for application/json', async () => {
  const outcome = await parseBody(
    limits,
    'application/json',
    json({ blob: 'a'.repeat(BIG) }),
  );
  assertRejected(outcome, errors.maxFieldsSizeExceeded);
});

test('maxFieldsSize is enforced for application/x-www-form-urlencoded', async () => {
  const outcome = await parseBody(
    limits,
    'application/x-www-form-urlencoded',
    urlenc([['blob', 'a'.repeat(BIG)]]),
  );
  assertRejected(outcome, errors.maxFieldsSizeExceeded);
});

test('maxFieldsSize is enforced for multipart fields (control)', async () => {
  const part = multipartField('blob', Buffer.alloc(BIG, 0x61));
  const outcome = await parseBody(limits, part.type, part.body);
  assertRejected(outcome, errors.maxFieldsSizeExceeded);
});

test('maxFields is enforced for application/json', async () => {
  const outcome = await parseBody(limits, 'application/json', json({ a: 1, b: 2, c: 3 }));
  assertRejected(outcome, errors.maxFieldsExceeded);
});

test('maxFields is enforced for application/x-www-form-urlencoded (control)', async () => {
  const outcome = await parseBody(
    limits,
    'application/x-www-form-urlencoded',
    urlenc([
      ['a', '1'],
      ['b', '2'],
      ['c', '3'],
    ]),
  );
  assertRejected(outcome, errors.maxFieldsExceeded);
});

test('maxFieldsSize boundary: a field equal to the limit is accepted', async () => {
  const jsonOutcome = await parseBody(
    limits,
    'application/json',
    json({ blob: 'a'.repeat(MAX_FIELDS_SIZE) }),
  );
  strictEqual(jsonOutcome.err, null);
  strictEqual(jsonOutcome.fields.blob.length, MAX_FIELDS_SIZE);

  const urlencodedOutcome = await parseBody(
    limits,
    'application/x-www-form-urlencoded',
    urlenc([['blob', 'a'.repeat(MAX_FIELDS_SIZE)]]),
  );
  strictEqual(urlencodedOutcome.err, null);
  strictEqual(urlencodedOutcome.fields.blob[0].length, MAX_FIELDS_SIZE);
});

test('maxFieldsSize boundary: a field one byte over the limit is rejected', async () => {
  const jsonOutcome = await parseBody(
    limits,
    'application/json',
    json({ blob: 'a'.repeat(MAX_FIELDS_SIZE + 1) }),
  );
  assertRejected(jsonOutcome, errors.maxFieldsSizeExceeded);

  const urlencodedOutcome = await parseBody(
    limits,
    'application/x-www-form-urlencoded',
    urlenc([['blob', 'a'.repeat(MAX_FIELDS_SIZE + 1)]]),
  );
  assertRejected(urlencodedOutcome, errors.maxFieldsSizeExceeded);
});

test('JSON fields are still parsed and collected when under the limits', async () => {
  const outcome = await parseBody(
    { ...limits, maxFields: 10 },
    'application/json',
    json({ a: 'b', nested: { k: 'v' }, list: [1, 2] }),
  );
  strictEqual(outcome.err, null);
  deepStrictEqual({ ...outcome.fields }, {
    a: 'b',
    nested: { k: 'v' },
    list: [1, 2],
  });
  strictEqual(Object.getPrototypeOf(outcome.fields), null);
});

test('urlencoded fields are still parsed and collected when under the limits', async () => {
  const outcome = await parseBody(
    limits,
    'application/x-www-form-urlencoded',
    urlenc([
      ['a', 'b'],
      ['c', 'd'],
    ]),
  );
  strictEqual(outcome.err, null);
  deepStrictEqual({ ...outcome.fields }, { a: ['b'], c: ['d'] });
});
