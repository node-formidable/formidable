/* eslint-disable global-require */
/* eslint-disable import/no-dynamic-require */

'use strict';

const fs = require('fs');
const net = require('net');
const path = require('path');
const http = require('http');
const assert = require('assert');
const getPort = require('get-port');

const formidable = require('../../src/index');

let server;
const PORT = await getPort();
const CWD = process.cwd();
const FIXTURES_PATH = path.join(CWD, 'test', 'fixture', 'js');
const FIXTURES_HTTP = path.join(CWD, 'test', 'fixture', 'http');
const UPLOAD_DIR = path.join(CWD, 'test', 'tmp');

function randomPort(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

beforeEach(() => {
  server = http.createServer();
});

afterEach(
  () =>
    new Promise((resolve) => {
      server.close(() => {
        server = null;
        resolve();
      });
      // if (server.listening) {
      //   server.close(() => {
      //     server = null;
      //     resolve();
      //   });
      // } else {
      //   resolve();
      // }
    }),
);

test('fixtures', (done) => {
  server.listen(PORT, findFixtures);

  function findFixtures() {
    const results = fs
      .readdirSync(FIXTURES_PATH)
      // .filter((x) => /workarounds/.test(x))
      .filter((x) => /\.js$/.test(x))
      .reduce((acc, fp) => {
        const group = path.basename(fp, '.js');
        const filepath = path.join(FIXTURES_PATH, fp);
        const mod = require(filepath);

        Object.keys(mod).forEach((k) => {
          Object.keys(mod[k]).forEach((_fixture) => {
            acc.push({
              fixture: mod[k],
              name: path.join(group, k),
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
        assert.strictEqual(parsedPart.type, expectedPart.type);
        assert.strictEqual(parsedPart.name, expectedPart.name);

        if (parsedPart.type === 'file') {
          const file = parsedPart.value;
          assert.strictEqual(
            file.originalFilename,
            expectedPart.originalFilename,
          );

          if (expectedPart.sha1) {
            assert.strictEqual(
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
        multiples: true,
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
        .on('error', (er) => {
          callback(er);
          // done(er);
        })
        .on('fileBegin', (name, value) => {
          parts.push({ type: 'file', name, value });
        })
        .on('field', (name, value) => {
          parts.push({ type: 'field', name, value });
        })
        .on('end', () => {
          res.end();
          callback(null, parts);
          done();
        });
    });

    const socket = net.createConnection(PORT);
    const fixturePath = path.join(FIXTURES_HTTP, fixtureName);
    const file = fs.createReadStream(fixturePath);

    file.pipe(socket, { end: false });

    socket.on('data', () => {
      socket.end();
    });
  }
});
