'use strict';

const config = require('@tunnckocore/prettier-config');

module.exports = {
  ...config,
  overrides: [
    {
      files: ['**/*.md*'],
      options: {
        proseWrap: 'always',
        printWidth: 80,
      },
    },
    {
      files: ['**/.all-contributorsrc'],
      options: {
        parser: 'json-stringify',
        singleQuote: false,
      },
    },
  ],
};
