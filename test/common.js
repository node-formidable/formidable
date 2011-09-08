var mysql = require('..');
var path = require('path');

var root = path.join(__dirname, '../');
exports.dir = {
  root: root,
  lib: root + '/lib',
  fixture: root + '/test/fixture',
};

exports.fastOrSlow = require('fast-or-slow');
