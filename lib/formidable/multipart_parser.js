var sys = require('sys')
  , Buffer = require('buffer').Buffer

  , s = 0
  , S =
    { PARSER_UNINITIALIZED: s++
    , START_MESSAGE: s++
    , PART_BEGIN: s++
    // , PART_BEGIN_HYPEN: s++
    // , PART_BEGIN_BOUNDARY: s++
    , HEADER_FIELD_START: s++
    , HEADER_FIELD: s++
    , HEADER_VALUE_START: s++
    , HEADER_VALUE: s++
    , HEADER_VALUE_ALMOST_DONE: s++
    , HEADERS_ALMOST_DONE: s++
    , PART_DATA_START: s++
    , PART_DATA: s++
    , PART_END: s++
    }

  , f = 1
  , F =
    { PART_DATA: f
    }

  , LF = 10
  , CR = 13
  , SPACE = 32
  , HYPHEN = 45
  , COLON = 58
  , SEMICOLON = 59
  , EQUALSIGN = 61
  , A = 97
  , Z = 122

  , lower = function(c) {
      return c | 0x20;
    };

for (var s in S) {
  exports[s] = S[s];
}

var MultipartParser = exports.MultipartParser = function() {
  this.boundary = null;
  this.state = S.PARSER_UNINITIALIZED;

  this.index = null;
  this.mark = null;
  this.flags = 0;
};

MultipartParser.prototype.initWithBoundary = function(str) {
  this.boundary = new Buffer(Buffer.byteLength(str, 'ascii'));
  this.boundary.write(str, 'ascii', 0);
  this.state = S.STREAM_BEGIN;
};

MultipartParser.prototype.write = function(buffer) {
  var self = this
    , i = 0
    , len = buffer.length
    , index = this.index
    , state = this.state
    , flags = this.flags
    , c
    , cl

    , mark = function(name) {
        self[name+'Mark'] = i;
      }
    , callback = function(name, buffer, start, end) {
        var callbackSymbol = 'on'+name.substr(0, 1).toUpperCase()+name.substr(1);
        if (callbackSymbol in self) {
          self[callbackSymbol](buffer, start, end);
        }
      }
    , dataCallback = function(name, clear) {
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
      };

  for (i = 0; i < len; i++) {
    c = buffer[i];
    switch (state) {
      case S.PARSER_UNINITIALIZED:
        return 0;
      case S.MESSAGE_BEGIN:
        if (c != HYPHEN) {
          return 0;
        }
        state = S.PART_BEGIN;
        index = 1;
        break;
      case S.PART_BEGIN:
        index++;
        if (index <= 2) {
          if (c != HYPHEN) {
            return 0;
          }
          break;
        }

        if (index - 2 <= this.boundary.length) {
          if (this.boundary[index-3] != c) {
            return 0;
          }
          break;
        }

        switch (index - this.boundary.length - 2) {
          case 1:
            if (c != CR) {
              return 0;
            }
            break;
          case 2:
            if (c != LF) {
              return 0;
            }

            index = 0;
            callback('partBegin');
            state = S.HEADER_FIELD_START;
            break;
        }
        break;
      case S.HEADER_FIELD_START:
        state = S.HEADER_FIELD;
        mark('headerField');
      case S.HEADER_FIELD:
        if (c == HYPHEN) {
          break;
        }

        if (c == COLON) {
          dataCallback('headerField', true);
          state = S.HEADER_VALUE_START;
          break;
        }

        cl = lower(c);
        if (cl < A || cl > Z) {
          return 0;
        }
        break;
      case S.HEADER_VALUE_START:
        if (c == SPACE) {
          break;
        }

        if (c == CR) {
          state = S.HEADERS_ALMOST_DONE;
          break;
        }

        mark('headerValue');
        state = S.HEADER_VALUE;
      case S.HEADER_VALUE:
        if (c == CR) {
          dataCallback('headerValue', true);
          state = S.HEADER_VALUE_ALMOST_DONE;
        }
        break;
      case S.HEADER_VALUE_ALMOST_DONE:
        if (c != LF) {
          return 0;
        }
        state = S.HEADER_VALUE_START;
        break;
      case S.HEADERS_ALMOST_DONE:
        if (c != LF) {
          return 0;
        }

        state = S.PART_DATA_START;
        break;
      case S.PART_DATA_START:
        flags |= F.PART_DATA;
        state = S.PART_DATA
        mark('partData');
      case S.PART_DATA:
        switch (index) {
          case 0:
            if (c == CR) {
              index++;
            }
            break;
          case 1:
            index = 0;
            if (c == LF) {
              // i = i - 2;
              p(i);
              dataCallback('partData');
              i = i + 2;
              state = S.PART_BEGIN;
            }
            break;
        }

        // state = S.PART_BEGIN;
        
        break;
      default:
        return 0;
    }
  }

  dataCallback('headerField');
  dataCallback('headerValue');
  dataCallback('partData');

  this.index = index;
  this.state = state;
  this.flags = flags;

  return len;
};