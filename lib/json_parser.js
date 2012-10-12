if (global.GENTLY) require = GENTLY.hijack(require);

// This is a buffering parser, not quite as nice as the multipart one.
// If I find time I'll rewrite this to be fully streaming as well
function JSONParser() {
  this.buffer = '';
};
exports.JSONParser = JSONParser;

JSONParser.prototype.write = function(buffer) {
  this.buffer += buffer;
  return buffer.length;
};

JSONParser.prototype.end = function() {
  var fields = JSON.parse(this.buffer.toString('utf8'));
  for (var field in fields) {
    // JSON is hierarchical, no clue about recursive
    this.onField(field, fields[field]);
  }
  this.buffer = '';

  this.onEnd();
};
