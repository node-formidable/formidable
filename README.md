[![Build Status](https://travis-ci.org/superjoe30/node-multiparty.png?branch=master)](https://travis-ci.org/superjoe30/node-multiparty)
# multiparty

Parse http requests with content-type `multipart/form-data`, also known as file uploads.

### Why the fork?

 * This module uses the Node.js v0.10 streams properly. It will not create a
   temp file for you. You could easily stream to S3 using
   [knox](https://github.com/LearnBoost/knox), for [example]().
 * Less bugs. This code is simpler and has cleaner tests, and does not try to
   do anything beyond multipart stream parsing.
 * Fast.

## Installation

```
npm install --save multiparty
```

## Usage

Parse an incoming `multipart/form-data` request.

```js
var multiparty = require('multiparty'),
    http = require('http'),
    util = require('util');

http.createServer(function(req, res) {
  if (req.url == '/upload' && req.method.toLowerCase() == 'post') {
    // parse a file upload
    var form = new multiparty.Form();

    form.parse(req, function(err, fields, files) {
      res.writeHead(200, {'content-type': 'text/plain'});
      res.write('received upload:\n\n');
      res.end(util.inspect({fields: fields, files: files}));
    });

    return;
  }

  // show a file upload form
  res.writeHead(200, {'content-type': 'text/html'});
  res.end(
    '<form action="/upload" enctype="multipart/form-data" method="post">'+
    '<input type="text" name="title"><br>'+
    '<input type="file" name="upload" multiple="multiple"><br>'+
    '<input type="submit" value="Upload">'+
    '</form>'
  );
}).listen(8080);
```

## API

### multiparty.Form
```js
var form = new multiparty.Form(options)
```
Creates a new form. Options:

 * `encoding` - sets encoding for the incoming form fields. Defaults to `utf8`.
 * `uploadDir` - the directory for placing file uploads in. You can move them
   later using `fs.rename()`. Defaults to `os.tmpDir()`.
 * `maxFieldSize` - Limits the amount of memory a field (not a file) can
   allocate in bytes. If this value is exceeded, an `error` event is emitted.
   The default size is 2MB.
 * `maxFields` - Limits the number of fields that will be parsed before
   emitting an `error` event. A file counts as a field in this case.
   Defaults to 1000.
 * `hash` - If you want checksums calculated for incoming files, set this to
   either `sha1` or `md5`. Defaults to off.
 * `autoFields` - Enables `field` events. This is automatically set to `true`
   if you add a `field` listener.
 * `autoFiles` - Enables `file` events. This is automatically set to `true`
   if you add a `file` listener.

#### form.bytesReceived

The amount of bytes received for this form so far.

#### form.bytesExpected

The expected number of bytes in this form.

#### form.parse(request, [cb]);

Parses an incoming node.js `request` containing form data. If `cb` is
provided, `autoFields` and `autoFiles` are set to `true` and all fields and
files are collected and passed to the callback:

```js
form.parse(req, function(err, fields, files) {
  // ...
});

### Events

#### 'error' (err)

You definitely want to handle this event. If not your server *will* crash when
users submit bogus multipart requests!

#### 'part' (fileStream)

Emitted when a part is encountered in the request. `fileStream` is a streams2-compatible
`ReadableStream`. It also has the following properties:

 * `headers` - the headers for this part
 * `name` - the field name for this part
 * `filename` - only if the part is an incoming file

 By default this is the only data event emitted. If you want multiparty to do
 more work for you, pass a callback to `form.parse()` or set `form.autoFields` and/or
 `form.autoFiles` to `true`.

#### 'aborted'

Emitted when the request is aborted. This event will be followed shortly
by an `error` event. In practice you do not need to handle this event.

#### 'progress' (bytesReceived, bytesExpected)

#### 'close'

Emitted after all parts have been parsed and emitted. Not emitted if an `error`
event is emitted. This is typically when you would send your response.

#### 'file' (name, file)

**By default multiparty will not touch your hard drive.** But if you add this
listener, multiparty automatically sets `form.autoFiles` to `true` and will
stream uploads to disk for you. 

 * `name` - the field name for this file
 * `file` - an object with these properties:
   - `originalFilename` - the filename that the user reports for the file
   - `path` - the absolute path of the uploaded file on disk
   - `headers - the HTTP headers that were sent along with this file

If you set the `form.hash` option, then `file` will also contain a `hash`
property which is the checksum of the file.

#### 'field' (name, value)

 * `name` - field name
 * `value` - string field value

