'use strict';

const config = require('@tunnckocore/prettier-config');

module.exports = {
  ...config,
  overrides: [
    {
      files: ['**/.all-contributorsrc'],
      options: {
        parser: 'json-stringify',
        singleQuote: false,
        // That actually is enforced by AirBnB Style anyway.
        // Always useful. And guaranteed that you won't see boring errors,
        // that eats your time, because of nothing real.
        trailingComma: 'all',

        // That actually is enforced by AirBnB Style anyway.
        // Enforce more clear object literals.
        // As seen in this example https://github.com/airbnb/javascript#objects--rest-spread
        bracketSpacing: true,
      },
    },
  ],
};
