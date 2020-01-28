/* eslint-disable no-fallthrough */
/* eslint-disable no-bitwise */
/* eslint-disable no-plusplus */
/* eslint-disable no-underscore-dangle */
const { Transform } = require('stream');

let s = 0;
const STATE = {
  PARSER_UNINITIALIZED: s++,
  START: s++,
  START_BOUNDARY: s++,
  HEADER_FIELD_START: s++,
  HEADER_FIELD: s++,
  HEADER_VALUE_START: s++,
  HEADER_VALUE: s++,
  HEADER_VALUE_ALMOST_DONE: s++,
  HEADERS_ALMOST_DONE: s++,
  PART_DATA_START: s++,
  PART_DATA: s++,
  PART_END: s++,
  END: s++,
};

let f = 1;
const FBOUNDARY = { PART_BOUNDARY: f, LAST_BOUNDARY: (f *= 2) };

const LF = 10;
const CR = 13;
const SPACE = 32;
const HYPHEN = 45;
const COLON = 58;
const A = 97;
const Z = 122;

function lower(c) {
  // eslint-disable-next-line no-bitwise
  return c | 0x20;
}

Object.keys(STATE).forEach((stateName) => {
  exports[stateName] = STATE[stateName];
});

class MultipartParser extends Transform {
  constructor() {
    super({ readableObjectMode: true });
    this.boundary = null;
    this.boundaryChars = null;
    this.lookbehind = null;
    this.state = STATE.PARSER_UNINITIALIZED;

    this.index = null;
    this.flags = 0;
  }

  _final(callback) {
    if (
      (this.state === STATE.HEADER_FIELD_START && this.index === 0) ||
      (this.state === STATE.PART_DATA && this.index === this.boundary.length)
    ) {
      this.callback('partEnd');
      this.callback('end');
      callback();
    } else if (this.state !== STATE.END) {
      callback(
        new Error(
          `MultipartParser.end(): stream ended unexpectedly: ${this.explain()}`,
        ),
      );
    }
  }

  initWithBoundary(str) {
    this.boundary = Buffer.from(`\r\n--${str}`);
    this.lookbehind = Buffer.alloc(this.boundary.length + 8);
    this.state = STATE.START;
    this.boundaryChars = {};

    for (let i = 0; i < this.boundary.length; i++) {
      this.boundaryChars[this.boundary[i]] = true;
    }
  }

