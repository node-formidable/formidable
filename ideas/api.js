var formidable = require('formidable');

(new formidable.ServerRequest(req))
  .addListener('end', function(fields, files) {
    // handle files / files hashes
  });

// OR

(new formidable.ServerRequest)
  .fromNodeRequest(req)
  .addListener('file', function(file) {
    
  })
  .addListener('field', function(field) {
    
  })
  .addListener('error', function() {

  })
  .addListener('end', function() {
    
  });
