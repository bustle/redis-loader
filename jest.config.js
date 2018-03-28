const Promise = require('bluebird')
global.Promise = Promise

module.exports = {
  globals: {
    'ts-jest': {
      tsConfigFile: 'tsconfig.json'
    }
  },
  moduleFileExtensions: [
    'js'
  ],
  transform: {
    '^.+\\.(js)$': './node_modules/ts-jest/preprocessor.js'
  },
  testMatch: [
    '**/test/**/*.test.js'
  ],
  testEnvironment: 'node'
}
