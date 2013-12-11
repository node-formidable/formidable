if (global.GENTLY) require = GENTLY.hijack(require);

var AMPERSAND = 38,
    EQUALS = 61;

function QuerystringParser(maxKeys, maxFieldSize) {
    this.maxKeys = maxKeys;
    this.maxFieldLength = maxFieldSize;
    this.buffer = null;
    this.fieldCount = 0;
    this.sectionStart = 0;
    this.key = '';
    this.readingKey = true;
}
exports.QuerystringParser = QuerystringParser;

QuerystringParser.prototype.write = function (buff) {
    var buffer = buff;
    var len = buff.length;
    if(this.buffer && this.buffer.length) {
        //we have some data left over from the last write which we are in the middle of processing
        len += this.buffer.length;
        buffer = Buffer.concat([this.buffer, buff], len)
    }

    for (var i = this.buffer.length || 0; i < len; i++) {
        var c = buffer[i];
        if(this.readingKey) {
            //KEY, check for =
            if(c===EQUALS) {
                this.key = this.getSection(buffer, i);
                this.readingKey = false;
                this.sectionStart = i + 1
            }
            else if(c===AMPERSAND) {
                //just key, no value. Prepare to read another key
                this.emitField(this.getSection(buffer, i));
                this.sectionStart = i + 1
            }
        } else {
            //VALUE, check for &
            if(c===AMPERSAND) {
                this.emitField(this.key, this.getSection(buffer, i));
                this.sectionStart = i + 1;
            }
        }

        if(this.maxFieldLength && i - this.sectionStart === this.maxFieldLength) {
            return new Error((this.readingKey ? 'Key' : 'Value for ' + this.key) + ' longer than maxFieldLength')
        }
    }

    //Prepare the remaining key or value (from sectionStart to the end) for the next write() or for end()
    len -= this.sectionStart;
    if(len){
        // i.e. Unless the last character was a & or =
        this.buffer = new Buffer(len);
        buffer.copyTo(this.buffer, 0, this.sectionStart); //Can we use slice or will it get overridden?
    }
    else this.buffer = null;

    this.sectionStart = 0;
    return buff.length;
};

QuerystringParser.prototype.end = function () {
    //Emit the last field
    if(this.readingKey) {
        //we only have a key if there's something in the buffer. We definitely have no value
        this.buffer && this.buffer.length && this.emitField(this.buffer.toString('ascii'));
    } else {
        //We have a key, we may or may not have a value
        this.emitField(this.key, this.buffer && this.buffer.length && this.buffer.toString('ascii'));
    }

    this.onEnd();
};

/**
 * Parses the buffer from this.sectionStart to i (exclusive)
 * @param buffer
 * @param i Index of the separator / exclusive upper index
 * @returns {string}
 */
QuerystringParser.prototype.getSection = function(buffer, i) {
    if(i===this.sectionStart) return '';
    
    return buffer.toString('ascii', this.sectionStart, i);
};

QuerystringParser.prototype.emitField = function(key, val) {
    this.onField(key, val || '');
    this.key = '';
    this.readingKey = true;

    if(this.fieldCount++ === this.maxKeys) {
        //silently ignore the rest of the request
        this.end = this.onEnd;
        this.write = function(buff) {
            return buff.length
        };
    }
};
