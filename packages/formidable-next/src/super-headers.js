// MIT: https://unpkg.com/@mjackson/headers@0.10.0/dist/headers.js
// Issue: https://github.com/mjackson/remix-the-web/issues/70
// Turns out we cannot polyfill it upstream.

import { Headers } from 'headers-polyfill';

// src/lib/param-values.ts
function parseParams(input, delimiter = ';') {
  let parser =
    delimiter === ';'
      ? /(?:^|;)\s*([^=;\s]+)(\s*=\s*(?:"((?:[^"\\]|\\.)*)"|((?:[^;]|\\\;)+))?)?/g
      : /(?:^|,)\s*([^=,\s]+)(\s*=\s*(?:"((?:[^"\\]|\\.)*)"|((?:[^,]|\\\,)+))?)?/g;
  let params = [];
  let match;
  while ((match = parser.exec(input)) !== null) {
    let key = match[1].trim();
    let value;
    if (match[2]) {
      value = (match[3] || match[4] || '').replace(/\\(.)/g, '$1').trim();
    }
    params.push([key, value]);
  }
  return params;
}
function quote(value) {
  if (value.includes('"') || value.includes(';') || value.includes(' ')) {
    return `"${value.replace(/"/g, '\\"')}"`;
  }
  return value;
}

// src/lib/utils.ts
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}
function isIterable(value) {
  return value != null && typeof value[Symbol.iterator] === 'function';
}
function isValidDate(date) {
  return date instanceof Date && !isNaN(date.getTime());
}
function quoteEtag(tag) {
  return tag === '*' ? tag : /^(W\/)?".*"$/.test(tag) ? tag : `"${tag}"`;
}

