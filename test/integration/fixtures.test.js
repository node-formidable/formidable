/* eslint-disable global-require */
/* eslint-disable import/no-dynamic-require */

import { createReadStream } from 'fs';
import { createConnection } from 'net';
import { join } from 'path';
import { createServer } from 'http';
import { strictEqual } from 'assert';

import formidable from '../../src/index.js';

const PORT = 13534;
const CWD = process.cwd();
const FIXTURES_HTTP = join(CWD, 'test', 'fixture', 'http');
const UPLOAD_DIR = join(CWD, 'test', 'tmp');
import * as encoding from "../fixture/js/encoding.js";
import * as misc from "../fixture/js/misc.js";
import * as noFilename from "../fixture/js/no-filename.js";
import * as preamble from "../fixture/js/preamble.js";
import * as workarounds from "../fixture/js/workarounds.js";
import * as specialCharsInFilename from "../fixture/js/special-chars-in-filename.js";

const fixtures= {
  encoding,
  misc,
  [`no-filename`]: noFilename,
  preamble, 
  [`special-chars-in-filename`]: specialCharsInFilename,
  workarounds,
};

test('fixtures', (done) => {
  const server = createServer();
  server.listen(PORT, findFixtures);

  function findFixtures() {
      const results = Object.entries(fixtures).map(([fixtureGroup, fixture]) => {
        return Object.entries(fixture).map(([k, v]) => {
          return v.map(details => {
            return {
              fixture: v,
              name: `${fixtureGroup}/${details.fixture}.http`
            };
          });
        });
      }).flat(Infinity);
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
        strictEqual(parsedPart.type, expectedPart.type);
        strictEqual(parsedPart.name, expectedPart.name);

        if (parsedPart.type === 'file') {
          const file = parsedPart.value;
          strictEqual(file.originalFilename, expectedPart.originalFilename);

          if (expectedPart.sha1) {
            strictEqual(
              file.hash,
              expectedPart.sha1,
              `SHA1 error ${file.name} on ${file.filepath}`,
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
        uploadDir: UPLOAD_DIR,
        hashAlgorithm: 'sha1',
      });
      form.parse(req);

      function callback(...args) {
        const realCallback = cb;
        // eslint-disable-next-line no-param-reassign
        cb = function calbackFn() {};

        realCallback(...args);
      }

      const parts = [];
      form
        .on('error', callback)
        .on('fileBegin', (name, value) => {
          parts.push({ type: 'file', name, value });
        })
        .on('field', (name, value) => {
          parts.push({ type: 'field', name, value });
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
