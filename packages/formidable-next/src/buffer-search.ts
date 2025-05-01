export interface SearchFunction {
  (haystack: Uint8Array, start?: number): number;
}

export function createSearch(pattern: string): SearchFunction {
  const needle = new TextEncoder().encode(pattern);

  let search: SearchFunction;
  if ('Buffer' in globalThis && !('Bun' in globalThis || 'Deno' in globalThis)) {
    // Use the built-in Buffer.indexOf method on Node.js for better perf.
    search = (haystack, start = 0) => Buffer.prototype.indexOf.call(haystack, needle, start);
  } else {
    const needleEnd = needle.length - 1;
    const skipTable = new Uint8Array(256).fill(needle.length);
    for (let i = 0; i < needleEnd; ++i) {
      const byte = needle[i];
      if (byte !== undefined) {
        skipTable[byte] = needleEnd - i;
      }
    }
    // Initialize skip table with pattern length as default
    for (let byte = 0; byte < 256; byte++) {
      skipTable[byte] = needle.length;
    }
    // Update skip table for each byte in the pattern except the last one
    for (let i = 0; i < needleEnd; i++) {
      const byte = needle[i];
      if (byte !== undefined) {
        skipTable[byte] = needleEnd - i;
      }
    }
    search = (haystack, start = 0) => {
      const haystackLength = haystack.length;
      let i = start + needleEnd;

      while (i < haystackLength) {
        for (let j = needleEnd, k = i; j >= 0 && haystack[k] === needle[j]; --j, --k) {
          if (j === 0) return k;
        }

        const kk = haystack[i] ?? 0;
        i += skipTable[kk] ?? needle.length;
      }

      return -1;
    };
  }

  return search;
}

export interface PartialTailSearchFunction {
  (haystack: Uint8Array): number;
}

export function createPartialTailSearch(pattern: string): PartialTailSearchFunction {
  const needle = new TextEncoder().encode(pattern);

  const byteIndexes: Record<number, number[]> = {};
  for (const [i, byte] of needle.entries()) {
    if (byteIndexes[byte] === undefined) byteIndexes[byte] = [];
    byteIndexes[byte].push(i);
  }

  return function (haystack: Uint8Array): number {
    const haystackEnd = haystack.length - 1;
    const lastByte = haystack[haystackEnd];

    if (lastByte !== undefined && lastByte in byteIndexes) {
      const indexes = byteIndexes[lastByte] as number[];

      for (let i = indexes.length - 1; i >= 0; --i) {
        const index = indexes[i];
        let j: number = index as number;
        let k: number = haystackEnd;

        while (j >= 0 && k >= 0 && haystack[k] === needle[j]) {
          if (j === 0) return k;
          j--;
          k--;
        }
      }
    }

    return -1;
  };
}
