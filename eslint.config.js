import xaxa from 'eslint-config-xaxa';

export default xaxa({
  ignores: [
    '**/super-headers.js',
    '**/packages/formidable-v3/**',
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
});
