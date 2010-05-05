var sys = require('sys')
  , Buffer = require('buffer').Buffer

  , s = 0
  , S =
    { PARSER_UNINITIALIZED: s++
    , START_MESSAGE: s++
    , PART_BEGIN: s++
    , HEADER_FIELD_START: s++
    , HEADER_FIELD: s++
    , HEADER_VALUE_START: s++
    , HEADER_VALUE: s++
    , HEADER_VALUE_ALMOST_DONE: s++
    , HEADERS_ALMOST_DONE: s++
    , PART_DATA_START: s++
    , PART_DATA: s++
    , PART_END: s++
    , END: s++
    }

  , f = 1
  , F =
    { PART_BOUNDARY: f
    , LAST_BOUNDARY: f *= 2
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
  this.lookbehind = null;
  this.state = S.PARSER_UNINITIALIZED;

  this.index = null;
  this.mark = null;
  this.flags = 0;
};

MultipartParser.prototype.initWithBoundary = function(str) {
  this.boundary = new Buffer(Buffer.byteLength(str, 'ascii'));
  this.boundary.write(str, 'ascii', 0);
  this.lookbehind = new Buffer(this.boundary.length+8);
  this.state = S.STREAM_BEGIN;
};

MultipartParser.prototype.write = function(buffer) {
  var self = this
    , i = 0
    , len = buffer.length
    , prevIndex = this.index
    , index = this.index
    , state = this.state
    , flags = this.flags
    , lookbehind = this.lookbehind
    , c
    , cl

    , mark = function(name) {
        self[name+'Mark'] = i;
      }
    , clear = function(name) {
        delete self[name+'Mark'];
      }
    , callback = function(name, buffer, start, end) {
        if (start !== undefined && start === end) {
          return;
        }

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
        if (c == CR) {
          clear('headerField');
          state = S.HEADERS_ALMOST_DONE;
          break;
        }

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
        state = S.HEADER_FIELD_START;
        break;
      case S.HEADERS_ALMOST_DONE:
        if (c != LF) {
          return 0;
        }

        state = S.PART_DATA_START;
        break;
      case S.PART_DATA_START:
        state = S.PART_DATA
        mark('partData');
      case S.PART_DATA:
        prevIndex = index;

        // a boundary sequence begins with a \r
        if (index == 0) {
          if (c != CR) {
            break;
          }

          dataCallback('partData', true);
          index++;
        } else if (index == 1) {
          // followed by a \n
          if (c == LF) {
            index++;
          } else {
            index = 0;
          }
        } else if (index == 2 || index == 3) {
          // then 2 hypen
          if (c == HYPHEN) {
            index++;
          } else {
            index = 0;
          }
        } else if (index - 4 < this.boundary.length) {
          // then the actual boundary
          if (this.boundary[index-4] == c) {
            index++;
          } else {
            index = 0;
          }
        } else if (index - 4 == this.boundary.length) {
          index++;
          if (c == CR) {
            // CR = part boundary
            this.flags |= F.PART_BOUNDARY;
          } else if (c == HYPHEN) {
            // HYPHEN = end boundary
            this.flags |= F.LAST_BOUNDARY;
          } else {
            index = 0;
          }
        } else if (index - 4 - this.boundary.length == 1)  {
          if (this.flags & F.PART_BOUNDARY) {
            index = 0;
            if (c == LF) {
              // unset the PART_BOUNDARY flag
              this.flags &= ~F.PART_BOUNDARY;
              callback('partEnd');
              callback('partBegin');
              state = S.HEADER_FIELD_START;
              break;
            }
          } else if (this.flags & F.LAST_BOUNDARY) {
            if (c == HYPHEN) {
              index++;
            } else {
              index = 0;
            }
          }
        } else if (index - 4 - this.boundary.length == 2)  {
          if (c == CR) {
            index++;
          } else {
            index = 0;
          }
        } else if (index - 4 - this.boundary.length == 3)  {
          index = 0;
          if (c == LF) {
            callback('partEnd');
            callback('end');
            state = S.END;
            break;
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
        }
        
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