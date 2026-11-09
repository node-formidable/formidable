/* eslint-disable no-underscore-dangle */

import JSONParser from "../parsers/JSON.js";

export const jsonType = "json";
// the `options` is also available through the `this.options` / `formidable.options`
export default function plugin(formidable, options) {
  // the `this` context is always formidable, as the first argument of a plugin
  // but this allows us to customize/test each plugin

  /* istanbul ignore next */
  const self = this || formidable;

  if (/^[^;]*json/i.test(self.headers["content-type"])) {
    init.call(self, self, options);
  }

  return self;
}

/**
 * Byte length of a JSON value's encoding, counted with an explicit stack.
 * `JSON.stringify` recurses per nesting level and overflows the call stack on a
 * deeply nested value that `JSON.parse` (and so this parser) accepted; a value
 * that reached this handler is plain JSON data, so the walk only has to cover
 * the types `JSON.parse` can produce.
 */
function jsonByteLength(value) {
  let bytes = 0;
  const stack = [value];

  while (stack.length > 0) {
    const current = stack.pop();

    if (current === null) {
      bytes += 4; // "null"
    } else if (typeof current === "string") {
      bytes += Buffer.byteLength(JSON.stringify(current));
    } else if (typeof current === "number") {
      // JSON.stringify encodes a non-finite number as "null"
      bytes += Number.isFinite(current)
        ? Buffer.byteLength(String(current))
        : 4;
    } else if (typeof current === "boolean") {
      bytes += current ? 4 : 5;
    } else if (Array.isArray(current)) {
      bytes += 2 + Math.max(current.length - 1, 0); // brackets and commas
      for (let index = 0; index < current.length; index += 1) {
        stack.push(current[index]);
      }
    } else if (typeof current === "object") {
      const keys = Object.keys(current);
      bytes += 2 + Math.max(keys.length - 1, 0); // braces and commas
      for (let index = 0; index < keys.length; index += 1) {
        const key = keys[index];
        bytes += Buffer.byteLength(JSON.stringify(key)) + 1; // key and colon
        stack.push(current[key]);
      }
    }
    // undefined, functions and symbols cannot come out of JSON.parse
  }

  return bytes;
}

// Note that it's a good practice (but it's up to you) to use the `this.options` instead
// of the passed `options` (second) param, because when you decide
// to test the plugin you can pass custom `this` context to it (and so `this.options`)
function init(_self, _opts) {
  this.type = jsonType;

  const parser = new JSONParser(this.options);

  parser.on("data", (fields) => {
    // Emit each field through the regular `field` path instead of assigning
    // `this.fields` wholesale, so the shared field accounting (maxFieldsSize)
    // and the maxFields listener apply to the JSON parser as well.
    Object.entries(fields).every(([name, value]) => {
      const size =
        typeof value === "string"
          ? Buffer.byteLength(value)
          : jsonByteLength(value);
      if (!this._addFieldSize(size)) {
        return false;
      }
      this.emit("field", name, value);
      return !this.error;
    });
  });

  parser.once("end", () => {
    this.ended = true;
    this._maybeEnd();
  });

  this._parser = parser;
}
