import Koa from 'koa';
import formidable from '../src/index.js';


const app = new Koa();

app.on('error', (err) => {
  console.error('server error', err);
});

app.use(async (ctx, next) => {
  if (ctx.url === '/api/upload' && ctx.method.toLowerCase() === 'post') {
    let i = 0;
    const form = formidable({
      keepExtensions: true,
      // must return absolute path
      filename: (part, $self) => {
        i += 1;
        return `${$self.uploadDir}/sasasa${i}`;
      },
    });

    // not very elegant, but that's for now if you don't want touse `koa-better-body`
    // or other middlewares.
    await new Promise((resolve, reject) => {
      form.parse(ctx.req, (err, fields, files) => {
        if (err) {
          reject(err);
          return;
        }

        ctx.set('Content-Type', 'application/json');
        ctx.status = 200;
        ctx.state = { fields, files };
        ctx.body = JSON.stringify(ctx.state, null, 2);
        resolve();
      });
    });
    await next();
    return;
  }

  // show a file upload form
  ctx.set('Content-Type', 'text/html');
  ctx.status = 200;
  ctx.body = `
    <h2>With <code>"koa"</code> npm package</h2>
    <form action="/api/upload" enctype="multipart/form-data" method="post">
    <div>Text field title: <input type="text" name="title" /></div>
    <div>File: <input type="file" name="koaFiles" multiple="multiple" /></div>
    <input type="submit" value="Upload" />
    </form>
  `;
});

app.use((ctx) => {
  console.log('The next middleware is called');
  console.log('Results:', ctx.state);
});

app.listen(3000, () => {
  console.log('Server listening on http://localhost:3000 ...');
});
