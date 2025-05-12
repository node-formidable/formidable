/* eslint-disable global-require */
/* eslint-disable import/no-dynamic-require */

import assert from 'node:assert/strict';
import { createReadStream } from 'node:fs';
import { createServer } from 'node:http';
import { createConnection } from 'node:net';
import { join } from 'node:path';

import formidable from '../../src/index.js';
import * as encoding from '../fixture/js/encoding.js';
import * as misc from '../fixture/js/misc.js';
import * as noFilename from '../fixture/js/no-filename.js';
import * as preamble from '../fixture/js/preamble.js';
import * as specialCharsInFilename from '../fixture/js/special-chars-in-filename.js';
import * as _workarounds from '../fixture/js/workarounds.js';

const PORT = 13534;
const CWD = process.cwd();
const FIXTURES_HTTP = join(CWD, 'test', 'fixture', 'http');
const UPLOAD_DIR = join(CWD, 'test', 'tmp');

const fixtures = {
  [`no-filename`]: noFilename,
  [`special-chars-in-filename`]: specialCharsInFilename,
  encoding,
  misc,
  preamble,
  // _workarounds, // todo uncomment this and make it work
};

test('fixtures', (done) => {
  const server = createServer();
  server.listen(PORT, findFixtures);

  function findFixtures() {
    function toFixture(name, fgroup) {
      return Object.entries(name).map(([_, v]) => v.map((details) => ({
        fixture: v,
        name: `${fgroup}/${details.fixture}.http`,
      })));
    }

    const results = Object.entries(fixtures)
      .map(([fixtureGroup, fixture]) => toFixture(fixture, fixtureGroup))
      .flat(Infinity);

    testNext(results);
  }

  function testNext(results) {
    const fixtureWithName = results.shift();
    if (!fixtureWithName) {
      server.close();
      done();
      return;
    }
    const fixtureName = fixtureWithName.name;
    const fixture = fixtureWithName.fixture;

    uploadFixture(fixtureName, (err, parts) => {
      if (err) {
        err.fixtureName = fixtureName;
        throw err;
      }

      fixture.forEach((expectedPart, i) => {
        const parsedPart = parts[i];
        assert.strictEqual(parsedPart.type, expectedPart.type);
        assert.strictEqual(parsedPart.name, expectedPart.name);

        if (parsedPart.type === 'file') {
          const file = parsedPart.value;
          assert.strictEqual(
            file.originalFilename,
            expectedPart.originalFilename,
            `${JSON.stringify([expectedPart, file])}`,
          );

          if (expectedPart.sha1) {
            assert.strictEqual(
              file.hash,
              expectedPart.sha1,
              `SHA1 error ${file.originalFilename} on ${file.filepath} ${JSON.stringify([expectedPart, file])}`,
            );
          }
        }
      });

      testNext(results);
    });
  }

  function uploadFixture(fixtureName, cb) {
    server.once('request', (req, res) => {
      const form = formidable({
        hashAlgorithm: 'sha1',
        uploadDir: UPLOAD_DIR,
      });
      form.parse(req);

      function callback(...args) {
        const realCallback = cb;
        cb = function callbackFn() {};

        realCallback(...args);
      }

      const parts = [];
      form
        .on('error', callback)
        .on('fileBegin', (name, value) => {
          parts.push({ name, type: 'file', value });
        })
        .on('field', (name, value) => {
          parts.push({ name, type: 'field', value });
        })
        .on('end', () => {
          res.end();
          callback(null, parts);
        });
    });

    const socket = createConnection(PORT);
    const fixturePath = join(FIXTURES_HTTP, fixtureName);
    const file = createReadStream(fixturePath);

    file.pipe(socket, { end: false });

    socket.on('data', () => {
      socket.end();
    });
  }
});
