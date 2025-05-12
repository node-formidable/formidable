'use strict';

module.exports = {
  statements: 70,
  branches: 70,
  functions: 70,
  lines: 70,

  'check-coverage': true,
  exclude: ['test'],
  include: ['src'],
  reporter: ['text', 'text-summary', 'lcov', 'clover'],
};
