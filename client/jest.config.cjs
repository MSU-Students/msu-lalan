/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'jsdom',
  testEnvironmentOptions: {
    customExportConditions: ['node', 'node-addons'],
  },
  moduleFileExtensions: ['js', 'ts', 'json', 'vue'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
    '^.+\\.vue$': '@vue/vue3-jest',
    '^.+\\.js$': 'babel-jest',
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^~/(.*)$': '<rootDir>/$1',
  },
  testMatch: ['**/test/**/*.spec.ts', '**/test/**/*.test.ts'],
  collectCoverageFrom: ['stores/**/*.ts', 'utils/**/*.ts'],
};