  // eslint-disable-next-line max-statements
  _transform(buffer, encoding, callback) {
    let i = 0;
    const len = buffer.length;
    let prevIndex = this.index;
    let { index } = this;
    let { state } = this;
    let { flags } = this;
    const { lookbehind } = this;
    const { boundary } = this;
    const { boundaryChars } = this;
    const boundaryLength = this.boundary.length;
    const boundaryEnd = boundaryLength - 1;
    const bufferLength = buffer.length;
    let c;
    let cl;

    const mark = (name) => {
      this[`${name}Mark`] = i;
    };
    const clear = (name) => {
      delete this[`${name}Mark`];
    };
    // eslint-disable-next-line no-var, no-redeclare, max-params
    var callback = (name, buf, start, end) => {
      if (start !== undefined && start === end) {
        return;
      }
      this.push({ name, buffer: buf, start, end });
    };
    const dataCallback = (name, shouldClear) => {
      const markSymbol = `${name}Mark`;
      if (!(markSymbol in this)) {
        return;
      }

      if (!shouldClear) {
        callback(name, buffer, this[markSymbol], buffer.length);
        this[markSymbol] = 0;
      } else {
        callback(name, buffer, this[markSymbol], i);
        delete this[markSymbol];
      }
    };

    for (i = 0; i < len; i++) {
      c = buffer[i];
      switch (state) {
        case STATE.PARSER_UNINITIALIZED:
          return i;
        case STATE.START:
          index = 0;
          state = STATE.START_BOUNDARY;
        case STATE.START_BOUNDARY:
          if (index === boundary.length - 2) {
            if (c === HYPHEN) {
              flags |= FBOUNDARY.LAST_BOUNDARY;
            } else if (c !== CR) {
              return i;
            }
            index++;
            break;
          } else if (index - 1 === boundary.length - 2) {
            if (flags & FBOUNDARY.LAST_BOUNDARY && c === HYPHEN) {
              callback('end');
              state = STATE.END;
              flags = 0;
            } else if (!(flags & FBOUNDARY.LAST_BOUNDARY) && c === LF) {
              index = 0;
              callback('partBegin');
              state = STATE.HEADER_FIELD_START;
            } else {
              return i;
            }
            break;
          }

          if (c !== boundary[index + 2]) {
            index = -2;
          }
          if (c === boundary[index + 2]) {
            index++;
          }
          break;
        case STATE.HEADER_FIELD_START:
          state = STATE.HEADER_FIELD;
          mark('headerField');
          index = 0;
        case STATE.HEADER_FIELD:
          if (c === CR) {
            clear('headerField');
            state = STATE.HEADERS_ALMOST_DONE;
            break;
          }

          index++;
          if (c === HYPHEN) {
            break;
          }

          if (c === COLON) {
            if (index === 1) {
              // empty header field
              return i;
            }
            dataCallback('headerField', true);
            state = STATE.HEADER_VALUE_START;
            break;
          }

          cl = lower(c);
          if (cl < A || cl > Z) {
            return i;
          }
          break;
        case STATE.HEADER_VALUE_START:
          if (c === SPACE) {
            break;
          }

          mark('headerValue');
          state = STATE.HEADER_VALUE;
        case STATE.HEADER_VALUE:
          if (c === CR) {
            dataCallback('headerValue', true);
            callback('headerEnd');
            state = STATE.HEADER_VALUE_ALMOST_DONE;
          }
          break;
        case STATE.HEADER_VALUE_ALMOST_DONE:
          if (c !== LF) {
            return i;
          }
          state = STATE.HEADER_FIELD_START;
          break;
        case STATE.HEADERS_ALMOST_DONE:
          if (c !== LF) {
            return i;
          }

          callback('headersEnd');
          state = STATE.PART_DATA_START;
          break;
        case STATE.PART_DATA_START:
          state = STATE.PART_DATA;
          mark('partData');
        case STATE.PART_DATA:
          prevIndex = index;

          if (index === 0) {
            // boyer-moore derrived algorithm to safely skip non-boundary data
            i += boundaryEnd;
            while (i < bufferLength && !(buffer[i] in boundaryChars)) {
              i += boundaryLength;
            }
            i -= boundaryEnd;
            c = buffer[i];
          }

          if (index < boundary.length) {
            if (boundary[index] === c) {
              if (index === 0) {
                dataCallback('partData', true);
              }
              index++;
            } else {
              index = 0;
            }
          } else if (index === boundary.length) {
            index++;
            if (c === CR) {
              // CR = part boundary
              flags |= FBOUNDARY.PART_BOUNDARY;
            } else if (c === HYPHEN) {
              // HYPHEN = end boundary
              flags |= FBOUNDARY.LAST_BOUNDARY;
            } else {
              index = 0;
            }
          } else if (index - 1 === boundary.length) {
            if (flags & FBOUNDARY.PART_BOUNDARY) {
              index = 0;
              if (c === LF) {
                // unset the PART_BOUNDARY flag
                flags &= ~FBOUNDARY.PART_BOUNDARY;
                callback('partEnd');
                callback('partBegin');
                state = STATE.HEADER_FIELD_START;
                break;
              }
            } else if (flags & FBOUNDARY.LAST_BOUNDARY) {
              if (c === HYPHEN) {
                callback('partEnd');
                callback('end');
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
            lookbehind[index - 1] = c;
          } else if (prevIndex > 0) {
            // if our boundary turned out to be rubbish, the captured lookbehind
            // belongs to partData
            callback('partData', lookbehind, 0, prevIndex);
            prevIndex = 0;
            mark('partData');

            // reconsider the current character even so it interrupted the sequence
            // it could be the beginning of a new sequence
            i--;
          }

          break;
        case STATE.END:
          break;
        default:
          return i;
      }
    }

    dataCallback('headerField');
    dataCallback('headerValue');
    dataCallback('partData');

    this.index = index;
    this.state = state;
    this.flags = flags;

    return len;
  }

  explain() {
    return `state = ${MultipartParser.stateToString(this.state)}`;
  }
}

// eslint-disable-next-line consistent-return
MultipartParser.stateToString = (stateNumber) => {
  // eslint-disable-next-line no-restricted-syntax, guard-for-in
  for (const stateName in STATE) {
    const number = STATE[stateName];
    if (number === stateNumber) return stateName;
  }
};
exports.MultipartParser = MultipartParser;
