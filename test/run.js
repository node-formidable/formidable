'use strict';

require('urun')(__dirname, {
  verbose: true,
  include: /test-.+/,
  reporter: 'BashTapReporter',
});
