import xaxa from 'eslint-config-xaxa';

export default xaxa({
  ignores: [
    '**/super-headers.js',
    // '**/packages/formidable-v3/**',
    '**/*.cjs',
    'async-gens-with-queues-slow.ts',
  ],
  wgw: {
    'import/exports-last': 'off',
    'no-undefined': 'off',

    // super buggy... :facepalm:
    'no-use-before-define': ['off', {
      allowNamedExports: true,
      classes: true,
      functions: false,
      variables: true,
    }],
  },
}, {
  files: ['**/*.test.js', '**/*.test.ts'],
  languageOptions: {
    globals: {
      // jest
      afterAll: 'readonly',
      afterEach: 'readonly',
      beforeAll: 'readonly',
      beforeEach: 'readonly',
      // mocha
      context: 'readonly',
      describe: 'readonly',
      expect: 'readonly',
      it: 'readonly',

      suite: 'readonly',
      test: 'readonly',
    },
  },
  name: 'test-files',
  rules: {
    // 'no-undef': 'off',
  },
});
