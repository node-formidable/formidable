/* eslint-disable no-underscore-dangle */

import JSONParser from '../parsers/JSON';
import type { Formidable, IFormidableOptions } from '../types'

export const jsonType = 'json';
// the `options` is also available through the `this.options` / `formidable.options`
export default function plugin(this: Formidable, formidable: Formidable, options: IFormidableOptions) {
  // the `this` context is always formidable, as the first argument of a plugin
  // but this allows us to customize/test each plugin

  /* istanbul ignore next */
  const self = this || formidable;

  if (/json/i.test(self.headers['content-type'])) {
    init.call(self, self, options);
  }

  return self;
};

// Note that it's a good practice (but it's up to you) to use the `this.options` instead
// of the passed `options` (second) param, because when you decide
// to test the plugin you can pass custom `this` context to it (and so `this.options`)
function init(this: Formidable, _self: Formidable, _opts: IFormidableOptions) {
  this.type = jsonType;

  const parser = new JSONParser(this.options);

  parser.on('data', (fields) => {
    this.fields = fields;
  });

  parser.once('end', () => {
    this.ended = true;
    this._maybeEnd();
  });

  this._parser = parser;
}
