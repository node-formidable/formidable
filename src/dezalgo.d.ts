declare module 'dezalgo' {
  function dezalgo<cbFn extends Function>(cb: cbFn): cbFn;
  export = dezalgo;
}