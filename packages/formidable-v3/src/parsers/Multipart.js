/* eslint-disable prefer-reflect */
/* eslint-disable node/callback-return */
/* eslint-disable no-fallthrough */
/* eslint-disable no-bitwise */
/* eslint-disable no-plusplus */
/* eslint-disable no-underscore-dangle */
/* eslint-disable perfectionist/sort-objects */

import * as errors from '../FormidableError.js';
import FormidableError from '../FormidableError.js';

const STATE = {
  START_BOUNDARY: 1,
  HEADER_FIELD_START: 2,
  HEADER_FIELD: 3,
  HEADER_VALUE_START: 4,
  HEADER_VALUE: 5,
  HEADER_VALUE_ALMOST_DONE: 6,
  HEADERS_ALMOST_DONE: 7,
  PART_DATA_START: 8,
  PART_DATA: 9,
  END: 10,
};

const FBOUNDARY = {
  PART_BOUNDARY: 1,
  LAST_BOUNDARY: 2,
};

const LF = 10;
const CR = 13;
const SPACE = 32;
const HYPHEN = 45;
const COLON = 58;
const A = 97;
const Z = 122;

function noop() {}
function lower(c) {
  return c | 0x20;
}

export class FormidableParser {
  constructor(boundary, hooks = {}) {
    if (!boundary) {
      throw new FormidableError(
        'FormidableParser: boundary is required',
        errors.missingMultipartBoundary,
        500,
      );
    }

    this.index = 0;
    this.flags = 0;
    this.boundaryChars = {};

    this.onHeaderEnd = hooks.onHeaderEnd || noop;
    this.onHeaderField = hooks.onHeaderField || noop;
    this.onHeadersDone = hooks.onHeadersDone || noop;
    this.onHeaderValue = hooks.onHeaderValue || noop;
    this.onPartStart = hooks.onPartStart || noop;
    this.onPartData = hooks.onPartData || noop;
    this.onPartEnd = hooks.onPartEnd || noop;
    this.onFinish = hooks.onFinish || noop;
    this.onError = hooks.onError; // ?NOTE: intentionally without noop; we throw if hooks.onError is not set

    const fullBoundary = `\r\n--${boundary}`;
    const ui8a = new Uint8Array(fullBoundary.length);
    for (let i = 0; i < fullBoundary.length; i++) {
      ui8a[i] = fullBoundary.charCodeAt(i);
      this.boundaryChars[ui8a[i]] = true;
    }

    this.boundary = ui8a;
    this.lookbehind = new Uint8Array(this.boundary.length + 8);
    this.state = STATE.START_BOUNDARY;
  }

  async _onError(err) {
    // this.state = STATE.END;
    // this.flags = 0;
    // this.index = 0;

    if (this.hooks.onError) {
      await this.hooks.onError?.(err);
    } else {
      throw err;
    }
  }

  _endUnexpected() {
    return new FormidableError(
      `FormidableParser: unexpected error - ${this.explain()}`,
      errors.malformedMultipart,
      400,
    );
  }

