module.exports = {
  preset: 'jest-expo',
  testPathIgnorePatterns: ['/node_modules/'],
  moduleNameMapper: {
    '^@topey/shared/(.*)$': '<rootDir>/../../packages/shared/$1',
  },
};
