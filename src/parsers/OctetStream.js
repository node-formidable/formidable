'use strict';

const { PassThrough } = require('stream');

class OctetStreamParser extends PassThrough {}

module.exports = OctetStreamParser;
