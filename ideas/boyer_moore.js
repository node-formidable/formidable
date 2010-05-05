exports.indexOf = function(needle, haystack) {
  var scan = 0
    , bad_char_skip = new Buffer(255);

  if (needle.length == 0 || !haystack || !needle) {
    return null;
  }

  for (scan = 0; scan <= 255; scan = scan + 1) {
    bad_char_skip[scan] = needle.length;
  }

  p(bad_char_skip);
};

return;