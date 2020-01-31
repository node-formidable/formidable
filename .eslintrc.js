'use strict';

const airbnbBase = require('eslint-config-airbnb-base');

// eslint-disable-next-line import/no-dynamic-require
const bestPractices = require(airbnbBase.extends[0]);

const ignoredProps = bestPractices.rules[
  'no-param-reassign'
][1].ignorePropertyModificationsFor.concat(
  'err',
  'x',
  '_',
  'opts',
  'options',
  'settings',
  'config',
  'cfg',
);

// Additional rules that are specific and overiding previous
const additionalChanges = {
  strict: 'off',

  // Enforce using named functions when regular function is used,
  // otherwise use arrow functions
  'func-names': ['error', 'always'],
  // Always use parens (for consistency).
  // https://eslint.org/docs/rules/arrow-parens
  'arrow-parens': ['error', 'always', { requireForBlockBody: true }],
  'prefer-arrow-callback': [
    'error',
    { allowNamedFunctions: true, allowUnboundThis: true },
  ],
  // http://eslint.org/docs/rules/max-params
  'max-params': ['error', { max: 3 }],
  // http://eslint.org/docs/rules/max-statements
  'max-statements': ['error', { max: 20 }],
  // http://eslint.org/docs/rules/max-statements-per-line
  'max-statements-per-line': ['error', { max: 1 }],
  // http://eslint.org/docs/rules/max-nested-callbacks
  'max-nested-callbacks': ['error', { max: 4 }],
  // http://eslint.org/docs/rules/max-depth
  'max-depth': ['error', { max: 4 }],
  // enforces no braces where they can be omitted
  // https://eslint.org/docs/rules/arrow-body-style
  // Never enable for object literal.
  'arrow-body-style': [
    'error',
    'as-needed',
    { requireReturnForObjectLiteral: false },
  ],
  // Allow functions to be use before define because:
  // 1) they are hoisted,
  // 2) because ensure read flow is from top to bottom
  // 3) logically order of the code.
  // 4) the only addition is 'typedefs' option, see overrides for TS files
  'no-use-before-define': [
    'error',
    {
      functions: false,
      classes: true,
      variables: true,
    },
  ],
  // Same as AirBnB, but adds `opts`, `options`, `x` and `err` to exclusions!
  // disallow reassignment of function parameters
  // disallow parameter object manipulation except for specific exclusions
  // rule: https://eslint.org/docs/rules/no-param-reassign.html
  'no-param-reassign': [
    'error',
    {
      props: true,
      ignorePropertyModificationsFor: ignoredProps,
    },
  ],

  // disallow declaration of variables that are not used in the code
  'no-unused-vars': [
    'error',
    {
      ignoreRestSiblings: true, // airbnb's default
      vars: 'all', // airbnb's default
      varsIgnorePattern: '^(?:$$|xx|_|__|[iI]gnor(?:e|ing|ed))',
      args: 'after-used', // airbnb's default
      argsIgnorePattern: '^(?:$$|xx|_|__|[iI]gnor(?:e|ing|ed))',

      // catch blocks are handled by Unicorns
      caughtErrors: 'none',
      // caughtErrorsIgnorePattern: '^(?:$$|xx|_|__|[iI]gnor(?:e|ing|ed))',
    },
  ],
};

const importRules = {
  'import/namespace': ['error', { allowComputed: true }],
  'import/no-absolute-path': 'error',
  'import/no-webpack-loader-syntax': 'error',
  'import/no-self-import': 'error',

  // Enable this sometime in the future when Node.js has ES2015 module support
  // 'import/no-cycle': 'error',

  // Disabled as it doesn't work with TypeScript
  // 'import/newline-after-import': 'error',

  'import/no-amd': 'error',
  'import/no-duplicates': 'error',

  // Enable this sometime in the future when Node.js has ES2015 module support
  // 'import/unambiguous': 'error',

  // Enable this sometime in the future when Node.js has ES2015 module support
  // 'import/no-commonjs': 'error',

  // Looks useful, but too unstable at the moment
  // 'import/no-deprecated': 'error',

  'import/no-extraneous-dependencies': 'off',
  'import/no-mutable-exports': 'error',
  'import/no-named-as-default-member': 'error',
  'import/no-named-as-default': 'error',

  // Disabled because it's buggy and it also doesn't work with TypeScript
  // 'import/no-unresolved': [
  // 	'error',
  // 	{
  // 		commonjs: true
  // 	}
  // ],

  'import/order': 'error',
  'import/no-unassigned-import': [
    'error',
    { allow: ['@babel/polyfill', '@babel/register'] },
  ],

  'import/prefer-default-export': 'off',

  // Ensure more web-compat
  // ! note that it doesn't work in CommonJS
  // https://github.com/benmosher/eslint-plugin-import/blob/master/docs/rules/extensions.md
  'import/extensions': 'off',

  // ? Always use named exports. Enable?
  // 'import/no-default-export': 'error',

  // ? enable?
  'import/exports-last': 'off',

  // todo: Enable in future.
  // Ensures everything is tested (all exports should be used).
  // For cases when you don't want or can't test, add eslint-ignore comment!
  // see: https://github.com/benmosher/eslint-plugin-import/blob/master/docs/rules/no-unused-modules.md
  'import/no-unused-modules': 'off',

  'import/no-useless-path-segments': ['error', { noUselessIndex: false }],
};

module.exports = {
  env: {
    es6: true,
    es2020: true,
    jest: true,
    node: true,
    commonjs: true,
  },
  extends: ['eslint:recommended', 'airbnb-base', 'plugin:prettier/recommended'],
  plugins: ['prettier'],
  rules: {
    ...additionalChanges,
    ...importRules,
  },
};
