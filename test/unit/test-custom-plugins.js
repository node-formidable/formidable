/* eslint-disable no-underscore-dangle */

'use strict';

// ! TODO: doesn't actually pass, should switch the test runner first,
// ! before finishing the plugins tests

const fs = require('fs');
const path = require('path');
const http = require('http');
const { ClientRequest } = require('http');
const assert = require('assert');

// const request = require('request');
const test = require('utest');

const { formidable } = require('../../src/index');

function fromFixtures(...args) {
  return path.join(process.cwd(), 'test', 'fixture', ...args);
}

// function makeRequest(server, options) {
//   server.listen(0, () => {
//     const choosenPort = server.address().port;
//     const url = `http://localhost:${choosenPort}`;
//     console.log('Server up and running at:', url);

//     const method = 'POST';

//     const opts = {
//       ...options,
//       port: choosenPort,
//       url,
//       method,
//     };

//     return http.request(opts);
//   });
// }

// function onDone({ server, form, req, res }) {
//   form.parse(req, (err, fields) => {
//     assert.strictEqual(fields.qux, 'zaz');

//     setTimeout(() => {
//       res.end();
//       server.close();
//     }, 200);
//   });
// }

// ! tests

test('custom plugins', {
  'should call 3 custom and 1 builtin plugins, when .parse() is called': () => {
    const form = formidable({ enabledPlugins: ['json'] });

    form.on('pluginReturns', (results) => {
      assert.strictEqual(
        results.length,
        4,
        `4 plugins should be called, but: ${results.length}`,
      );
    });
    form.on('end', () => {
      assert.strictEqual(form.__customPlugin1, 111);
      assert.strictEqual(form.__customPlugin2, 222);
      assert.strictEqual(form.__customPlugin3, 333);
      const len = form._plugins.length;
      assert.strictEqual(len, 4, `3 custom + 1 builtin plugins, but: ${len}`);
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

    const req = new ClientRequest();
    req.headers = {
      'content-type': 'json',
      'content-length': 6,
    };
    form.parse(req, (err, fields) => {
      assert.strictEqual(fields.qux, 'zaz');
    });
    form.emit('field', 'qux', 'zaz');
    form.emit('end');
  },

  'should emit `error` event when some plugin fail': () => {
    const form = formidable({ enabledPlugins: ['octetstream'] });
    let cnt = 0;
    let onFileCalled = 0;
    let failedIsOkay = false;

    form.on('file', () => {
      onFileCalled += 1;
    });
    form.on('pluginReturn', () => {
      cnt += 1;
    });

    form.once('error', (err) => {
      assert(/custom pluginX err/i.test(err.message), 'should have error');

      const len = form._plugins.length;
      assert.strictEqual(len, 2, `should call only two plugins, but: ${len}`);

      assert.strictEqual(
        cnt,
        1,
        `should emit \`pluginReturn\` one time (because the second plugin errors), but: ${cnt}`,
      );

      assert.strictEqual(onFileCalled, 1, 'expect `file` event to be fired');

      failedIsOkay = true;
      assert.strictEqual(failedIsOkay, true, 'should `error` handler be ok');

      console.log('should print here!');
    });

    form.use(() => {
      console.log('should be called');
      throw new Error('custom plugin err');
    });

    const req = new ClientRequest();

    const reqStream = fs
      .createReadStream(fromFixtures('file', 'plain.txt'))
      .pipe(req);

    reqStream.headers = {
      'content-type': 'application/octet-stream',
    };
    form.parse(reqStream, () => {
      assert.strictEqual(failedIsOkay, true, 'should `error` handler be ok');

      // setTimeout(() => {
      //   res.end();
      //   server.close();
      // }, 300);
    });
  },

  'multipart plugin emit error when malformed boundary': () => {
    const server = http.createServer((req, res) => {
      const form = formidable({ enabledPlugins: ['multipart'] });
      let failedIsOkay = false;
      let errCount = 0;

      form.on('error', (err) => {
        errCount += 1;

        const plgLen = form._plugins.length;
        assert.strictEqual(
          plgLen,
          1,
          'should have only one (multipart) plugin',
        );

        assert(err, 'should throw error');
        assert(
          /bad content-type header, no multipart boundary/i.test(err.message),
          'expect at least 1 enabled plugin',
        );
        failedIsOkay = true;

        console.log('should be here');
      });

      // Should never be called when `error`
      form.on('end', () => {
        assert.strictEqual(failedIsOkay, true, 'should `error` handler be ok');
        failedIsOkay = 123;
      });

      form.parse(req, (err) => {
        assert(err, 'should have error in .parse() callback');
        assert.strictEqual(failedIsOkay, true, 'should `error` handler be ok');
        assert.strictEqual(errCount, 1, 'should fire `error` event once');

        setTimeout(() => {
          res.end();
          server.close();
        }, 300);
      });
    });

    server.listen(0, () => {
      const choosenPort = server.address().port;
      const url = `http://localhost:${choosenPort}`;
      console.log('Server up and running at:', url);

      const req = http.request({
        method: 'POST',
        port: choosenPort,
        headers: {
          'Content-Length': 1111111,
          'content-Disposition': 'form-data; bouZndary=',
          'Content-Type': 'multipart/form-data; bouZndary=',
        },
      });

      req.end();
    });
  },

  'should throw if not at least 1 builtin plugin in options.enabledPlugins': () => {
    try {
      formidable({ enabledPlugins: [] });
    } catch (err) {
      assert(err, 'should throw error');
      assert(
        /expect at least 1 enabled builtin/i.test(err.message),
        'expect at least 1 plugin in options.enabledPlugins',
      );
    }
  },
});
