/* eslint-disable */
import cjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import packageJson from '../package.json' assert {type: "json"};;

const {dependencies} = packageJson;
const plugins = [nodeResolve(), cjs()];
const cjsOptions = {
  format: `cjs`,
  exports: `named`,
}

const external = [...Object.keys(dependencies)];

export default [
  {
    input: `src/index.js`,
    output: [
      {
        file: `dist/index.cjs`,
        ...cjsOptions,
      },
    ],
    external,
    plugins,
  },
  {
    input: `src/helpers/firstValues.js`,
    output: [
      {
        file: `dist/helpers/firstValues.cjs`,
        ...cjsOptions,
      },
    ],
    external,
    plugins,
  },
  {
    input: `src/helpers/readBooleans.js`,
    output: [
      {
        file: `dist/helpers/readBooleans.cjs`,
        ...cjsOptions,
      },
    ],
    external,
    plugins,
  },
  {
    input: `src/parsers/JSON.js`,
    output: [
      {
        file: `dist/parsers/JSON.cjs`,
        ...cjsOptions,
      },
    ],
    external,
    plugins,
  },
  {
    input: `src/parsers/Multipart.js`,
    output: [
      {
        file: `dist/parsers/Multipart.cjs`,
        ...cjsOptions,
      },
    ],
    external,
    plugins,
  },
  {
    input: `src/parsers/Querystring.js`,
    output: [
      {
        file: `dist/parsers/Querystring.cjs`,
        ...cjsOptions,
      },
    ],
    external,
    plugins,
  },
  {
    input: `src/parsers/OctetStream.js`,
    output: [
      {
        file: `dist/parsers/OctetStream.cjs`,
        ...cjsOptions,
      },
    ],
    external,
    plugins,
  },
  {
    input: `src/parsers/StreamingQuerystring.js`,
    output: [
      {
        file: `dist/parsers/StreamingQuerystring.cjs`,
        ...cjsOptions,
      },
    ],
    external,
    plugins,
  },
];

