declare module 'dezalgo' {
  function dezalgo(cb: Function): () => void;
  export = dezalgo;
}