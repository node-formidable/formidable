'use strict';

const File = require('./File');
const IncomingForm = require('./IncomingForm');

const JSONParser = require('./parsers/JSON');
const DummyParser = require('./parsers/Dummy');
const MultipartParser = require('./parsers/Multipart');
const OctetStreamParser = require('./parsers/OctetStream');
const QuerystringParser = require('./parsers/Querystring');

// make it available without requiring the `new` keyword
// if you want it access `const formidable.IncomingForm` as v1
const formidable = (...args) => new IncomingForm(...args);

module.exports = Object.assign(formidable, {
  IncomingForm,
  File,
  formidable,

  // alias
  Formidable: IncomingForm,

  // parsers
  JSONParser,
  DummyParser,
  MultipartParser,
  OctetStreamParser,
  QuerystringParser,
});
