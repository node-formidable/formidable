import Formidable, { DEFAULT_OPTIONS } from './Formidable.js';
import PersistentFile from './PersistentFile.js';
import VolatileFile from './VolatileFile.js';

// make it available without requiring the `new` keyword
// if you want it access `const formidable.IncomingForm` as v1
const formidable = (...args) => new Formidable(...args);
const { enabledPlugins } = DEFAULT_OPTIONS;

export default formidable;
export {
  DEFAULT_OPTIONS as defaultOptions,
  enabledPlugins,
  PersistentFile as File,
  Formidable,

  // as named
  formidable,

  // misc
  DEFAULT_OPTIONS as FORMIDABLE_DEFAULT_OPTIONS,

  // alias
  Formidable as IncomingForm,
  PersistentFile,
  VolatileFile,
};

/**
 * We have exports defined in package.json, so if they used them these removals below
 * should not be a problem. We also expose `formidable/parsers`, `formidable/plugins`, and `formidable/helpers` since 3.5.5
 * which support both CJS and ESM imports.
 *
 * In the majority of the cases, no one is using any of this stuff anyway.
 */

export * as errors from './FormidableError.js';

// none of these were exported in < 3.5.4, now we have them both here and as `formidable/helpers` & `formidable/src/helpers/*.js`
export * as helpers from './helpers/index.js';
// export * from './helpers/index.js';

// from and after >= 3.5.5
export * as parsers from './parsers/index.js';
// before 3.5.4 - TODO: bring back in if reports come, highly unlikely
// export * from './parsers/index.js'; // old

// from and after >= 3.5.5
export * as plugins from './plugins/index.js';
// before 3.5.4 - TODO: bring back in if reports come, highly unlikely
// export * from './plugins/index.js'; // old
