if (global.GENTLY) require = GENTLY.hijack(require);

var util = require('./util'),
    WriteStream = require('fs').WriteStream,
    EventEmitter = require('events').EventEmitter;

function File(properties) {
  EventEmitter.call(this);

  this.length = 0;
  this.path = null;
  this.filename = null;
  this.mime = null;

  this._writeStream = null;

  for (var key in properties) {
    this[key] = properties[key];
  }
}
module.exports = File;
util.inherits(File, EventEmitter);

File.prototype.open = function() {
  this._writeStream = new WriteStream(this.path);
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
