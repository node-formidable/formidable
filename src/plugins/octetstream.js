/* eslint-disable no-underscore-dangle */

import OctetStreamParser from "../parsers/OctetStream.js";
import FormidableError, * as errors from "../FormidableError.js";

export const octetStreamType = "octet-stream";
// the `options` is also available through the `options` / `formidable.options`
export default async function plugin(formidable, options) {
  // the `this` context is always formidable, as the first argument of a plugin
  // but this allows us to customize/test each plugin

  /* istanbul ignore next */
  const self = this || formidable;

  if (/^[^;]*octet-stream/i.test(self.headers["content-type"])) {
    await init.call(self, self, options);
  }
  return self;
}

// Note that it's a good practice (but it's up to you) to use the `this.options` instead
// of the passed `options` (second) param, because when you decide
// to test the plugin you can pass custom `this` context to it (and so `this.options`)
async function init(_self, _opts) {
  this.type = octetStreamType;
  const originalFilename = this.headers["x-file-name"];
  const mimetype = this.headers["content-type"];

  const thisPart = {
    originalFilename,
    mimetype,
  };

  if (!this.options.filter({ name: "file", ...thisPart })) {
    return ignoreFile.call(this);
  }

  const newFilename = this._getNewName(thisPart);
  const filepath = this._joinDirectoryName(newFilename);
  const file = await this._newFile({
    newFilename,
    filepath,
    originalFilename,
    mimetype,
  });

  this.emit("fileBegin", originalFilename, file);
  file.open();
  this.openedFiles.push(file);
  this._flushing += 1;

  this._parser = new OctetStreamParser(this.options);

  // Keep track of writes that haven't finished so we don't emit the file before it's done being written
  let outstandingWrites = 0;

  this._parser.on("data", (buffer) => {
    this.pause();
    outstandingWrites += 1;

    file.write(buffer, () => {
      outstandingWrites -= 1;
      this.resume();

      if (this.ended) {
        this._parser.emit("doneWritingFile");
      }
    });
  });

  this._parser.on("end", () => {
    const bodySize = this.bytesReceived;
    if (!this.options.allowEmptyFiles && bodySize === 0) {
      this._error(
        new FormidableError(
          `options.allowEmptyFiles is false, file size should be greater than 0`,
          errors.noEmptyFiles,
          400
        )
      );
      return;
    }
    if (bodySize < this.options.minFileSize) {
      this._error(
        new FormidableError(
          `options.minFileSize (${this.options.minFileSize} bytes) inferior, received ${bodySize} bytes of file data`,
          errors.smallerThanMinFileSize,
          400
        )
      );
      return;
    }

    this._flushing -= 1;
    this.ended = true;

    const done = () => {
      file.end(() => {
        this.emit("file", "file", file);
        this._maybeEnd();
      });
    };

    if (outstandingWrites === 0) {
      done();
    } else {
      this._parser.once("doneWritingFile", done);
    }
  });

  return this;
}

function ignoreFile() {
  this._parser = new OctetStreamParser(this.options);
  this._parser.on("end", () => {
    this.ended = true;
    this._maybeEnd();
  });
  this._parser.resume();
  return this;
}
