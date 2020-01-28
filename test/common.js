/* eslint-disable global-require */
/* eslint-disable import/no-dynamic-require */

'use strict';

const path = require('path');

const root = path.dirname(__dirname);
exports.dir = {
  root,
  lib: path.join(root, 'src'),
  fixture: path.join(root, 'test', 'fixture'),
  tmp: path.join(root, 'test', 'tmp'),
};

exports.port = 13532;

exports.formidable = require('../src/index');
exports.assert = require('assert');

exports.require = (x) => require(path.join(exports.dir.lib, x));
