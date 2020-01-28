/* eslint-disable global-require */
/* eslint-disable import/no-dynamic-require */

'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const net = require('net');
const assert = require('assert');
const findit = require('findit');
const hashish = require('hashish');

const common = require('../common');
const Formidable = require('../../src/index');

const server = http.createServer();
server.listen(common.port, findFixtures);

function findFixtures() {
  const fixtures = [];
  findit.sync(path.join(common.dir.fixture, 'js')).forEach((jsPath) => {
    if (!/\.js$/.test(jsPath) || /workarounds/.test(jsPath)) return;

    const group = path.basename(jsPath, '.js');
    hashish.forEach(require(jsPath), (fixture, name) => {
      fixtures.push({
        name: `${group}/${name}`,
        fixture,
      });
    });
  });

  testNext(fixtures);
}

function testNext(fixtures) {
  let fixture = fixtures.shift();
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

    fixture.forEach((expectedPart, i) => {
      const parsedPart = parts[i];
      assert.equal(parsedPart.type, expectedPart.type);
      assert.equal(parsedPart.name, expectedPart.name);

      if (parsedPart.type === 'file') {
        const file = parsedPart.value;
        assert.equal(file.name, expectedPart.filename);
        if (expectedPart.sha1) assert.equal(file.hash, expectedPart.sha1);
      }
    });

    testNext(fixtures);
  });
}

function uploadFixture(fixtureName, cb) {
  server.once('request', (req, res) => {
    const form = new Formidable();
    form.uploadDir = common.dir.tmp;
    form.hash = 'sha1';
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

  const socket = net.createConnection(common.port);
  const fixturePath = path.join(common.dir.fixture, 'http', fixtureName);
  const file = fs.createReadStream(fixturePath);

  file.pipe(socket, { end: false });
  socket.on('data', () => {
    socket.end();
  });
}
