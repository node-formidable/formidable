module.exports = MultipartParser;

var PARSER_UNINITIALIZED = 0
  , START = 1
  , START_BOUNDARY = 2
  , HEADER_FIELD_START = 3
  , HEADER_FIELD = 4
  , HEADER_VALUE_START = 5
  , HEADER_VALUE = 6
  , HEADER_VALUE_ALMOST_DONE = 7
  , HEADERS_ALMOST_DONE = 8
  , PART_DATA_START = 9
  , PART_DATA = 10
  , PART_END = 11
  , END = 12

  , PART_BOUNDARY = 1
  , LAST_BOUNDARY = 2

  , LF = 10
  , CR = 13
  , SPACE = 32
  , HYPHEN = 45
  , COLON = 58
  , A = 97
  , Z = 122

  , stream = require('stream')
  , util = require('util')

util.inherits(MultipartParser, stream.Writable);
function MultipartParser() {
  stream.Writable.call(this);

  this.boundary = null;
  this.boundaryChars = null;
  this.lookbehind = null;
  this.state = PARSER_UNINITIALIZED;

  this.index = null;
  this.flags = 0;
}

MultipartParser.prototype.initWithBoundary = function(str) {
  this.boundary = new Buffer(str.length+4);
  this.boundary.write('\r\n--', 'ascii', 0);
  this.boundary.write(str, 'ascii', 4);
  this.lookbehind = new Buffer(this.boundary.length+8);
  this.state = START;

  this.boundaryChars = {};
  for (var i = 0; i < this.boundary.length; i++) {
    this.boundaryChars[this.boundary[i]] = true;
  }
};

MultipartParser.prototype._write = function(buffer, encoding, cb) {
  var self = this
    , i = 0
    , len = buffer.length
    , prevIndex = this.index
    , index = this.index
    , state = this.state
    , flags = this.flags
    , lookbehind = this.lookbehind
    , boundary = this.boundary
    , boundaryChars = this.boundaryChars
    , boundaryLength = this.boundary.length
    , boundaryEnd = boundaryLength - 1
    , bufferLength = buffer.length
    , c
    , cl

  for (i = 0; i < len; i++) {
    c = buffer[i];
    switch (state) {
      case PARSER_UNINITIALIZED:
        return cb(new Error("Parser uninitialized"));
      case START:
        index = 0;
        state = START_BOUNDARY;
        /* falls through */
      case START_BOUNDARY:
        if (index === boundaryLength - 2) {
          if (c !== CR) return cb(new Error("Expected CR Received " + c));
          index++;
          break;
        } else if (index === boundaryLength - 1) {
          if (c !== LF) return cb(new Error("Expected LF Received " + c));
          index = 0;
          callback('partBegin');
          state = HEADER_FIELD_START;
          break;
        }

        if (c !== boundary[index+2]) index = -2;
        if (c === boundary[index+2]) index++;
        break;
      case HEADER_FIELD_START:
        state = HEADER_FIELD;
        mark('headerField');
        index = 0;
        /* falls through */
      case HEADER_FIELD:
        if (c === CR) {
          clear('headerField');
          state = HEADERS_ALMOST_DONE;
          break;
        }

        index++;
        if (c === HYPHEN) break;

        if (c === COLON) {
          if (index === 1) {
            // empty header field
            cb(new Error("Empty header field"));
            return;
          }
          dataCallback('headerField', true);
          state = HEADER_VALUE_START;
          break;
        }

        cl = lower(c);
        if (cl < A || cl > Z) {
          cb(new Error("Expected alphabetic character, received " + c));
        }
        break;
      case HEADER_VALUE_START:
        if (c === SPACE) break;

        mark('headerValue');
        state = HEADER_VALUE;
        /* falls through */
      case HEADER_VALUE:
        if (c === CR) {
          dataCallback('headerValue', true);
          callback('headerEnd');
          state = HEADER_VALUE_ALMOST_DONE;
        }
        break;
      case HEADER_VALUE_ALMOST_DONE:
        if (c !== LF) return cb(new Error("Expected LF Received " + c));
        state = HEADER_FIELD_START;
        break;
      case HEADERS_ALMOST_DONE:
        if (c !== LF) return cb(new Error("Expected LF Received " + c));
        callback('headersEnd');
        state = PART_DATA_START;
        break;
      case PART_DATA_START:
        state = PART_DATA;
        mark('partData');
        /* falls through */
      case PART_DATA:
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

        if (index < boundaryLength) {
          if (boundary[index] === c) {
            if (index === 0) {
              dataCallback('partData', true);
            }
            index++;
          } else {
            index = 0;
          }
        } else if (index === boundaryLength) {
          index++;
          if (c === CR) {
            // CR = part boundary
            flags |= PART_BOUNDARY;
          } else if (c === HYPHEN) {
            // HYPHEN = end boundary
            flags |= LAST_BOUNDARY;
          } else {
            index = 0;
          }
        } else if (index - 1 === boundaryLength)  {
          if (flags & PART_BOUNDARY) {
            index = 0;
            if (c === LF) {
              // unset the PART_BOUNDARY flag
              flags &= ~PART_BOUNDARY;
              callback('partEnd');
              callback('partBegin');
              state = HEADER_FIELD_START;
              break;
            }
          } else if (flags & LAST_BOUNDARY) {
            if (c === HYPHEN) {
              callback('partEnd');
              callback('end');
              state = END;
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
          lookbehind[index-1] = c;
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
      case END:
        break;
      default:
        cb(new Error("Parser has invalid state."));
    }
  }

  dataCallback('headerField');
  dataCallback('headerValue');
  dataCallback('partData');

  this.index = index;
  this.state = state;
  this.flags = flags;

  cb();

  function mark(name) {
    self[name+'Mark'] = i;
  }
  function clear(name) {
    delete self[name+'Mark'];
  }
  function callback(name, buffer, start, end) {
    if (start !== undefined && start === end) {
      return;
    }

    var callbackSymbol = 'on'+name.substr(0, 1).toUpperCase()+name.substr(1);
    if (callbackSymbol in self) {
      self[callbackSymbol](buffer, start, end);
    }
  }
  function dataCallback(name, clear) {
    var markSymbol = name+'Mark';
    if (!(markSymbol in self)) {
      return;
    }

    if (!clear) {
      callback(name, buffer, self[markSymbol], buffer.length);
      self[markSymbol] = 0;
    } else {
      callback(name, buffer, self[markSymbol], i);
      delete self[markSymbol];
    }
  }
};

MultipartParser.prototype.end = function() {
  var callback = function(self, name) {
    var callbackSymbol = 'on'+name.substr(0, 1).toUpperCase()+name.substr(1);
    if (callbackSymbol in self) {
      self[callbackSymbol]();
    }
  };
  if ((this.state === HEADER_FIELD_START && this.index === 0) ||
      (this.state === PART_DATA && this.index === this.boundary.length)) {
    callback(this, 'partEnd');
    callback(this, 'end');
  } else if (this.state !== END) {
    return new Error('MultipartParser.end(): stream ended unexpectedly: ' + this.explain());
  }
};

MultipartParser.prototype.explain = function() {
  return 'state = ' + MultipartParser.stateToString(this.state);
};

function lower(c) {
  return c | 0x20;
}
