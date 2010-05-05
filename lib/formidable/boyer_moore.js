var Buffer = require('buffer').Buffer;

// Based on: http://en.wikipedia.org/wiki/Boyer-Moore-Horspool_algorithm
exports.indexOf = function(needle, haystack) {
  var scan = 0
    , bad_char_skip = new Buffer(255)
    , offset = 0;

  if (needle.length == 0 || !haystack || !needle) {
    return null;
  }

  for (scan = 0; scan <= 255; scan = scan + 1) {
    bad_char_skip[scan] = needle.length;
  }

  var last = needle.length - 1;
  for (scan = 0; scan < last; scan = scan + 1) {
    bad_char_skip[needle[scan]] = last - scan;
  }

  var hlen = haystack.length;
  while (hlen >= needle.length) {
    for (scan = last; haystack[scan+offset] == needle[scan]; scan = scan - 1) {
      if (scan == 0) {
        return offset;
      }
    }

    hlen -= bad_char_skip[haystack[last+offset]];
    offset += bad_char_skip[haystack[last+offset]];
  }
};