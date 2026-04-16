function copyOwnProperties(source, target) {
  Object.keys(source).forEach((key) => {
    // eslint-disable-next-line no-param-reassign
    target[key] = source[key];
  });
  return target;
}

function once(fn) {
  if (typeof fn !== "function") {
    throw new TypeError("Expected a function");
  }

  const wrapped = function func(...args) {
    if (wrapped.called) {
      return wrapped.value;
    }

    wrapped.called = true;
    wrapped.value = fn.apply(this, args);
    return wrapped.value;
  };

  wrapped.called = false;
  return copyOwnProperties(fn, wrapped);
}

function dezalgo(fn) {
  if (typeof fn !== "function") {
    throw new TypeError("Expected a function");
  }

  let sync = true;
  queueMicrotask(() => {
    sync = false;
  });

  const wrapped = function funcWrapper(...args) {
    if (sync) {
      queueMicrotask(() => {
        fn.apply(this, args);
      });
      return undefined;
    }

    return fn.apply(this, args);
  };

  return copyOwnProperties(fn, wrapped);
}

export { once, dezalgo };
