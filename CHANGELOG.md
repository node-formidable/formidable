
### Unreleased (2019-11-26)

 * Test only on Node.js >= v10. Support only Node LTS and latest ([#515](https://github.com/node-formidable/node-formidable/pull/515))
 * stop using deprecated features ([#516](https://github.com/node-formidable/node-formidable/pull/516), [#472](https://github.com/node-formidable/node-formidable/issues/472), [#406](https://github.com/node-formidable/node-formidable/issues/406))
 * throw error during data parsing ([#513](https://github.com/node-formidable/node-formidable/pull/513))
 * Array parameters support (array-like fields) ([#380](https://github.com/node-formidable/node-formidable/pull/380), [#340](https://github.com/node-formidable/node-formidable/pull/340))
 * possible partial fix of [#386](https://github.com/node-formidable/node-formidable/pull/386) with #380 (need tests and better implementation)

### v1.2.1 (2018-03-20)

 * `maxFileSize` option with default of 200MB (Charlike Mike Reagent, Nima Shahri)
 * Simplified buffering in JSON parser to avoid denial of service attack (Kornel)
 * Fixed upload file cleanup on aborted requests (liaoweiqiang)
 * Fixed error handling of closed _writeStream (Vitalii)

### v1.1.1 (2017-01-15)

 * Fix DeprecationWarning about os.tmpDir() (Christian)
 * Update `buffer.write` order of arguments for Node 7 (Kornel Lesiński)
 * JSON Parser emits error events to the IncomingForm (alessio.montagnani)
 * Improved Content-Disposition parsing (Sebastien)
 * Access WriteStream of fs during runtime instead of include time (Jonas Amundsen)
 * Use built-in toString to convert buffer to hex (Charmander)
 * Add hash to json if present (Nick Stamas)
 * Add license to package.json (Simen Bekkhus)

### v1.0.14 (2013-05-03)

* Add failing hash tests. (Ben Trask)
* Enable hash calculation again (Eugene Girshov)
* Test for immediate data events (Tim Smart)
* Re-arrange IncomingForm#parse (Tim Smart)

### v1.0.13

* Only update hash if update method exists (Sven Lito)
* According to travis v0.10 needs to go quoted (Sven Lito)
* Bumping build node versions (Sven Lito)
* Additional fix for empty requests (Eugene Girshov)
* Change the default to 1000, to match the new Node behaviour. (OrangeDog)
* Add ability to control maxKeys in the querystring parser. (OrangeDog)
* Adjust test case to work with node 0.9.x (Eugene Girshov)
* Update package.json (Sven Lito)
* Path adjustment according to eb4468b (Markus Ast)

### v1.0.12

* Emit error on aborted connections (Eugene Girshov)
* Add support for empty requests (Eugene Girshov)
* Fix name/filename handling in Content-Disposition (jesperp)
* Tolerate malformed closing boundary in multipart (Eugene Girshov)
* Ignore preamble in multipart messages (Eugene Girshov)
* Add support for application/json (Mike Frey, Carlos Rodriguez)
* Add support for Base64 encoding (Elmer Bulthuis)
* Add File#toJSON (TJ Holowaychuk)
* Remove support for Node.js 0.4 & 0.6 (Andrew Kelley)
* Documentation improvements (Sven Lito, Andre Azevedo)
* Add support for application/octet-stream (Ion Lupascu, Chris Scribner)
* Use os.tmpdir() to get tmp directory (Andrew Kelley)
* Improve package.json (Andrew Kelley, Sven Lito)
* Fix benchmark script (Andrew Kelley)
* Fix scope issue in incoming_forms (Sven Lito)
* Fix file handle leak on error (OrangeDog)
