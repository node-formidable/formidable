import { deepStrictEqual, strictEqual } from "node:assert";
import test from "node:test";
import { dezalgo } from "../../src/utils.js";

test("dezalgo contains the dark pony", async () => {
  let n = 0;
  let called = 0;
  const order = [0, 2, 4, 6, 8, 1, 3, 5, 7, 9];
  let index = 0;

  function foo(i, cb) {
    const wrapped = dezalgo(cb);
    if (++n % 2) {
      wrapped(true, i);
    } else {
      process.nextTick(wrapped.bind(null, false, i));
    }
  }

  for (let i = 0; i < 10; i += 1) {
    foo(i, (cached, value) => {
      strictEqual(value, order[index]);
      index += 1;
      strictEqual(value % 2, cached ? 0 : 1);
      called += 1;
    });
    strictEqual(called, 0);
  }

  await new Promise((resolve) => {
    setTimeout(resolve, 10);
  });

  strictEqual(called, 10);
});

test("dezalgo preserves callback own properties", async () => {
  const callback = () => {};
  callback.meta = { keep: true };

  const wrapped = dezalgo(callback);
  deepStrictEqual(wrapped.meta, { keep: true });

  let called = false;

  const done = new Promise((resolve) => {
    const asyncWrapped = dezalgo(() => {
      called = true;
      resolve();
    });
    asyncWrapped();
    strictEqual(called, false);
  });

  await done;
  strictEqual(called, true);
});
