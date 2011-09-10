var properFilename = '/ \\ ? % * | " < > . ☃ ; \' @ # $ ^ & ( ) - _ = + { } [ ] ` ~.txt';

function expect(filename) {
  return [
    {type: 'field', name: 'title', value: 'Weird filename'},
    {type: 'file', name: 'upload', filename: filename, fixture: properFilename},
  ];
};

var webkit = " ? % * | \" < > . ? ; ' @ # $ ^ & ( ) - _ = + { } [ ] ` ~.txt";

module.exports = {
  'osx-chrome-13.http'   : expect(webkit),
  'osx-firefox-3.6.http' : expect(" ? % * | \" < > . &#9731; ; ' @ # $ ^ & ( ) - _ = + { } [ ] ` ~.txt"),
  'osx-safari-5.http'    : expect(webkit),
  'xp-chrome-12.http'    : expect(webkit),
  'xp-ie-7.http'         : expect(" ? % * | \" < > . &#9731; ; ' @ # $ ^ & ( ) - _ = + { } [ ] ` ~.txt"),
  'xp-ie-8.http'         : expect(" ? % * | \" < > . &#9731; ; ' @ # $ ^ & ( ) - _ = + { } [ ] ` ~.txt"),
  'xp-safari-5.http'     : expect(webkit),
};
