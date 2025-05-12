
# Important Notes for v1, v2, and v3

For more info, check the [CHANGELOG](https://github.com/node-formidable/formidable/blob/master/CHANGELOG.md) on the master branch.

## v1 is deprecated

All `v1` versions are deprecated in NPM for over 2 years. You can find it at `formidable@v1` on NPM, and on [v1 branch][v1branch] on GitHub.  
We highly recommend to use `v2` or `v3`. Both are already in use by many, especially `v2` which was on `formidable@canary` for 2 years.

- **Status: Not Maintained!**
- We won't provide support or accept reports on that version.
- **No Backporting:** bugfixes, security fixes, or new features WILL NOT happen!
- Please move to at least **v2**! 
- Try with installing `formidable@v2` and if still have the problem - report!

## v2 is going to be deprecated

The `v2` is available as `formidable@v2`.
The source code is available **only** on [v2 branch][v2branch].
If you want to use v2, it's recommended to lock and use the v2 dist-tag `formidable@v2-latest`. 

**Main Differences from v1:**

- Better organization and modernized code, requiring newer Node.js versions (>= v10).
- A lot of bugfixes, closed issues, merged or closed PRs.
- Better docs, new features (plugins, parsers, options) and optimizations.

## v3 - ESModules, Monorepo structure

We recommend to use `formidable@latest` to install, as it uses more modern Node.js Streams, has support for more stuff.
You can see more info and track some ideas on [issue#635](https://github.com/node-formidable/formidable/issues/635).

- The source code can be found on the [master branch][v3branch] on GitHub.
- It is published as `formidable@latest`
- Dropping older Node.js versions, requiring higher than v12-v14.
- Dropping v1 compatibility.
- Rewritten to ESModules, more optimizations.
- Moving to monorepo structure, more plugins & helper utils.

[v1branch]: https://github.com/node-formidable/formidable/tree/v1-legacy
[v2branch]: https://github.com/node-formidable/formidable/tree/v2-latest
[v3branch]: https://github.com/node-formidable/formidable/tree/master
