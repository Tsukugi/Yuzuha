module.exports = {
  preset: '@react-native/jest-preset',
  testPathIgnorePatterns: ['/node_modules/', '/android/', '/ios/', '/dist/'],
  transformIgnorePatterns: ['node_modules/(?!((@)?react-native|@react-native|@react-native-vector-icons|@noble)/)'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(png|jpg|jpeg|gif|webp)$': '<rootDir>/test/assetMock.js',
  },
};
