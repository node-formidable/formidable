var properFilename = '/ \ ? % * | " < > . ☃ ; \' @ # $ ^ & ( ) - _ = + { } [ ] ` ~.txt';

function expect(filename) {
  return [
    {type: 'field', name: 'title', value: 'Weird filename'},
    {type: 'file', name: filename, fixture: properFilename},
  ];
};

module.exports = {
  'osx-chrome-13.http': expect(properFilename),
  'osx-firefox-3.6.http': expect(properFilename),
  'osx-safari-5.http': expect(properFilename),
  'xp-chrome-12.http': expect(properFilename),
  'xp-ie-7.http': expect(properFilename),
  'xp-ie-8.http': expect(properFilename),
  'xp-safari-5.http': expect(properFilename),
};
