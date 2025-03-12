module.exports = {
  testMatch: ['<rootDir>/src/__tests__/**/(*.)[jt]s?(x)'],
  testEnvironment: 'node',
  moduleDirectories: ['node_modules', 'src'],
  reporters: ['default', 'github-actions'],
  collectCoverageFrom: [
    '<rootDir>/src/**',
    '!<rootDir>/src/__tests__/**',
    '!<rootDir>/src/__fixtures__/**'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
