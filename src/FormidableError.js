/* eslint-disable no-plusplus */

let errorCodes = 0;
const missingPlugin = errorCodes++;
const pluginFunction = errorCodes++;
const aborted = errorCodes++;
const noParser = errorCodes++;
const uninitializedParser = errorCodes++;
const filenameNotString = errorCodes++;
const maxFieldsSizeExceeded = errorCodes++;
const maxFieldsExceeded = errorCodes++;
const smallerThanMinFileSize = errorCodes++;
const biggerThanMaxFileSize = errorCodes++;
const noEmptyFiles = errorCodes++;
const missingContentType = errorCodes++;
const malformedMultipart = errorCodes++;
const missingMultipartBoundary = errorCodes++;
const unknownTransferEncoding = errorCodes++;

const FormidableError = class extends Error {
  constructor(message, internalCode, httpCode = 500) {
    super(message);
    this.code = internalCode;
    this.httpCode = httpCode;
  }
};

module.exports = {
  missingPlugin,
  pluginFunction,
  aborted,
  noParser,
  uninitializedParser,
  filenameNotString,
  maxFieldsSizeExceeded,
  maxFieldsExceeded,
  smallerThanMinFileSize,
  biggerThanMaxFileSize,
  noEmptyFiles,
  missingContentType,
  malformedMultipart,
  missingMultipartBoundary,
  unknownTransferEncoding,

  FormidableError,
};
