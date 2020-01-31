'use strict';

const File = require('./File');
const Formidable = require('./Formidable');

const JSONParser = require('./parsers/JSON');
const DummyParser = require('./parsers/Dummy');
const MultipartParser = require('./parsers/Multipart');
const OctetStreamParser = require('./parsers/OctetStream');
const QuerystringParser = require('./parsers/Querystring');

// make it available without requiring the `new` keyword
// if you want it access `const formidable.IncomingForm` as v1
const formidable = (...args) => new Formidable(...args);

module.exports = Object.assign(formidable, {
  File,
  Formidable,
  formidable,

  // alias
  IncomingForm: Formidable,

  // parsers
  JSONParser,
  DummyParser,
  MultipartParser,
  OctetStreamParser,
  QuerystringParser,

  // typo aliases
  OctetstreamParser: OctetStreamParser,
  QueryStringParser: QuerystringParser,
});
