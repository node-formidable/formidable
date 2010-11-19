if (global.GENTLY) require = GENTLY.hijack(require);

var util = require('./util'),
    fs = require('fs'),
    EventEmitter = require('events').EventEmitter;

function File(properties) {
  EventEmitter.call(this);

  this.length = 0;
  this.path = null;
  this.filename = null;
  this.mime = null;

  for (var key in properties) {
    this[key] = properties[key];
  }
}
module.exports = File;
util.inherits(File, EventEmitter);

File.prototype.open = function(fallbackPath) {
  var stream = fs.createWriteStream(this.path);
  // no need to publish the stream
  Object.defineProperty(this, '_writeStream', {value: stream});
};

File.prototype.write = function(buffer, cb) {
  var self = this;
  this._writeStream.write(buffer, function() {
    self.length += buffer.length;
    self.emit('progress', self.length);
    cb();
  });
};

File.prototype.end = function(cb) {
  var self = this;
  this._writeStream.end(function() {
    self.emit('end');
    cb();
  });
};
