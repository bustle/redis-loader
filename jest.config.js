module.exports = {
  globals: {
    'ts-jest': {
      tsConfigFile: 'tsconfig.json'
    }
  },
  moduleFileExtensions: [
    'js',
    'ts'
  ],
  transform: {
    '^.+\\.(js|ts)$': './node_modules/ts-jest/preprocessor.js'
  },
  testMatch: [
    '**/*.test.(js|ts)'
  ],
  testEnvironment: 'node'
}
