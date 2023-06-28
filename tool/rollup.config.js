/* eslint-disable */
import cjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import packageJson from '../package.json' assert {type: "json"};;

const {dependencies} = packageJson;
const plugins = [nodeResolve(), cjs()];

const external = [...Object.keys(dependencies)];

export default [
  {
    input: `src/index.js`,
    output: [
      {
        file: `dist/index.cjs`,
        format: `cjs`,
        exports: `named`,
      },
    ],
    external,
    plugins,
  },
];

