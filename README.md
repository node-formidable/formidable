<p align="center">
  <img alt="node formidable logo" src="./logo.png" />
</p>

# formidable

> A Node.js module for parsing form data, especially file uploads.

[![Code style][codestyle-img]][codestyle-url]
[![npm version][npmv-img]][npmv-url]
[![build status][build-img]][build-url]
[![chat on gitter][chat-img]][chat-url]
[![MIT license][license-img]][license-url]

## Status: Maintained

This module was initially developed by [**@felixge**](https://github.com/felixge) for [Transloadit](http://transloadit.com/), a service focused on uploading and encoding images and videos. It has been battle-tested against hundreds of GBs of file uploads from a large variety of clients and is considered production-ready and is used in production for years.

Currently, we are few maintainers trying to deal with it. :) More contributors are always welcome! :heart:
Jump on [issue #412](https://github.com/felixge/node-formidable/issues/412) if you are interested.

_**Note:** Master is a "development" branch - try it with `npm i formidable@canary`.
Do not expect (for now) things from it to be inside the`latest`"dist-tag" in the Npm.
The`formidable@latest`is the`v1.2.1` version and probably it will be the last`v1` release!_

_**Note: v2 is coming soon!**_

## Highlights

- Fast (~900-2500 mb/sec), streaming multipart parser
- Automatically writing file uploads to disk
- Low memory footprint
- Graceful error handling
- Very high test coverage

## Install

```sh
npm install formidable
# or the development version
npm install formidable@canary
```

or with Yarn v1/v2

```sh
yarn add formidable
# or the development version
yarn add formidable@canary
```

This is a low-level package, and if you're using a high-level framework it may already be included.

However, [Express v4](http://expressjs.com) does not include any multipart handling, nor does [body-parser](https://github.com/expressjs/body-parser).

For `koa` there is [koa-better-body](https://ghub.now.sh/koa-better-body)
which can handle ANY type of body / form-data - JSON, urlencoded, multpart and so on.
A new major release is coming there too.

## Example

Parse an incoming file upload.

```js
const http = require('http');
const util = require('util');
const formidable = require('formidable');

http
  .createServer((req, res) => {
    if (req.url === '/upload' && req.method.toLowerCase() === 'post') {
      // parse a file upload
      const form = formidable();

      form.parse(req, (err, fields, files) => {
        res.writeHead(200, { 'content-type': 'text/plain' });
        res.write('received upload:\n\n');
        res.end(util.inspect({ fields: fields, files: files }));
      });

      return;
    }

    // show a file upload form
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end(`
      <form action="/upload" enctype="multipart/form-data" method="post">
        <input type="text" name="title" /><br/>
        <input type="file" name="upload" multiple="multiple" /><br/>
        <input type="submit" value="Upload" />
      </form>
    `);
  })
  .listen(8080, () => {
    console.log('Server listening on http://localhost:8080/ ...');
  });
```

## Benchmarks

The benchmark is quite old, from the old codebase. But maybe quite true though.
Previously the numbers was around ~500 mb/sec. Currently with moving to
the new Node.js Streams API it's faster. You can clearly see the differences
between the Node versions.

_Note: a lot better benchmarking could and should be done in future._

Benchmarked on 8GB RAM, Xeon X3440 (2.53 GHz, 4 cores, 8 threads)

```
~/github/node-formidable master
❯ nve --parallel 8 10 12 13 node benchmark/bench-multipart-parser.js

 ⬢  Node 8

1261.08 mb/sec

 ⬢  Node 10

1113.04 mb/sec

 ⬢  Node 12

2107.00 mb/sec

 ⬢  Node 13

2566.42 mb/sec
```

![benchmark January 29th, 2020](./benchmark/2020-01-29_xeon-x3440.png)

## API

### Formidable / IncomingForm

All shown are equivalent.

_Please pass [`options`](#options) to the function/constructor,
not by passing assigning them to the instance `form`_

```js
const formidable = require('formidable');
const form = formidable(options);

// or
const { formidable } = require('formidable');
const form = formidable(options);

// or
const { IncomingForm } = require('formidable');
const form = new IncomingForm(options);

// or
const { Formidable } = require('formidable');
const form = new Formidable(options);
```

### Options

See it's defaults in [src/Formidable.js](./src/Formidable.js#L14-L22) (the `DEFAULT_OPTIONS` constant).

- `options.encoding` **{string}** - default `'utf-8'`; sets encoding for incoming form fields,
- `options.uploadDir` **{string}** - default `os.tmpdir()`; the directory for placing file uploads in. You can move them later by using `fs.rename()`
- `options.keepExtensions` **{boolean}** - default `false`; to include the extensions of the original files or not
- `options.maxFieldsSize` **{number}** - default `20 * 1024 * 1024` (20mb); limit the amount of memory all fields together (except files) can allocate in bytes.
- `options.maxFieldsSize` **{number}** - default `200 * 1024 * 1024` (200mb); limit the size of uploaded file.
- `options.maxFields` **{number}** - default `1000`; limit the number of fields that the Querystring parser will decode, set 0 for unlimited
- `options.hash` **{boolean}** - default `false`; include checksums calculated for incoming files, set this to some hash algorithm, see [crypto.createHash](https://nodejs.org/api/crypto.html#crypto_crypto_createhash_algorithm_options) for available algorithms
- `options.multiples` **{boolean}** - default `false`; when you call the `.parse` method, the `files` argument (of the callback) will contain arrays of files for inputs which submit multiple files using the HTML5 `multiple` attribute. Also, the `fields` argument will contain arrays of values for fields that have names ending with '[]'.

_**Note:** If this value is exceeded, an `'error'` event is emitted._

```js
// The amount of bytes received for this form so far.
form.bytesReceived;
```

```js
// The expected number of bytes in this form.
form.bytesExpected;
```

### .parse(request, callback)

Parses an incoming Node.js `request` containing form data. If `callback` is provided, all fields and files are collected and passed to the callback:

```js
const formidable = require('formidable');

const form = formidable({ multiples: true, uploadDir: __dirname });

form.parse(req, (err, fields, files) => {
  console.log('fields:', fields);
  console.log('files:', files);
});
```

You may overwrite this method if you are interested in directly accessing the multipart stream. Doing so will disable any `'field'` / `'file'` events processing which would occur otherwise, making you fully responsible for handling the processing.

### form.onPart

If you want to use Formidable to only handle certain parts for you, you can do something similar.
Or see [#387](https://github.com/node-formidable/node-formidable/issues/387) for inspiration,
you can for example validate the mime-type.

```js
const form = formidable();

form.onPart = (part) => {
  part.on('data', (buffer) {
    // do whatever you want here
  });
};
```

For example, force Formidable to be used only on non-file "parts" (i.e., html fields)

```js
const form = formidable();

form.onPart = function(part) {
  // let formidable handle only non-file parts
  if (part.filename === '' || !part.mime) {
    // used internally, please do not override!
    form.handlePart(part);
  }
};
```

### File

```ts
export interface File {
  // The size of the uploaded file in bytes.
  // If the file is still being uploaded (see `'fileBegin'` event),
  // this property says how many bytes of the file have been written to disk yet.
  file.size: number;

  // The path this file is being written to. You can modify this in the `'fileBegin'` event in
  // case you are unhappy with the way formidable generates a temporary path for your files.
  file.path: string;

  // The name this file had according to the uploading client.
  file.name: string | null;

  // The mime type of this file, according to the uploading client.
  file.type: string | null;

  // A Date object (or `null`) containing the time this file was last written to.
  // Mostly here for compatibility with the [W3C File API Draft](http://dev.w3.org/2006/webapi/FileAPI/).
  file.lastModifiedDate: Date | null;

  // If hash calculation was set, you can read the hex digest out of this var.
  file.hash: string | 'sha1' | 'md5' | 'sha256' | null;
}
```

#### file.toJSON()

This method returns a JSON-representation of the file, allowing you to
`JSON.stringify()` the file which is useful for logging and responding
to requests.

### Events

#### `'progress'`

Emitted after each incoming chunk of data that has been parsed. Can be used to roll your own progress bar.

```js
form.on('progress', (bytesReceived, bytesExpected) => {});
```

#### `'field'`

Emitted whenever a field / value pair has been received.

```js
form.on('field', (name, value) => {});
```

#### `'fileBegin'`

Emitted whenever a new file is detected in the upload stream. Use this event if
you want to stream the file to somewhere else while buffering the upload on
the file system.

```js
form.on('fileBegin', (name, file) => {});
```

#### `'file'`

Emitted whenever a field / file pair has been received. `file` is an instance of `File`.

```js
form.on('file', (name, file) => {});
```

#### `'error'`

Emitted when there is an error processing the incoming form. A request that experiences an error is automatically paused, you will have to manually call `request.resume()` if you want the request to continue firing `'data'` events.

```js
form.on('error', (err) => {});
```

#### `'aborted'`

Emitted when the request was aborted by the user. Right now this can be due to a 'timeout' or 'close' event on the socket. After this event is emitted, an `error` event will follow. In the future there will be a separate 'timeout' event (needs a change in the node core).

```js
form.on('aborted', () => {});
```

#### `'end'`

Emitted when the entire request has been received, and all contained files have finished flushing to disk. This is a great place for you to send your response.

```js
form.on('end', () => {});
```

## License

Formidable is licensed under the [MIT License][license-url].

## Ports

- [multipart-parser](http://github.com/FooBarWidget/multipart-parser): a C++ parser based on formidable

## Credits

- [Ryan Dahl](http://twitter.com/ryah) for his work on [http-parser](http://github.com/ry/http-parser) which heavily inspired multipart_parser.js

<!-- badges -->

[codestyle-url]: https://github.com/airbnb/javascript
[codestyle-img]: https://badgen.net/badge/code%20style/airbnb%20%2B%20prettier/ff5a5f?icon=airbnb&cache=300
[build-img]: https://badgen.net/travis/node-formidable/node-formidable/master?label=build&icon=travis
[build-url]: https://travis-ci.org/node-formidable/node-formidable.svg?branch=master
[npmv-img]: https://badgen.net/npm/v/formidable?icon=npm
[npmv-url]: https://npmjs.com/package/formidable
[license-img]: https://badgen.net/npm/license/formidable
[license-url]: https://github.com/node-formidable/node-formidable/blob/master/LICENSE
[chat-img]: https://badgen.net/badge/chat/on%20gitter/46BC99?icon=gitter
[chat-url]: https://gitter.im/node-formidable/Lobby
