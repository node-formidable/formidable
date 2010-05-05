require('../common');
var boyerMoore = require('formidable/boyer_moore')
  , Buffer = require('buffer').Buffer
  , searchStr = 'ANPANMAN'
  , str = 'This is my funny '+searchStr+' containing string'
  , haystack = new Buffer(str.length)
  , needle = new Buffer(searchStr.length);

haystack.write(str, 'ascii', 0);
needle.write(searchStr, 'ascii', 0);

var offset = boyerMoore.indexOf(needle, haystack);
assert.equal(offset, 17)