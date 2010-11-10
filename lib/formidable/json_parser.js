if (global.GENTLY) require = GENTLY.hijack(require);

// This is a buffering parser, not quite as nice as the multipart one.
function JSONParser() {
  this.buffer = [];
};
exports.JSONParser = JSONParser;

JSONParser.prototype.write = function(buffer) {
  this.buffer.push(buffer.toString('ascii'));
  return buffer.length;
};

JSONParser.prototype.end = function() {
  try {
    // N.B. better to use, say, kriszyp's commonjs-utils/json-ext parser
    var fields = JSON.parse(this.buffer.join(''));
    for (var field in fields) {
      this.onField(field, fields[field]);
    }
  } catch (err) {
  }
  this.buffer = '';

  this.onEnd();
};
