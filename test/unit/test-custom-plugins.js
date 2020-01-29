/* eslint-disable no-underscore-dangle */

'use strict';

// ! TODO: doesn't actually pass, should switch the test runner first,
// ! before finishing the plugins tests

// const http = require('http');
const { ClientRequest } = require('http');
const assert = require('assert');
const test = require('utest');

const { formidable } = require('../../src/index');

// function makeRequest(server) {
//   server.listen(0, () => {
//     const choosenPort = server.address().port;

//     const request = http.request({
//       port: choosenPort,
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//     });

//     request.write(JSON.stringify({ qux: 'zaz' }));
//     request.end();
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
    form.parse(req);
    form.emit('field', 'qux', 'zaz');
    form.emit('end');
  },

  'should emit `error` event when some plugin fail': () => {
    const form = formidable({ enabledPlugins: ['json'] });
    let cnt = 0;

    form.on('pluginReturn', () => {
      cnt += 1;
    });

    form.once('error', (err) => {
      assert.strictEqual(
        err.message.includes('custom plugin err'),
        true,
        'should have error',
      );

      const len = form._plugins.length;
      assert.strictEqual(len, 2, `should call only two plugins, but: ${len}`);

      assert.strictEqual(
        cnt,
        1,
        `should emit \`pluginReturn\` one time (because the second plugin errors), but: ${cnt}`,
      );
      console.log('should print here!');
    });

    form.use(() => {
      console.log('should be called');
      throw new Error('custom plugin err');
    });

    const req = new ClientRequest();
    req.headers = {
      'content-type': 'json',
      'content-length': 6,
    };
    form.parse(req);
    form.emit('field', 'qux', 'zaz');
    form.emit('end');
  },

  // 'should emit `error` event when some plugin fail': () => {
  //   const server = http.createServer((req, res) => {
  //     const form = formidable();
  //     // console.log(form);

  //     form.once('error', (err) => {
  //       assert.strictEqual(
  //         err.message.includes('custom plugin err'),
  //         true,
  //         'should have error',
  //       );
  //       console.log('should print here!');
  //     });

  //     form.use(() => {
  //       console.log('should be called');
  //       throw new Error('custom plugin err');
  //     });

  //     // onDone({ server, form, req, res });
  //   });

  //   makeRequest(server);
  // },
});