// src/lib/accept.ts
var Accept = class {
  #map;
  constructor(init) {
    this.#map = /* @__PURE__ */ new Map();
    if (init) {
      if (typeof init === 'string') {
        for (let piece of init.split(/\s*,\s*/)) {
          let params = parseParams(piece);
          if (params.length < 1) continue;
          let mediaType = params[0][0];
          let weight = 1;
          for (let i = 1; i < params.length; i++) {
            let [key, value] = params[i];
            if (key === 'q') {
              weight = Number(value);
              break;
            }
          }
          this.#map.set(mediaType.toLowerCase(), weight);
        }
      } else if (isIterable(init)) {
        for (let mediaType of init) {
          if (Array.isArray(mediaType)) {
            this.#map.set(mediaType[0].toLowerCase(), mediaType[1]);
          } else {
            this.#map.set(mediaType.toLowerCase(), 1);
          }
        }
      } else {
        for (let mediaType of Object.getOwnPropertyNames(init)) {
          this.#map.set(mediaType.toLowerCase(), init[mediaType]);
        }
      }
      this.#sort();
    }
  }
  #sort() {
    this.#map = new Map([...this.#map].sort((a, b) => b[1] - a[1]));
  }
  /**
   * An array of all media types in the header.
   */
  get mediaTypes() {
    return Array.from(this.#map.keys());
  }
  /**
   * An array of all weights (q values) in the header.
   */
  get weights() {
    return Array.from(this.#map.values());
  }
  /**
   * The number of media types in the `Accept` header.
   */
  get size() {
    return this.#map.size;
  }
  /**
   * Returns `true` if the header matches the given media type (i.e. it is "acceptable").
   * @param mediaType The media type to check.
   * @returns `true` if the media type is acceptable, `false` otherwise.
   */
  accepts(mediaType) {
    return this.getWeight(mediaType) > 0;
  }
  /**
   * Gets the weight of a given media type. Also supports wildcards, so e.g. `text/*` will match `text/html`.
   * @param mediaType The media type to get the weight of.
   * @returns The weight of the media type.
   */
  getWeight(mediaType) {
    let [type, subtype] = mediaType.toLowerCase().split('/');
    for (let [key, value] of this) {
      let [t, s] = key.split('/');
      if (
        (t === type || t === '*' || type === '*') &&
        (s === subtype || s === '*' || subtype === '*')
      ) {
        return value;
      }
    }
    return 0;
  }
  /**
   * Returns the most preferred media type from the given list of media types.
   * @param mediaTypes The list of media types to choose from.
   * @returns The most preferred media type or `null` if none match.
   */
  getPreferred(mediaTypes) {
    let sorted = mediaTypes
      .map((mediaType) => [mediaType, this.getWeight(mediaType)])
      .sort((a, b) => b[1] - a[1]);
    let first = sorted[0];
    return first !== void 0 && first[1] > 0 ? first[0] : null;
  }
  /**
   * Returns the weight of a media type. If it is not in the header verbatim, this returns `null`.
   * @param mediaType The media type to get the weight of.
   * @returns The weight of the media type, or `null` if it is not in the header.
   */
  get(mediaType) {
    return this.#map.get(mediaType.toLowerCase()) ?? null;
  }
  /**
   * Sets a media type with the given weight.
   * @param mediaType The media type to set.
   * @param weight The weight of the media type. Defaults to 1.
   */
  set(mediaType, weight = 1) {
    this.#map.set(mediaType.toLowerCase(), weight);
    this.#sort();
  }
  /**
   * Removes the given media type from the header.
   * @param mediaType The media type to remove.
   */
  delete(mediaType) {
    this.#map.delete(mediaType.toLowerCase());
  }
  /**
   * Checks if a media type is in the header.
   * @param mediaType The media type to check.
   * @returns `true` if the media type is in the header (verbatim), `false` otherwise.
   */
  has(mediaType) {
    return this.#map.has(mediaType.toLowerCase());
  }
  /**
   * Removes all media types from the header.
   */
  clear() {
    this.#map.clear();
  }
  entries() {
    return this.#map.entries();
  }
  [Symbol.iterator]() {
    return this.entries();
  }
  forEach(callback, thisArg) {
    for (let [mediaType, weight] of this) {
      callback.call(thisArg, mediaType, weight, this);
    }
  }
  toString() {
    let pairs = [];
    for (let [mediaType, weight] of this.#map) {
      pairs.push(`${mediaType}${weight === 1 ? '' : `;q=${weight}`}`);
    }
    return pairs.join(',');
  }
};

// src/lib/accept-encoding.ts
var AcceptEncoding = class {
  #map;
  constructor(init) {
    this.#map = /* @__PURE__ */ new Map();
    if (init) {
      if (typeof init === 'string') {
        for (let piece of init.split(/\s*,\s*/)) {
          let params = parseParams(piece);
          if (params.length < 1) continue;
          let encoding = params[0][0];
          let weight = 1;
          for (let i = 1; i < params.length; i++) {
            let [key, value] = params[i];
            if (key === 'q') {
              weight = Number(value);
              break;
            }
          }
          this.#map.set(encoding.toLowerCase(), weight);
        }
      } else if (isIterable(init)) {
        for (let value of init) {
          if (Array.isArray(value)) {
            this.#map.set(value[0].toLowerCase(), value[1]);
          } else {
            this.#map.set(value.toLowerCase(), 1);
          }
        }
      } else {
        for (let encoding of Object.getOwnPropertyNames(init)) {
          this.#map.set(encoding.toLowerCase(), init[encoding]);
        }
      }
      this.#sort();
    }
  }
  #sort() {
    this.#map = new Map([...this.#map].sort((a, b) => b[1] - a[1]));
  }
  /**
   * An array of all encodings in the header.
   */
  get encodings() {
    return Array.from(this.#map.keys());
  }
  /**
   * An array of all weights (q values) in the header.
   */
  get weights() {
    return Array.from(this.#map.values());
  }
  /**
   * The number of encodings in the header.
   */
  get size() {
    return this.#map.size;
  }
  /**
   * Returns `true` if the header matches the given encoding (i.e. it is "acceptable").
   * @param encoding The encoding to check.
   * @returns `true` if the encoding is acceptable, `false` otherwise.
   */
  accepts(encoding) {
    return encoding.toLowerCase() === 'identity' || this.getWeight(encoding) > 0;
  }
  /**
   * Gets the weight an encoding. Performs wildcard matching so `*` matches all encodings.
   * @param encoding The encoding to get.
   * @returns The weight of the encoding, or `0` if it is not in the header.
   */
  getWeight(encoding) {
    let lower = encoding.toLowerCase();
    for (let [enc, weight] of this) {
      if (enc === lower || enc === '*' || lower === '*') {
        return weight;
      }
    }
    return 0;
  }
  /**
   * Returns the most preferred encoding from the given list of encodings.
   * @param encodings The encodings to choose from.
   * @returns The most preferred encoding or `null` if none match.
   */
  getPreferred(encodings) {
    let sorted = encodings
      .map((encoding) => [encoding, this.getWeight(encoding)])
      .sort((a, b) => b[1] - a[1]);
    let first = sorted[0];
    return first !== void 0 && first[1] > 0 ? first[0] : null;
  }
  /**
   * Gets the weight of an encoding. If it is not in the header verbatim, this returns `null`.
   * @param encoding The encoding to get.
   * @returns The weight of the encoding, or `null` if it is not in the header.
   */
  get(encoding) {
    return this.#map.get(encoding.toLowerCase()) ?? null;
  }
  /**
   * Sets an encoding with the given weight.
   * @param encoding The encoding to set.
   * @param weight The weight of the encoding. Defaults to 1.
   */
  set(encoding, weight = 1) {
    this.#map.set(encoding.toLowerCase(), weight);
    this.#sort();
  }
  /**
   * Removes the given encoding from the header.
   * @param encoding The encoding to remove.
   */
  delete(encoding) {
    this.#map.delete(encoding.toLowerCase());
  }
  /**
   * Checks if the header contains a given encoding.
   * @param encoding The encoding to check.
   * @returns `true` if the encoding is in the header, `false` otherwise.
   */
  has(encoding) {
    return this.#map.has(encoding.toLowerCase());
  }
  /**
   * Removes all encodings from the header.
   */
  clear() {
    this.#map.clear();
  }
  entries() {
    return this.#map.entries();
  }
  [Symbol.iterator]() {
    return this.entries();
  }
  forEach(callback, thisArg) {
    for (let [encoding, weight] of this) {
      callback.call(thisArg, encoding, weight, this);
    }
  }
  toString() {
    let pairs = [];
    for (let [encoding, weight] of this.#map) {
      pairs.push(`${encoding}${weight === 1 ? '' : `;q=${weight}`}`);
    }
    return pairs.join(',');
  }
};

// src/lib/accept-language.ts
var AcceptLanguage = class {
  #map;
  constructor(init) {
    this.#map = /* @__PURE__ */ new Map();
    if (init) {
      if (typeof init === 'string') {
        for (let piece of init.split(/\s*,\s*/)) {
          let params = parseParams(piece);
          if (params.length < 1) continue;
          let language = params[0][0];
          let weight = 1;
          for (let i = 1; i < params.length; i++) {
            let [key, value] = params[i];
            if (key === 'q') {
              weight = Number(value);
              break;
            }
          }
          this.#map.set(language.toLowerCase(), weight);
        }
      } else if (isIterable(init)) {
        for (let value of init) {
          if (Array.isArray(value)) {
            this.#map.set(value[0].toLowerCase(), value[1]);
          } else {
            this.#map.set(value.toLowerCase(), 1);
          }
        }
      } else {
        for (let language of Object.getOwnPropertyNames(init)) {
          this.#map.set(language.toLowerCase(), init[language]);
        }
      }
      this.#sort();
    }
  }
  #sort() {
    this.#map = new Map([...this.#map].sort((a, b) => b[1] - a[1]));
  }
  /**
   * An array of all languages in the header.
   */
  get languages() {
    return Array.from(this.#map.keys());
  }
  /**
   * An array of all weights (q values) in the header.
   */
  get weights() {
    return Array.from(this.#map.values());
  }
  /**
   * The number of languages in the header.
   */
  get size() {
    return this.#map.size;
  }
  /**
   * Returns `true` if the header matches the given language (i.e. it is "acceptable").
   * @param language The locale identifier of the language to check.
   * @returns `true` if the language is acceptable, `false` otherwise.
   */
  accepts(language) {
    return this.getWeight(language) > 0;
  }
  /**
   * Gets the weight of a language with the given locale identifier. Performs wildcard and subtype
   * matching, so `en` matches `en-US` and `en-GB`, and `*` matches all languages.
   * @param language The locale identifier of the language to get.
   * @returns The weight of the language, or `0` if it is not in the header.
   */
  getWeight(language) {
    let [base, subtype] = language.toLowerCase().split('-');
    for (let [key, value] of this) {
      let [b, s] = key.split('-');
      if (
        (b === base || b === '*' || base === '*') &&
        (s === subtype || s === void 0 || subtype === void 0)
      ) {
        return value;
      }
    }
    return 0;
  }
  /**
   * Returns the most preferred language from the given list of languages.
   * @param languages The locale identifiers of the languages to choose from.
   * @returns The most preferred language or `null` if none match.
   */
  getPreferred(languages) {
    let sorted = languages
      .map((language) => [language, this.getWeight(language)])
      .sort((a, b) => b[1] - a[1]);
    let first = sorted[0];
    return first !== void 0 && first[1] > 0 ? first[0] : null;
  }
  /**
   * Gets the weight of a language with the given locale identifier. If it is not in the header
   * verbatim, this returns `null`.
   * @param language The locale identifier of the language to get.
   * @returns The weight of the language, or `null` if it is not in the header.
   */
  get(language) {
    return this.#map.get(language.toLowerCase()) ?? null;
  }
  /**
   * Sets a language with the given weight.
   * @param language The locale identifier of the language to set.
   * @param weight The weight of the language. Defaults to 1.
   */
  set(language, weight = 1) {
    this.#map.set(language.toLowerCase(), weight);
    this.#sort();
  }
  /**
   * Removes a language with the given locale identifier.
   * @param language The locale identifier of the language to remove.
   */
  delete(language) {
    this.#map.delete(language.toLowerCase());
  }
  /**
   * Checks if the header contains a language with the given locale identifier.
   * @param language The locale identifier of the language to check.
   * @returns `true` if the language is in the header, `false` otherwise.
   */
  has(language) {
    return this.#map.has(language.toLowerCase());
  }
  /**
   * Removes all languages from the header.
   */
  clear() {
    this.#map.clear();
  }
  entries() {
    return this.#map.entries();
  }
  [Symbol.iterator]() {
    return this.entries();
  }
  forEach(callback, thisArg) {
    for (let [language, weight] of this) {
      callback.call(thisArg, language, weight, this);
    }
  }
  toString() {
    let pairs = [];
    for (let [language, weight] of this.#map) {
      pairs.push(`${language}${weight === 1 ? '' : `;q=${weight}`}`);
    }
    return pairs.join(',');
  }
};

// src/lib/cache-control.ts
var CacheControl = class {
  maxAge;
  maxStale;
  minFresh;
  sMaxage;
  noCache;
  noStore;
  noTransform;
  onlyIfCached;
  mustRevalidate;
  proxyRevalidate;
  mustUnderstand;
  private;
  public;
  immutable;
  staleWhileRevalidate;
  staleIfError;
  constructor(init) {
    if (init) {
      if (typeof init === 'string') {
        let params = parseParams(init, ',');
        if (params.length > 0) {
          for (let [name, value] of params) {
            switch (name) {
              case 'max-age':
                this.maxAge = Number(value);
                break;
              case 'max-stale':
                this.maxStale = Number(value);
                break;
              case 'min-fresh':
                this.minFresh = Number(value);
                break;
              case 's-maxage':
                this.sMaxage = Number(value);
                break;
              case 'no-cache':
                this.noCache = true;
                break;
              case 'no-store':
                this.noStore = true;
                break;
              case 'no-transform':
                this.noTransform = true;
                break;
              case 'only-if-cached':
                this.onlyIfCached = true;
                break;
              case 'must-revalidate':
                this.mustRevalidate = true;
                break;
              case 'proxy-revalidate':
                this.proxyRevalidate = true;
                break;
              case 'must-understand':
                this.mustUnderstand = true;
                break;
              case 'private':
                this.private = true;
                break;
              case 'public':
                this.public = true;
                break;
              case 'immutable':
                this.immutable = true;
                break;
              case 'stale-while-revalidate':
                this.staleWhileRevalidate = Number(value);
                break;
              case 'stale-if-error':
                this.staleIfError = Number(value);
                break;
            }
          }
        }
      } else {
        this.maxAge = init.maxAge;
        this.maxStale = init.maxStale;
        this.minFresh = init.minFresh;
        this.sMaxage = init.sMaxage;
        this.noCache = init.noCache;
        this.noStore = init.noStore;
        this.noTransform = init.noTransform;
        this.onlyIfCached = init.onlyIfCached;
        this.mustRevalidate = init.mustRevalidate;
        this.proxyRevalidate = init.proxyRevalidate;
        this.mustUnderstand = init.mustUnderstand;
        this.private = init.private;
        this.public = init.public;
        this.immutable = init.immutable;
        this.staleWhileRevalidate = init.staleWhileRevalidate;
        this.staleIfError = init.staleIfError;
      }
    }
  }
  toString() {
    let parts = [];
    if (this.public) {
      parts.push('public');
    }
    if (this.private) {
      parts.push('private');
    }
    if (typeof this.maxAge === 'number') {
      parts.push(`max-age=${this.maxAge}`);
    }
    if (typeof this.sMaxage === 'number') {
      parts.push(`s-maxage=${this.sMaxage}`);
    }
    if (this.noCache) {
      parts.push('no-cache');
    }
    if (this.noStore) {
      parts.push('no-store');
    }
    if (this.noTransform) {
      parts.push('no-transform');
    }
    if (this.onlyIfCached) {
      parts.push('only-if-cached');
    }
    if (this.mustRevalidate) {
      parts.push('must-revalidate');
    }
    if (this.proxyRevalidate) {
      parts.push('proxy-revalidate');
    }
    if (this.mustUnderstand) {
      parts.push('must-understand');
    }
    if (this.immutable) {
      parts.push('immutable');
    }
    if (typeof this.staleWhileRevalidate === 'number') {
      parts.push(`stale-while-revalidate=${this.staleWhileRevalidate}`);
    }
    if (typeof this.staleIfError === 'number') {
      parts.push(`stale-if-error=${this.staleIfError}`);
    }
    if (typeof this.maxStale === 'number') {
      parts.push(`max-stale=${this.maxStale}`);
    }
    if (typeof this.minFresh === 'number') {
      parts.push(`min-fresh=${this.minFresh}`);
    }
    return parts.join(', ');
  }
};

// src/lib/content-disposition.ts
var ContentDisposition = class {
  filename;
  filenameSplat;
  name;
  type;
  constructor(init) {
    if (init) {
      if (typeof init === 'string') {
        let params = parseParams(init);
        if (params.length > 0) {
          this.type = params[0][0];
          for (let [name, value] of params.slice(1)) {
            if (name === 'filename') {
              this.filename = value;
            } else if (name === 'filename*') {
              this.filenameSplat = value;
            } else if (name === 'name') {
              this.name = value;
            }
          }
        }
      } else {
        this.filename = init.filename;
        this.filenameSplat = init.filenameSplat;
        this.name = init.name;
        this.type = init.type;
      }
    }
  }
  /**
   * The preferred filename for the content, using the `filename*` parameter if present, falling back to the `filename` parameter.
   *
   * From [RFC 6266](https://tools.ietf.org/html/rfc6266):
   *
   * Many user agent implementations predating this specification do not understand the "filename*" parameter.
   * Therefore, when both "filename" and "filename*" are present in a single header field value, recipients SHOULD
   * pick "filename*" and ignore "filename". This way, senders can avoid special-casing specific user agents by
   * sending both the more expressive "filename*" parameter, and the "filename" parameter as fallback for legacy recipients.
   */
  get preferredFilename() {
    let filenameSplat = this.filenameSplat;
    if (filenameSplat) {
      let decodedFilename = decodeFilenameSplat(filenameSplat);
      if (decodedFilename) return decodedFilename;
    }
    return this.filename;
  }
  toString() {
    if (!this.type) {
      return '';
    }
    let parts = [this.type];
    if (this.name) {
      parts.push(`name=${quote(this.name)}`);
    }
    if (this.filename) {
      parts.push(`filename=${quote(this.filename)}`);
    }
    if (this.filenameSplat) {
      parts.push(`filename*=${quote(this.filenameSplat)}`);
    }
    return parts.join('; ');
  }
};
function decodeFilenameSplat(value) {
  let match = value.match(/^([\w-]+)'([^']*)'(.+)$/);
  if (!match) return null;
  let [, charset, , encodedFilename] = match;
  let decodedFilename = percentDecode(encodedFilename);
  try {
    let decoder = new TextDecoder(charset);
    let bytes = new Uint8Array(decodedFilename.split('').map((char) => char.charCodeAt(0)));
    return decoder.decode(bytes);
  } catch (error) {
    console.warn(`Failed to decode filename from charset ${charset}:`, error);
    return decodedFilename;
  }
}
function percentDecode(value) {
  return value.replace(/\+/g, ' ').replace(/%([0-9A-Fa-f]{2})/g, (_, hex) => {
    return String.fromCharCode(parseInt(hex, 16));
  });
}

// src/lib/content-type.ts
var ContentType = class {
  boundary;
  charset;
  mediaType;
  constructor(init) {
    if (init) {
      if (typeof init === 'string') {
        let params = parseParams(init);
        if (params.length > 0) {
          this.mediaType = params[0][0];
          for (let [name, value] of params.slice(1)) {
            if (name === 'boundary') {
              this.boundary = value;
            } else if (name === 'charset') {
              this.charset = value;
            }
          }
        }
      } else {
        this.boundary = init.boundary;
        this.charset = init.charset;
        this.mediaType = init.mediaType;
      }
    }
  }
  toString() {
    if (!this.mediaType) {
      return '';
    }
    let parts = [this.mediaType];
    if (this.charset) {
      parts.push(`charset=${quote(this.charset)}`);
    }
    if (this.boundary) {
      parts.push(`boundary=${quote(this.boundary)}`);
    }
    return parts.join('; ');
  }
};

// src/lib/cookie.ts
var Cookie = class {
  #map;
  constructor(init) {
    this.#map = /* @__PURE__ */ new Map();
    if (init) {
      if (typeof init === 'string') {
        let params = parseParams(init);
        for (let [name, value] of params) {
          this.#map.set(name, value ?? '');
        }
      } else if (isIterable(init)) {
        for (let [name, value] of init) {
          this.#map.set(name, value);
        }
      } else {
        for (let name of Object.getOwnPropertyNames(init)) {
          this.#map.set(name, init[name]);
        }
      }
    }
  }
  /**
   * An array of the names of the cookies in the header.
   */
  get names() {
    return Array.from(this.#map.keys());
  }
  /**
   * An array of the values of the cookies in the header.
   */
  get values() {
    return Array.from(this.#map.values());
  }
  /**
   * The number of cookies in the header.
   */
  get size() {
    return this.#map.size;
  }
  /**
   * Gets the value of a cookie with the given name from the header.
   * @param name The name of the cookie.
   * @returns The value of the cookie, or `null` if the cookie does not exist.
   */
  get(name) {
    return this.#map.get(name) ?? null;
  }
  /**
   * Sets a cookie with the given name and value in the header.
   * @param name The name of the cookie.
   * @param value The value of the cookie.
   */
  set(name, value) {
    this.#map.set(name, value);
  }
  /**
   * Removes a cookie with the given name from the header.
   * @param name The name of the cookie.
   */
  delete(name) {
    this.#map.delete(name);
  }
  /**
   * True if a cookie with the given name exists in the header.
   * @param name The name of the cookie.
   * @returns True if a cookie with the given name exists in the header.
   */
  has(name) {
    return this.#map.has(name);
  }
  /**
   * Removes all cookies from the header.
   */
  clear() {
    this.#map.clear();
  }
  entries() {
    return this.#map.entries();
  }
  [Symbol.iterator]() {
    return this.entries();
  }
  forEach(callback, thisArg) {
    for (let [name, value] of this) {
      callback.call(thisArg, name, value, this);
    }
  }
  toString() {
    let pairs = [];
    for (let [name, value] of this.#map) {
      pairs.push(`${name}=${quote(value)}`);
    }
    return pairs.join('; ');
  }
};

// src/lib/if-none-match.ts
var IfNoneMatch = class {
  tags = [];
  constructor(init) {
    if (init) {
      if (typeof init === 'string') {
        this.tags.push(...init.split(/\s*,\s*/).map(quoteEtag));
      } else if (Array.isArray(init)) {
        this.tags.push(...init.map(quoteEtag));
      } else {
        this.tags.push(...init.tags.map(quoteEtag));
      }
    }
  }
  /**
   * Checks if the header contains the given entity tag.
   *
   * Note: This method checks only for exact matches and does not consider wildcards.
   *
   * @param tag The entity tag to check for.
   * @returns `true` if the tag is present in the header, `false` otherwise.
   */
  has(tag) {
    return this.tags.includes(quoteEtag(tag));
  }
  /**
   * Checks if this header matches the given entity tag.
   *
   * @param tag The entity tag to check for.
   * @returns `true` if the tag is present in the header (or the header contains a wildcard), `false` otherwise.
   */
  matches(tag) {
    return this.has(tag) || this.tags.includes('*');
  }
  toString() {
    return this.tags.join(', ');
  }
};

// src/lib/set-cookie.ts
var SetCookie = class {
  domain;
  expires;
  httpOnly;
  maxAge;
  name;
  path;
  sameSite;
  secure;
  value;
  constructor(init) {
    if (init) {
      if (typeof init === 'string') {
        let params = parseParams(init);
        if (params.length > 0) {
          this.name = params[0][0];
          this.value = params[0][1];
          for (let [key, value] of params.slice(1)) {
            switch (key.toLowerCase()) {
              case 'domain':
                this.domain = value;
                break;
              case 'expires': {
                if (typeof value === 'string') {
                  let date = new Date(value);
                  if (isValidDate(date)) {
                    this.expires = date;
                  }
                }
                break;
              }
              case 'httponly':
                this.httpOnly = true;
                break;
              case 'max-age': {
                if (typeof value === 'string') {
                  let v = parseInt(value, 10);
                  if (!isNaN(v)) this.maxAge = v;
                }
                break;
              }
              case 'path':
                this.path = value;
                break;
              case 'samesite':
                if (typeof value === 'string' && /strict|lax|none/i.test(value)) {
                  this.sameSite = capitalize(value);
                }
                break;
              case 'secure':
                this.secure = true;
                break;
            }
          }
        }
      } else {
        this.domain = init.domain;
        this.expires = init.expires;
        this.httpOnly = init.httpOnly;
        this.maxAge = init.maxAge;
        this.name = init.name;
        this.path = init.path;
        this.sameSite = init.sameSite;
        this.secure = init.secure;
        this.value = init.value;
      }
    }
  }
  toString() {
    if (!this.name) {
      return '';
    }
    let parts = [`${this.name}=${quote(this.value || '')}`];
    if (this.domain) {
      parts.push(`Domain=${this.domain}`);
    }
    if (this.path) {
      parts.push(`Path=${this.path}`);
    }
    if (this.expires) {
      parts.push(`Expires=${this.expires.toUTCString()}`);
    }
    if (this.maxAge) {
      parts.push(`Max-Age=${this.maxAge}`);
    }
    if (this.secure) {
      parts.push('Secure');
    }
    if (this.httpOnly) {
      parts.push('HttpOnly');
    }
    if (this.sameSite) {
      parts.push(`SameSite=${this.sameSite}`);
    }
    return parts.join('; ');
  }
};

// src/lib/header-names.ts
var HeaderWordCasingExceptions = {
  ct: 'CT',
  etag: 'ETag',
  te: 'TE',
  www: 'WWW',
  x: 'X',
  xss: 'XSS',
};
function canonicalHeaderName(name) {
  return name
    .toLowerCase()
    .split('-')
    .map((word) => HeaderWordCasingExceptions[word] || word.charAt(0).toUpperCase() + word.slice(1))
    .join('-');
}

// src/lib/super-headers.ts
var CRLF = '\r\n';
var AcceptKey = 'accept';
var AcceptEncodingKey = 'accept-encoding';
var AcceptLanguageKey = 'accept-language';
var AcceptRangesKey = 'accept-ranges';
var AgeKey = 'age';
var CacheControlKey = 'cache-control';
var ConnectionKey = 'connection';
var ContentDispositionKey = 'content-disposition';
var ContentEncodingKey = 'content-encoding';
var ContentLanguageKey = 'content-language';
var ContentLengthKey = 'content-length';
var ContentTypeKey = 'content-type';
var CookieKey = 'cookie';
var DateKey = 'date';
var ETagKey = 'etag';
var ExpiresKey = 'expires';
var HostKey = 'host';
var IfModifiedSinceKey = 'if-modified-since';
var IfNoneMatchKey = 'if-none-match';
var IfUnmodifiedSinceKey = 'if-unmodified-since';
var LastModifiedKey = 'last-modified';
var LocationKey = 'location';
var RefererKey = 'referer';
var SetCookieKey = 'set-cookie';
var SuperHeaders = class _SuperHeaders extends Headers {
  #map;
  #setCookies = [];
  constructor(init) {
    super();
    this.#map = /* @__PURE__ */ new Map();
    if (init) {
      if (typeof init === 'string') {
        let lines = init.split(CRLF);
        for (let line of lines) {
          let match = line.match(/^([^:]+):(.*)/);
          if (match) {
            this.append(match[1].trim(), match[2].trim());
          }
        }
      } else if (isIterable(init)) {
        for (let [name, value] of init) {
          this.append(name, value);
        }
      } else if (typeof init === 'object') {
        for (let name of Object.getOwnPropertyNames(init)) {
          let value = init[name];
          let descriptor = Object.getOwnPropertyDescriptor(_SuperHeaders.prototype, name);
          if (descriptor?.set) {
            descriptor.set.call(this, value);
          } else {
            this.set(name, value.toString());
          }
        }
      }
    }
  }
  /**
   * Appends a new header value to the existing set of values for a header,
   * or adds the header if it does not already exist.
   *
   * [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/API/Headers/append)
   */
  append(name, value) {
    let key = name.toLowerCase();
    if (key === SetCookieKey) {
      this.#setCookies.push(value);
    } else {
      let existingValue = this.#map.get(key);
      this.#map.set(key, existingValue ? `${existingValue}, ${value}` : value);
    }
  }
  /**
   * Removes a header.
   *
   * [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/API/Headers/delete)
   */
  delete(name) {
    let key = name.toLowerCase();
    if (key === SetCookieKey) {
      this.#setCookies = [];
    } else {
      this.#map.delete(key);
    }
  }
  /**
   * Returns a string of all the values for a header, or `null` if the header does not exist.
   *
   * [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/API/Headers/get)
   */
  get(name) {
    let key = name.toLowerCase();
    if (key === SetCookieKey) {
      return this.getSetCookie().join(', ');
    } else {
      let value = this.#map.get(key);
      if (typeof value === 'string') {
        return value;
      } else if (value != null) {
        let str = value.toString();
        return str === '' ? null : str;
      } else {
        return null;
      }
    }
  }
  /**
   * Returns an array of all values associated with the `Set-Cookie` header. This is
   * useful when building headers for a HTTP response since multiple `Set-Cookie` headers
   * must be sent on separate lines.
   *
   * [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/API/Headers/getSetCookie)
   */
  getSetCookie() {
    return this.#setCookies.map((v) => (typeof v === 'string' ? v : v.toString()));
  }
  /**
   * Returns `true` if the header is present in the list of headers.
   *
   * [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/API/Headers/has)
   */
  has(name) {
    let key = name.toLowerCase();
    return key === SetCookieKey ? this.#setCookies.length > 0 : this.get(key) != null;
  }
  /**
   * Sets a new value for the given header. If the header already exists, the new value
   * will replace the existing value.
   *
   * [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/API/Headers/set)
   */
  set(name, value) {
    let key = name.toLowerCase();
    if (key === SetCookieKey) {
      this.#setCookies = [value];
    } else {
      this.#map.set(key, value);
    }
  }
  /**
   * Returns an iterator of all header keys (lowercase).
   *
   * [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/API/Headers/keys)
   */
  *keys() {
    for (let [key] of this) yield key;
  }
  /**
   * Returns an iterator of all header values.
   *
   * [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/API/Headers/values)
   */
  *values() {
    for (let [, value] of this) yield value;
  }
  /**
   * Returns an iterator of all header key/value pairs.
   *
   * [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/API/Headers/entries)
   */
  *entries() {
    for (let [key] of this.#map) {
      let str = this.get(key);
      if (str) yield [key, str];
    }
    for (let value of this.getSetCookie()) {
      yield [SetCookieKey, value];
    }
  }
  [Symbol.iterator]() {
    return this.entries();
  }
  /**
   * Invokes the `callback` for each header key/value pair.
   *
   * [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/API/Headers/forEach)
   */
  forEach(callback, thisArg) {
    for (let [key, value] of this) {
      callback.call(thisArg, value, key, this);
    }
  }
  /**
   * Returns a string representation of the headers suitable for use in a HTTP message.
   */
  toString() {
    let lines = [];
    for (let [key, value] of this) {
      lines.push(`${canonicalHeaderName(key)}: ${value}`);
    }
    return lines.join(CRLF);
  }
  // Header-specific getters and setters
  /**
   * The `Accept` header is used by clients to indicate the media types that are acceptable
   * in the response.
   *
   * [MDN `Accept` Reference](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Accept)
   *
   * [HTTP/1.1 Specification](https://datatracker.ietf.org/doc/html/rfc7231#section-5.3.2)
   */
  get accept() {
    return this.#getHeaderValue(AcceptKey, Accept);
  }
  set accept(value) {
    this.#setHeaderValue(AcceptKey, Accept, value);
  }
  /**
   * The `Accept-Encoding` header contains information about the content encodings that the client
   * is willing to accept in the response.
   *
   * [MDN `Accept-Encoding` Reference](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Accept-Encoding)
   *
   * [HTTP/1.1 Specification](https://datatracker.ietf.org/doc/html/rfc7231#section-5.3.4)
   */
  get acceptEncoding() {
    return this.#getHeaderValue(AcceptEncodingKey, AcceptEncoding);
  }
  set acceptEncoding(value) {
    this.#setHeaderValue(AcceptEncodingKey, AcceptEncoding, value);
  }
  /**
   * The `Accept-Language` header contains information about preferred natural language for the
   * response.
   *
   * [MDN `Accept-Language` Reference](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Accept-Language)
   *
   * [HTTP/1.1 Specification](https://datatracker.ietf.org/doc/html/rfc7231#section-5.3.5)
   */
  get acceptLanguage() {
    return this.#getHeaderValue(AcceptLanguageKey, AcceptLanguage);
  }
  set acceptLanguage(value) {
    this.#setHeaderValue(AcceptLanguageKey, AcceptLanguage, value);
  }
  /**
   * The `Accept-Ranges` header indicates the server's acceptance of range requests.
   *
   * [MDN `Accept-Ranges` Reference](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Accept-Ranges)
   *
   * [HTTP/1.1 Specification](https://datatracker.ietf.org/doc/html/rfc7233#section-2.3)
   */
  get acceptRanges() {
    return this.#getStringValue(AcceptRangesKey);
  }
  set acceptRanges(value) {
    this.#setStringValue(AcceptRangesKey, value);
  }
  /**
   * The `Age` header contains the time in seconds an object was in a proxy cache.
   *
   * [MDN `Age` Reference](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Age)
   *
   * [HTTP/1.1 Specification](https://datatracker.ietf.org/doc/html/rfc7234#section-5.1)
   */
  get age() {
    return this.#getNumberValue(AgeKey);
  }
  set age(value) {
    this.#setNumberValue(AgeKey, value);
  }
  /**
   * The `Cache-Control` header contains directives for caching mechanisms in both requests and responses.
   *
   * [MDN `Cache-Control` Reference](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control)
   *
   * [HTTP/1.1 Specification](https://datatracker.ietf.org/doc/html/rfc7234#section-5.2)
   */
  get cacheControl() {
    return this.#getHeaderValue(CacheControlKey, CacheControl);
  }
  set cacheControl(value) {
    this.#setHeaderValue(CacheControlKey, CacheControl, value);
  }
  /**
   * The `Connection` header controls whether the network connection stays open after the current
   * transaction finishes.
   *
   * [MDN `Connection` Reference](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Connection)
   *
   * [HTTP/1.1 Specification](https://datatracker.ietf.org/doc/html/rfc7230#section-6.1)
   */
  get connection() {
    return this.#getStringValue(ConnectionKey);
  }
  set connection(value) {
    this.#setStringValue(ConnectionKey, value);
  }
  /**
   * The `Content-Disposition` header is a response-type header that describes how the payload is displayed.
   *
   * [MDN `Content-Disposition` Reference](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Disposition)
   *
   * [RFC 6266](https://datatracker.ietf.org/doc/html/rfc6266)
   */
  get contentDisposition() {
    return this.#getHeaderValue(ContentDispositionKey, ContentDisposition);
  }
  set contentDisposition(value) {
    this.#setHeaderValue(ContentDispositionKey, ContentDisposition, value);
  }
  /**
   * The `Content-Encoding` header specifies the encoding of the resource.
   *
   * Note: If multiple encodings have been used, this value may be a comma-separated list. However, most often this
   * header will only contain a single value.
   *
   * [MDN `Content-Encoding` Reference](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Encoding)
   *
   * [HTTP/1.1 Specification](https://httpwg.org/specs/rfc9110.html#field.content-encoding)
   */
  get contentEncoding() {
    return this.#getStringValue(ContentEncodingKey);
  }
  set contentEncoding(value) {
    this.#setStringValue(ContentEncodingKey, Array.isArray(value) ? value.join(', ') : value);
  }
  /**
   * The `Content-Language` header describes the natural language(s) of the intended audience for the response content.
   *
   * Note: If the response content is intended for multiple audiences, this value may be a comma-separated list. However,
   * most often this header will only contain a single value.
   *
   * [MDN `Content-Language` Reference](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Language)
   *
   * [HTTP/1.1 Specification](https://httpwg.org/specs/rfc9110.html#field.content-language)
   */
  get contentLanguage() {
    return this.#getStringValue(ContentLanguageKey);
  }
  set contentLanguage(value) {
    this.#setStringValue(ContentLanguageKey, Array.isArray(value) ? value.join(', ') : value);
  }
  /**
   * The `Content-Length` header indicates the size of the entity-body in bytes.
   *
   * [MDN `Content-Length` Reference](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Length)
   *
   * [HTTP/1.1 Specification](https://datatracker.ietf.org/doc/html/rfc7230#section-3.3.2)
   */
  get contentLength() {
    return this.#getNumberValue(ContentLengthKey);
  }
  set contentLength(value) {
    this.#setNumberValue(ContentLengthKey, value);
  }
  /**
   * The `Content-Type` header indicates the media type of the resource.
   *
   * [MDN `Content-Type` Reference](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Type)
   *
   * [HTTP/1.1 Specification](https://datatracker.ietf.org/doc/html/rfc7231#section-3.1.1.5)
   */
  get contentType() {
    return this.#getHeaderValue(ContentTypeKey, ContentType);
  }
  set contentType(value) {
    this.#setHeaderValue(ContentTypeKey, ContentType, value);
  }
  /**
   * The `Cookie` request header contains stored HTTP cookies previously sent by the server with
   * the `Set-Cookie` header.
   *
   * [MDN `Cookie` Reference](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cookie)
   *
   * [HTTP/1.1 Specification](https://datatracker.ietf.org/doc/html/rfc6265#section-5.4)
   */
  get cookie() {
    return this.#getHeaderValue(CookieKey, Cookie);
  }
  set cookie(value) {
    this.#setHeaderValue(CookieKey, Cookie, value);
  }
  /**
   * The `Date` header contains the date and time at which the message was sent.
   *
   * [MDN `Date` Reference](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Date)
   *
   * [HTTP/1.1 Specification](https://datatracker.ietf.org/doc/html/rfc7231#section-7.1.1.2)
   */
  get date() {
    return this.#getDateValue(DateKey);
  }
  set date(value) {
    this.#setDateValue(DateKey, value);
  }
  /**
   * The `ETag` header provides a unique identifier for the current version of the resource.
   *
   * [MDN `ETag` Reference](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/ETag)
   *
   * [HTTP/1.1 Specification](https://datatracker.ietf.org/doc/html/rfc7232#section-2.3)
   */
  get etag() {
    return this.#getStringValue(ETagKey);
  }
  set etag(value) {
    this.#setStringValue(ETagKey, typeof value === 'string' ? quoteEtag(value) : value);
  }
  /**
   * The `Expires` header contains the date/time after which the response is considered stale.
   *
   * [MDN `Expires` Reference](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Expires)
   *
   * [HTTP/1.1 Specification](https://datatracker.ietf.org/doc/html/rfc7234#section-5.3)
   */
  get expires() {
    return this.#getDateValue(ExpiresKey);
  }
  set expires(value) {
    this.#setDateValue(ExpiresKey, value);
  }
  /**
   * The `Host` header specifies the domain name of the server and (optionally) the TCP port number.
   *
   * [MDN `Host` Reference](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Host)
   *
   * [HTTP/1.1 Specification](https://datatracker.ietf.org/doc/html/rfc7230#section-5.4)
   */
  get host() {
    return this.#getStringValue(HostKey);
  }
  set host(value) {
    this.#setStringValue(HostKey, value);
  }
  /**
   * The `If-Modified-Since` header makes a request conditional on the last modification date of the
   * requested resource.
   *
   * [MDN `If-Modified-Since` Reference](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/If-Modified-Since)
   *
   * [HTTP/1.1 Specification](https://datatracker.ietf.org/doc/html/rfc7232#section-3.3)
   */
  get ifModifiedSince() {
    return this.#getDateValue(IfModifiedSinceKey);
  }
  set ifModifiedSince(value) {
    this.#setDateValue(IfModifiedSinceKey, value);
  }
  /**
   * The `If-None-Match` header makes a request conditional on the absence of a matching ETag.
   *
   * [MDN `If-None-Match` Reference](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/If-None-Match)
   *
   * [HTTP/1.1 Specification](https://datatracker.ietf.org/doc/html/rfc7232#section-3.2)
   */
  get ifNoneMatch() {
    return this.#getHeaderValue(IfNoneMatchKey, IfNoneMatch);
  }
  set ifNoneMatch(value) {
    this.#setHeaderValue(IfNoneMatchKey, IfNoneMatch, value);
  }
  /**
   * The `If-Unmodified-Since` header makes a request conditional on the last modification date of the
   * requested resource.
   *
   * [MDN `If-Unmodified-Since` Reference](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/If-Unmodified-Since)
   *
   * [HTTP/1.1 Specification](https://datatracker.ietf.org/doc/html/rfc7232#section-3.4)
   */
  get ifUnmodifiedSince() {
    return this.#getDateValue(IfUnmodifiedSinceKey);
  }
  set ifUnmodifiedSince(value) {
    this.#setDateValue(IfUnmodifiedSinceKey, value);
  }
  /**
   * The `Last-Modified` header contains the date and time at which the resource was last modified.
   *
   * [MDN `Last-Modified` Reference](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Last-Modified)
   *
   * [HTTP/1.1 Specification](https://datatracker.ietf.org/doc/html/rfc7232#section-2.2)
   */
  get lastModified() {
    return this.#getDateValue(LastModifiedKey);
  }
  set lastModified(value) {
    this.#setDateValue(LastModifiedKey, value);
  }
  /**
   * The `Location` header indicates the URL to redirect to.
   *
   * [MDN `Location` Reference](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Location)
   *
   * [HTTP/1.1 Specification](https://datatracker.ietf.org/doc/html/rfc7231#section-7.1.2)
   */
  get location() {
    return this.#getStringValue(LocationKey);
  }
  set location(value) {
    this.#setStringValue(LocationKey, value);
  }
  /**
   * The `Referer` header contains the address of the previous web page from which a link to the
   * currently requested page was followed.
   *
   * [MDN `Referer` Reference](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Referer)
   *
   * [HTTP/1.1 Specification](https://datatracker.ietf.org/doc/html/rfc7231#section-5.5.2)
   */
  get referer() {
    return this.#getStringValue(RefererKey);
  }
  set referer(value) {
    this.#setStringValue(RefererKey, value);
  }
  /**
   * The `Set-Cookie` header is used to send cookies from the server to the user agent.
   *
   * [MDN `Set-Cookie` Reference](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie)
   *
   * [HTTP/1.1 Specification](https://datatracker.ietf.org/doc/html/rfc6265#section-4.1)
   */
  get setCookie() {
    let setCookies = this.#setCookies;
    for (let i = 0; i < setCookies.length; ++i) {
      if (typeof setCookies[i] === 'string') {
        setCookies[i] = new SetCookie(setCookies[i]);
      }
    }
    return setCookies;
  }
  set setCookie(value) {
    if (value != null) {
      this.#setCookies = (Array.isArray(value) ? value : [value]).map((v) =>
        typeof v === 'string' ? v : new SetCookie(v),
      );
    } else {
      this.#setCookies = [];
    }
  }
  // Helpers
  #getHeaderValue(key, ctor) {
    let value = this.#map.get(key);
    if (value !== void 0) {
      if (typeof value === 'string') {
        let obj2 = new ctor(value);
        this.#map.set(key, obj2);
        return obj2;
      } else {
        return value;
      }
    }
    let obj = new ctor();
    this.#map.set(key, obj);
    return obj;
  }
  #setHeaderValue(key, ctor, value) {
    if (value != null) {
      this.#map.set(key, typeof value === 'string' ? value : new ctor(value));
    } else {
      this.#map.delete(key);
    }
  }
  #getDateValue(key) {
    let value = this.#map.get(key);
    return value === void 0 ? null : new Date(value);
  }
  #setDateValue(key, value) {
    if (value != null) {
      this.#map.set(
        key,
        typeof value === 'string'
          ? value
          : (typeof value === 'number' ? new Date(value) : value).toUTCString(),
      );
    } else {
      this.#map.delete(key);
    }
  }
  #getNumberValue(key) {
    let value = this.#map.get(key);
    return value === void 0 ? null : parseInt(value, 10);
  }
  #setNumberValue(key, value) {
    if (value != null) {
      this.#map.set(key, typeof value === 'string' ? value : value.toString());
    } else {
      this.#map.delete(key);
    }
  }
  #getStringValue(key) {
    let value = this.#map.get(key);
    return value === void 0 ? null : value;
  }
  #setStringValue(key, value) {
    if (value != null) {
      this.#map.set(key, value);
    } else {
      this.#map.delete(key);
    }
  }
};
export {
  Accept,
  AcceptEncoding,
  AcceptLanguage,
  CacheControl,
  ContentDisposition,
  ContentType,
  Cookie,
  SuperHeaders as default,
  IfNoneMatch,
  SetCookie,
  SuperHeaders
};

