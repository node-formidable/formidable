'use strict';

module.exports = {
  statements: 85,
  branches: 78,
  functions: 85,
  lines: 85,

  'check-coverage': true,
  exclude: ['test'],
  include: ['src'],
  reporter: ['text', 'text-summary', 'lcov', 'clover'],
};
