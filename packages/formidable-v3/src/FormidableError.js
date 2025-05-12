export const missingPlugin = 1000;
export const pluginFunction = 1001;
export const aborted = 1002;
export const noParser = 1003;
export const uninitializedParser = 1004;
export const filenameNotString = 1005;
export const maxFieldsSizeExceeded = 1006;
export const maxFieldsExceeded = 1007;
export const smallerThanMinFileSize = 1008;
export const biggerThanTotalMaxFileSize = 1009;
export const noEmptyFiles = 1010;
export const missingContentType = 1011;
export const malformedMultipart = 1012;
export const missingMultipartBoundary = 1013;
export const unknownTransferEncoding = 1014;
export const maxFilesExceeded = 1015;
export const biggerThanMaxFileSize = 1016;
export const pluginFailed = 1017;
export const cannotCreateDir = 1018;

export const FormidableError = class extends Error {
  constructor(message, internalCode, httpCode = 500) {
    super(message);
    this.code = internalCode;
    this.httpCode = httpCode;
  }
};

export default FormidableError;
