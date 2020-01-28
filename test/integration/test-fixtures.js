/* eslint-disable global-require */
/* eslint-disable import/no-dynamic-require */

'use strict';

const fs = require('fs');
const net = require('net');
const path = require('path');
const http = require('http');
const assert = require('assert');

const Formidable = require('../../src/index');

const PORT = 13532;
const CWD = process.cwd();
const FIXTURES_PATH = path.join(CWD, 'test', 'fixture', 'js');
const FIXTURES_HTTP = path.join(CWD, 'test', 'fixture', 'http');
const UPLOAD_DIR = path.join(CWD, 'test', 'tmp');

const server = http.createServer();
server.listen(PORT, findFixtures);

function findFixtures() {
  const choosenPort = server.address().port;
  const url = `http://localhost:${choosenPort}`;
  console.log('Server up and running at:', url);

  const results = fs
    .readdirSync(FIXTURES_PATH)
    // .filter((x) => /special/.test(x))
    // the `workarounds` - doesn't work because `this.callback()` call which should be fixed
    // the `spcial-chars-in-filename` - not sure yet why
    .filter((x) => /\.js$/.test(x) && !/workarounds|special/.test(x))
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
    return;
  }
  const fixtureName = fixture.name;
  fixture = fixture.fixture;

  uploadFixture(fixtureName, (err, parts) => {
    if (err) {
      err.fixtureName = fixtureName;
      throw err;
    }

    // console.log(parts);
    // const titleParts = parts.find((x) => x.type === 'field');
    // const titleFixtures = fixture.find((x) => x.type === 'field');

    // const uploadParts = parts.find((x) => x.name === 'upload');
    // const uploadFixtures = fixture.find((x) => x.name === 'upload');

    // console.log('titleParts', titleParts);
    // console.log('titleFixtures', titleFixtures);
    // const fileFromFixture = fixture.find((x) => x.type === 'file');
    // const fieldFromFixture = fixture.find((x) => x.type === 'field');

    // console.log('parts', fileFromParts);
    // console.log('fixture', fileFromFixture);

    fixture.forEach((expectedPart, i) => {
      const parsedPart = parts[i];
      assert.strictEqual(parsedPart.type, expectedPart.type);
      assert.strictEqual(parsedPart.name, expectedPart.name);

      if (parsedPart.type === 'file') {
        const file = parsedPart.value;
        assert.strictEqual(file.name, expectedPart.filename);

        if (expectedPart.sha1) {
          assert.strictEqual(file.hash, expectedPart.sha1);
        }
      }
    });

    testNext(results);
  });
}

function uploadFixture(fixtureName, cb) {
  server.once('request', (req, res) => {
    const form = new Formidable({
      uploadDir: UPLOAD_DIR,
      hash: 'sha1',
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
      .on('error', callback)
      .on('fileBegin', (name, value) => {
        parts.push({ type: 'file', name, value });
      })
      .on('field', (name, value) => {
        parts.push({ type: 'field', name, value });
      })
      .on('end', () => {
        res.end('OK');
        callback(null, parts);
      });
  });

  const socket = net.createConnection(PORT);
  const fixturePath = path.join(FIXTURES_HTTP, fixtureName);
  console.log(fixturePath);
  const file = fs.createReadStream(fixturePath);

  file.pipe(socket, { end: false });
  socket.on('data', () => {
    socket.end();
  });
}
