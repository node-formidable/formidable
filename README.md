# Formidable

[![Build Status](https://secure.travis-ci.org/superjoe30/node-formidable.png?branch=master)](http://travis-ci.org/superjoe30/node-formidable)

## Purpose

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
npm install --save formidable
```

## Example

Parse an incoming file upload.

```js
var formidable = require('formidable'),
    http = require('http'),
    util = require('util');

http.createServer(function(req, res) {
  if (req.url == '/upload' && req.method.toLowerCase() == 'post') {
    // parse a file upload
    var form = new formidable.IncomingForm();

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

### Formidable.IncomingForm
```js
var form = new formidable.IncomingForm()
```
Creates a new incoming form.

```js
form.encoding = 'utf-8';
```
Sets encoding for incoming form fields.

```js
form.uploadDir = process.env.TMP || process.env.TMPDIR || process.env.TEMP || '/tmp' || process.cwd();
```
The directory for placing file uploads in. You can move them later on using
`fs.rename()`. The default directory is picked at module load time depending on
the first existing directory from those listed above.

```js
form.keepExtensions = false;
```
If you want the files written to `form.uploadDir` to include the extensions of the original files, set this property to `true`.

```js
form.type
```
Either 'multipart' or 'urlencoded' depending on the incoming request.

```js
form.maxFieldsSize = 2 * 1024 * 1024;
```
Limits the amount of memory a field (not file) can allocate in bytes.
If this value is exceeded, an `'error'` event is emitted. The default
size is 2MB.

```js
form.maxFields = 0;
```
Limits the number of fields that the querystring parser will decode. Defaults
to 0 (unlimited).

```js
form.hash = false;
```
If you want checksums calculated for incoming files, set this to either `'sha1'` or `'md5'`.

```js
form.bytesReceived
```
The amount of bytes received for this form so far.

```js
form.bytesExpected
```
The expected number of bytes in this form.

```js
form.parse(request, [cb]);
```
Parses an incoming node.js `request` containing form data. If `cb` is provided, all fields an files are collected and passed to the callback:


```js
form.parse(req, function(err, fields, files) {
  // ...
});

form.onPart(part);
```
You may overwrite this method if you are interested in directly accessing the multipart stream. Doing so will disable any `'field'` / `'file'` events  processing which would occur otherwise, making you fully responsible for handling the processing.

```js
form.onPart = function(part) {
  part.addListener('data', function() {
    // ...
  });
}
```
If you want to use formidable to only handle certain parts for you, you can do so:
```js
form.onPart = function(part) {
  if (!part.filename) {
    // let formidable handle all non-file parts
    form.handlePart(part);
  }
}
```
Check the code in this method for further inspiration.


### Formidable.File
```js
file.size = 0
```
The size of the uploaded file in bytes. If the file is still being uploaded (see `'fileBegin'` event), this property says how many bytes of the file have been written to disk yet.
```js
file.path = null
```
The path this file is being written to. You can modify this in the `'fileBegin'` event in
case you are unhappy with the way formidable generates a temporary path for your files.
```js
file.name = null
```
The name this file had according to the uploading client.
```js
file.type = null
```
The mime type of this file, according to the uploading client.
```js
file.lastModifiedDate = null
```
A date object (or `null`) containing the time this file was last written to. Mostly
here for compatibility with the [W3C File API Draft](http://dev.w3.org/2006/webapi/FileAPI/).
```js
file.hash = null
```
If hash calculation was set, you can read the hex digest out of this var.

#### Formidable.File#toJSON()

  This method returns a JSON-representation of the file, allowing you to
  `JSON.stringify()` the file which is useful for logging and responding
  to requests.

### Events


#### 'progress'
```js
form.on('progress', function(bytesReceived, bytesExpected) {
});
```
Emitted after each incoming chunk of data that has been parsed. Can be used to roll your own progress bar.



#### 'field'
```js
form.on('field', function(name, value) {
});
```

#### 'fileBegin'

Emitted whenever a field / value pair has been received.
```js
form.on('fileBegin', function(name, file) {
});
```

#### 'file'

Emitted whenever a new file is detected in the upload stream. Use this even if
you want to stream the file to somewhere else while buffering the upload on
the file system.

Emitted whenever a field / file pair has been received. `file` is an instance of `File`.
```js
form.on('file', function(name, file) {
});
```

#### 'error'

Emitted when there is an error processing the incoming form. A request that experiences an error is automatically paused, you will have to manually call `request.resume()` if you want the request to continue firing `'data'` events.
```js
form.on('error', function(err) {
});
```

#### 'aborted'


Emitted when the request was aborted by the user. Right now this can be due to a 'timeout' or 'close' event on the socket. In the future there will be a separate 'timeout' event (needs a change in the node core).
```js
form.on('aborted', function() {
});
```

##### 'end'
```js
form.on('end', function() {
});
```
Emitted when the entire request has been received, and all contained files have finished flushing to disk. This is a great place for you to send your response.
