import { deepStrictEqual, ok, strictEqual } from "node:assert";
import test from "node:test";
import { once } from "../../src/utils.js";

test("once(fn)", () => {
  let f = 0;
  function fn(g) {
    strictEqual(f, 0);
    f += 1;
    return f + g + this;
  }

  fn.ownProperty = {};
  const wrapped = once(fn);

  strictEqual(fn.ownProperty, wrapped.ownProperty);
  strictEqual(wrapped.called, false);

  for (let i = 0; i < 1e3; i += 1) {
    strictEqual(f, i === 0 ? 0 : 1);
    const g = wrapped.call(1, 1);
    ok(wrapped.called);
    strictEqual(g, 3);
    strictEqual(f, 1);
  }
});

test("once wrapper preserves callback own properties", () => {
  function fn() {
    return true;
  }

  fn.meta = { keep: true };
  const wrapped = once(fn);

  deepStrictEqual(wrapped.meta, { keep: true });
});