  // eslint-disable-next-line max-statements, complexity
  async write(chunk) {
    let i = 0;
    let prevIndex = this.index;
    let { flags, index, state } = this;
    const { boundary, boundaryChars, lookbehind } = this;
    const boundaryLength = boundary.length;
    const boundaryEnd = boundaryLength - 1;
    const bufferLength = chunk.byteLength;

    let char = null;
    let cl = null;

    const setMark = (name, idx) => {
      this[`${name}Mark`] = typeof idx === 'number' ? idx : i;
    };

    const clearMark = (name) => {
      delete this[`${name}Mark`];
    };

    const hookFn = async (name, start, end, ui8a) => {
      if (start === undefined || start !== end) {
        try {
          await this[name]?.(ui8a && ui8a.subarray ? ui8a.subarray(start, end) : new Uint8Array(0), start, end, ui8a);
        } catch (err) {
          await this._onError(err);
        }
      }
    };

    const dataHookFn = async (name, shouldClear) => {
      const markSymbol = `${name}Mark`;
      if (!(markSymbol in this)) {
        return;
      }

      if (shouldClear) {
        await hookFn(name, this[markSymbol], i, chunk);
        clearMark(name);
      } else {
        await hookFn(name, this[markSymbol], chunk.length, chunk);
        setMark(name, 0);
      }
    };

    for (i = 0; i < bufferLength; i++) {
      char = chunk[i];

      switch (state) {
        case STATE.START: {
          index = 0;
          state = STATE.START_BOUNDARY;
        }
        case STATE.START_BOUNDARY: {
          if (index === boundary.length - 2) {
            if (char === HYPHEN) {
              flags |= FBOUNDARY.LAST_BOUNDARY;
            } else if (char !== CR) {
              await this._onError(this._endUnexpected());
              return;
            }
            index++;
            break;
          } else if (index - 1 === boundary.length - 2) {
            if (flags & FBOUNDARY.LAST_BOUNDARY && char === HYPHEN) {
              await hookFn('onFinish');
              state = STATE.END;
              flags = 0;
            } else if (!(flags & FBOUNDARY.LAST_BOUNDARY) && char === LF) {
              index = 0;
              await hookFn('onPartStart');
              state = STATE.HEADER_FIELD_START;
            } else {
              await this._onError(this._endUnexpected());
              return;
            }
            break;
          }

          if (char !== boundary[index + 2]) {
            index = -2;
          }
          if (char === boundary[index + 2]) {
            index++;
          }
          break;
        }
        case STATE.HEADER_FIELD_START: {
          state = STATE.HEADER_FIELD;
          setMark('onHeaderField');
          index = 0;
        }
        case STATE.HEADER_FIELD: {
          if (char === CR) {
            clearMark('onHeaderField');
            state = STATE.HEADERS_ALMOST_DONE;
            break;
          }

          index++;
          if (char === HYPHEN) {
            break;
          }

          if (char === COLON) {
            if (index === 1) {
              // empty header field
              await this._onError(this._endUnexpected());
              return;
            }
            await dataHookFn('onHeaderField', true);
            state = STATE.HEADER_VALUE_START;
            break;
          }

          cl = lower(char);
          if (cl < A || cl > Z) {
            await this._onError(this._endUnexpected());
            return;
          }
          break;
        }
        case STATE.HEADER_VALUE_START: {
          if (char === SPACE) {
            break;
          }

          setMark('onHeaderValue');
          state = STATE.HEADER_VALUE;
          break;
        }
        case STATE.HEADER_VALUE: {
          if (char === CR) {
            await dataHookFn('onHeaderValue', true);
            await hookFn('onHeaderEnd');
            state = STATE.HEADER_VALUE_ALMOST_DONE;
          }
          break;
        }
        case STATE.HEADER_VALUE_ALMOST_DONE: {
          if (char !== LF) {
            await this._onError(this._endUnexpected());
            return;
          }
          state = STATE.HEADER_FIELD_START;
          break;
        }
        case STATE.HEADERS_ALMOST_DONE: {
          if (char !== LF) {
            await this._onError(this._endUnexpected());
            return;
          }

          await hookFn('onHeadersDone');
          state = STATE.PART_DATA_START;
          break;
        }
        case STATE.PART_DATA_START: {
          state = STATE.PART_DATA;
          setMark('onPartData');
          // ! fallthrough !!!!!!!!!!!!!
        }
        case STATE.PART_DATA: {
          prevIndex = index;

          if (index === 0) {
            // boyer-moore derived algorithm to safely skip non-boundary data
            i += boundaryEnd;
            while (i < this.bufferLength && !(chunk[i] in boundaryChars)) {
              i += boundaryLength;
            }
            i -= boundaryEnd;
            char = chunk[i];
          }

          if (index < boundary.length) {
            if (boundary[index] === char) {
              if (index === 0) {
                await dataHookFn('onPartData', true);
              }
              index++;
            } else {
              index = 0;
            }
          } else if (index === boundary.length) {
            index++;
            if (char === CR) {
              // CR = part boundary
              flags |= FBOUNDARY.PART_BOUNDARY;
            } else if (char === HYPHEN) {
              // HYPHEN = end boundary
              flags |= FBOUNDARY.LAST_BOUNDARY;
            } else {
              index = 0;
            }
          } else if (index - 1 === boundary.length) {
            if (flags & FBOUNDARY.PART_BOUNDARY) {
              index = 0;
              if (char === LF) {
                // unset the PART_BOUNDARY flag
                flags &= ~FBOUNDARY.PART_BOUNDARY;

                await hookFn('onPartEnd');
                await hookFn('onPartStart');
                state = STATE.HEADER_FIELD_START;
                break;
              }
            } else if (flags & FBOUNDARY.LAST_BOUNDARY) {
              if (char === HYPHEN) {
                await hookFn('onPartEnd');
                await hookFn('onFinish');
                state = STATE.END;
                flags = 0;
              } else {
                index = 0;
              }
            } else {
              index = 0;
            }
          }

          if (index > 0) {
            // when matching a possible boundary, keep a lookbehind reference
            // in case it turns out to be a false lead
            lookbehind[index - 1] = char;
          } else if (prevIndex > 0) {
            // if our boundary turned out to be rubbish, the captured lookbehind
            // belongs to partData
            const _lookbehind = new Uint8Array(lookbehind.buffer, lookbehind.byteOffset, lookbehind.byteLength);
            await hookFn('onPartData', 0, prevIndex, _lookbehind);
            prevIndex = 0;
            setMark('onPartData');

            // reconsider the current character even so it interrupted the sequence
            // it could be the beginning of a new sequence
            i--;
          }

          break;
        }
        case STATE.END: {
          break;
        }
        default: {
          await this._onError(this._endUnexpected());
        }
      }
    }

    await dataHookFn('onHeaderField');
    await dataHookFn('onHeaderValue');
    await dataHookFn('onPartData');

    this.index = index;
    this.state = state;
    this.flags = flags;

    return bufferLength;
  }

  explain() {
    return `state = ${Object.entries(STATE).find(([_k, v]) => v === this.state)[0]} (${this.state}), index = ${this.index}`;
  }
}
