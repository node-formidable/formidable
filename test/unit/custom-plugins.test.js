/* eslint-disable no-underscore-dangle */

import { join } from 'node:path';

import Koa from 'koa';
import request from 'supertest';

import { formidable, json, octetstream, multipart, errors } from '../../src/index.js';

function createServer(options, handler) {
  const app = new Koa();

  app.use(async (ctx, next) => {
    const form = formidable(options);
    await handler(ctx, form);
    await next();
  });

  return app;
}

function fromFixtures(...args) {
  return join(process.cwd(), 'test', 'fixture', ...args);
}

// function makeRequest(server, options) {
//   server.listen(0, () => {
//     const chosenPort = server.address().port;
//     const url = `http://localhost:${chosenPort}`;

//     const method = 'POST';

//     const opts = {
//       ...options,
//       port: chosenPort,
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

test('should call 3 custom and 1 builtin plugins, when .parse() is called', async () => {
  const server = createServer({ enabledPlugins: [json] }, (ctx, form) => {
    form.on('plugin', () => {
      ctx.__pluginsCount = ctx.__pluginsCount || 0;
      ctx.__pluginsCount += 1;
    });
    form.on('end', () => {
      ctx.__ends = 1;
      expect(ctx.__customPlugin1).toBe(111);
      expect(ctx.__customPlugin2).toBe(222);
      expect(ctx.__customPlugin3).toBe(333);
      ctx.__ends = 2;

      const len = form._plugins.length;
      expect(len).toBe(4);
    });

    form.use(() => {
      ctx.__customPlugin1 = 111;
    });
    form.use(() => {
      ctx.__customPlugin2 = 222;
    });
    form.use(() => {
      ctx.__customPlugin3 = 333;
    });

    form.parse(ctx.req, (err, fields) => {
      expect(fields.qux).toBe('zaz');
      expect(fields.a).toBe('bbb');
      expect(ctx.__pluginsCount).toBe(4);
    });
  });

  await new Promise((resolve, reject) => {
    request(server.callback())
      .post('/')
      .type('application/json')
      .send({ qux: 'zaz', a: 'bbb' })
      .end((err) => (err ? reject(err) : resolve()));
  });
});

test('.parse throw error when some plugin fail', async () => {
  const server = createServer(
    { enabledPlugins: [octetstream, json] },
    async (ctx, form) => {
      // const failedIsOkay = false;
      // ! not emitted?
      // form.on('file', () => {
      //   ctx.__onFileCalled = ctx.__onFileCalled || 0;
      //   ctx.__onFileCalled += 1;
      // });

      form.on('plugin', () => {
        ctx.__pluginsCount = ctx.__pluginsCount || 0;
        ctx.__pluginsCount += 1;
      });

      form.once('error', () => {
        throw new Error('error event should not be fired when plugin throw');
      });

      form.use(() => {
        throw new Error('custom plugin err');
      });

      let res = null;
      try {
        await form.parse(ctx.req);
      } catch (err) {
        expect(err.code).toBe(errors.pluginFailed);
        expect(err.httpCode).toBe(500);

        expect(form._plugins.length).toBe(3);
        expect(ctx.__pluginsCount).toBe(2);
        expect(ctx.__pluginsResults).toBe(undefined);

        res = err;
      }

      if (!res) {
        throw new Error(
          '^ .parse should throw & be caught with the try/catch ^',
        );
      }
    },
  );

  return new Promise((resolve, reject) => {
    request(server.callback())
      .post('/')
      .type('application/octet-stream')
      .attach('bin', fromFixtures('file', 'binaryfile.tar.gz'))
      .end((err) => {
        if (err.code === 'ECONNRESET') {
          resolve();
        } else {
          reject(err);
        }
      });
  });
});

test('multipart plugin fire `error` event when malformed boundary', async () => {
  const server = createServer(
    { enabledPlugins: [json, multipart] },
    (ctx, form) => {
      let failedIsOkay = false;

      form.once('error', (err) => {
        expect(form._plugins.length).toBe(2);
        expect(err).toBeTruthy();
        expect(err.message).toMatch(/bad content-type header/);
        expect(err.message).toMatch(/no multipart boundary/);
        failedIsOkay = true;
      });

      // Should never be called when `error`
      form.on('end', () => {
        throw new Error('should not fire `end` event when error');
      });

      form.parse(ctx.req, (err) => {
        expect(err).toBeTruthy();
        expect(failedIsOkay).toBe(true);
      });
    },
  );

  // 'Content-Length': 1111111,
  // 'content-Disposition': 'form-data; bouZndary=',
  // 'Content-Type': 'multipart/form-data; bouZndary=',
  await new Promise((resolve, reject) => {
    request(server.callback())
      .post('/')
      .type('multipart/form-data')
      .set('Content-Length', 11111111)
      .set('Content-Disposition', 'form-data; bouZndary=')
      .set('Content-Type', 'multipart/form-data; bouZndary=')
      .end((err) => (err ? reject(err) : resolve()));
  });
});

test('formidable() throw if not at least 1 built-in plugin in options.enabledPlugins', () => {
  try {
    formidable({ enabledPlugins: [] });
  } catch (err) {
    expect(err).toBeTruthy();
    expect(err.message).toMatch(/expect at least 1 enabled builtin/);
  }
});
