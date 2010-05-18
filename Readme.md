# Formidable

## Purpose

A node.js module for dealing with web forms.

## Features

* Fast, non-buffering multipart parser
* Automatically writing file uploads to disk
* Low memory footprint
* Graceful error handling

### Todo

* Support for form/urlencoded
* Limit buffer size for fields
* formidable.OutgoingForm

## Example

Parse an incoming file upload.

    var formidable = require('formidable')
      , http = require('http')
      , sys = require('sys')
      , form = new formidable.IncomingForm();
    
    http.createServer(function(req, res) {
      if (req.url == '/') {
        res.writeHead(200, {'content-type': 'text/html'});
        res.end
          ( '<form action="/upload" enctype="multipart/form-data" method="post">'
          + '<input type="text" name="title"><br>'
          + '<input type="file" name="upload"><br>'
          + '<input type="submit" value="Upload">'
          + '</form>'
          );
      ) else if (req.url == '/upload' && req.method.toLowerCase() == 'post') {
        form.parse(req, function(fields, files) {
          res.writeHead(200, {'content-type': 'text/plain'});
          res.write('received upload:\n\n');
          res.end(sys.inspect({fields: fields, files: files}));
        });
      }
    });

## API

### formdiable.IncomingForm

#### new formdiable.IncomingForm()

Creates a new incoming form.

#### incomingForm.encoding = 'utf-8'

The encoding to use for incoming form fields.

#### incomingForm.uploadDir = '/tmp'

The directory for placing file uploads in. You can later on move them using `fs.rename()`.

#### incomingForm.type

Either 'multipart' or 'urlencoded' depending on the incoming request.

#### incomingForm.bytesReceived

The amount of bytes received for this form so far. Useful for rolling your own upload progress bar.

#### incomingForm.bytesExpected

The expected number of bytes in this form.

#### incomingForm.parse(request, [cb])

Parses an incoming node.js `request` containing form data. If `cb` is provided, all fields an files are collected and passed to the callback:

    incomingForm.parse(req, function(err, fields, files) {
      // ...
    });

#### incomingForm.onPart(part)

You may overwrite this method if you are interested in directly accessing the multipart stream. Doing so will disable any `'field'` / `'file'` events  processing which would occur otherwise, making you fully responsible for handling the processing.

    incomingForm.onPart = function(part) {
      part.addListener('data', function() {
        // ...
      });
    }

Check the code in this method for further inspiration.

#### Event: 'field' (name, value)

Emitted whenever a field / value pair has been received.

#### Event: 'file' (name, file)

Emitted whenever a field / file pair has been received. `file` is a JS object with the following properties:

    { path: 'the path in the uploadDir this file was written to'
    , filename: 'the name this file had on the computer of the uploader'
    , mime: 'the mime type specified by the user agent of the uploader'
    }

#### Event: 'error' (err)

Emitted when there is an error processing the incoming form. A request that experiences an error is automatically paused, you will have to manually call `request.resume()` if you want the request to continue firing `'data'` events.

#### Event: 'end' ()

Emitted when the entire request has been received, and all contained files have finished flushing to disk. This is a great place for you to send your response.

## License

Formidable is licensed under the MIT license.

## Credits

* [Ryan Dahl](http://twitter.com/ryah) for his work on [http-parser](http://github.com/ry/http-parser) which heavily inspired multipart_parser.js
