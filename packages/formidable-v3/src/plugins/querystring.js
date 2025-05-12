import QuerystringParser from '../parsers/Querystring.js';

export const querystringType = 'urlencoded';

// the `options` is also available through the `this.options` / `formidable.options`
export function querystring(formidable, options) {
  // the `this` context is always formidable, as the first argument of a plugin
  // but this allows us to customize/test each plugin

  /* istanbul ignore next */
  const self = this || formidable;

  if (/urlencoded/i.test(self.headers['content-type'])) {
    initializePlugin.call(self, self, options);
  }
  return self;
}

// Note that it's a good practice (but it's up to you) to use the `this.options` instead
// of the passed `options` (second) param, because when you decide
// to test the plugin you can pass custom `this` context to it (and so `this.options`)
function initializePlugin(_self, _opts) {
  this.type = querystringType;

  const parser = new QuerystringParser(this.options);

  parser.on('data', ({ key, value }) => {
    this.emit('field', key, value);
  });

  parser.once('end', () => {
    this.ended = true;
    this._maybeEnd();
  });

  this._parser = parser;

  return this;
}
