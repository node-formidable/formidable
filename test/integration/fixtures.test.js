/* eslint-disable global-require */
/* eslint-disable import/no-dynamic-require */

import { readdirSync, createReadStream } from 'fs';
import { createConnection } from 'net';
import { join, basename } from 'path';
import { createServer } from 'http';
import { strictEqual } from 'assert';

import formidable from '../../src/index.js';

const PORT = 13534;
const CWD = process.cwd();
const FIXTURES_PATH = join(CWD, 'test', 'fixture', 'js');
const FIXTURES_HTTP = join(CWD, 'test', 'fixture', 'http');
const UPLOAD_DIR = join(CWD, 'test', 'tmp');

test('fixtures', (done) => {
  const server = createServer();
  server.listen(PORT, findFixtures);

  function findFixtures() {
    const results = readdirSync(FIXTURES_PATH)
      // .filter((x) => /workarounds/.test(x))
      .filter((x) => /\.js$/.test(x))
      .reduce((acc, fp) => {
        const group = basename(fp, '.js');
        const filepath = join(FIXTURES_PATH, fp);
        const mod = require(filepath);

        Object.keys(mod).forEach((k) => {
          Object.keys(mod[k]).forEach((_fixture) => {
            acc.push({
              fixture: mod[k],
              name: join(group, k),
            });
          });
        });

        return acc;
      }, []);

    testNext(results);
  }

  function testNext(results) {
    let fixture = results.shift();
    if (!fixture) {
      server.close();
      done();
      return;
    }
    const fixtureName = fixture.name;
    fixture = fixture.fixture;

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
