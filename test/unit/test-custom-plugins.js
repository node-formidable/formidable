/* eslint-disable no-underscore-dangle */

'use strict';

// ! TODO: doesn't actually pass, should switch the test runner first,
// ! before finishing the plugins tests

const http = require('http');
const assert = require('assert');
const test = require('utest');

const { formidable } = require('../../src/index');

function makeRequest(server) {
  server.listen(0, () => {
    const choosenPort = server.address().port;

    const request = http.request({
      port: choosenPort,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    request.write(JSON.stringify({ qux: 'zaz' }));
    request.end();
  });
}

function onDone({ server, form, req, res }) {
  form.parse(req, (err, fields) => {
    assert.strictEqual(fields.qux, 'zaz');

    setTimeout(() => {
      res.end();
      server.close();
    }, 200);
  });
}

test('custom plugins', {
  'should have 3 custom plugins, and all be called when .parse() is called': () => {
    const server = http.createServer((req, res) => {
      const form = formidable();

      form.on('pluginReturns', (results) => {
        assert.strictEqual(results.length, 3, 'three plugins should be called');
      });
      form.on('end', () => {
        assert.strictEqual(form.__customPlugin1, 111);
        assert.strictEqual(form.__customPlugin2, 222);
        assert.strictEqual(form.__customPlugin3, 333);
      });

      form.use((inst) => {
        const self = inst;
        self.__customPlugin1 = 111;
      });
      form.use((inst) => {
        const self = inst;
        self.__customPlugin2 = 222;
      });
      form.use((inst) => {
        const self = inst;
        self.__customPlugin3 = 333;
      });

      onDone({ server, form, req, res });
    });

    makeRequest(server);
  },

  'should emit `error` event when some plugin fail': () => {
    const server = http.createServer((req, res) => {
      const form = formidable();
      // console.log(form);

      form.once('error', (err) => {
        assert.strictEqual(
          err.message.includes('custom plugin err'),
          true,
          'should have error',
        );
        console.log('should print here!');
      });

      form.use(() => {
        console.log('should be called');
        throw new Error('custom plugin err');
      });

      onDone({ server, form, req, res });
    });

    makeRequest(server);
  },
});
