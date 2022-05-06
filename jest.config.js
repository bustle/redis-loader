module.exports = {
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json'
    }
  },
  moduleFileExtensions: [
    'js',
    'ts'
  ],
  transform: {
    '^.+\\.(js|ts)$': 'ts-jest'
  },
  testMatch: [
    '**/*.test.(js|ts)'
  ],
  testEnvironment: 'node',
  preset: 'ts-jest'
}