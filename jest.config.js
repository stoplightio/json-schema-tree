module.exports = {
  rootDir: process.cwd(),
  testEnvironment: 'node',
  setupFilesAfterEnv: ['./setupTests.ts'],
  testMatch: ['<rootDir>/src/**/__tests__/*.(ts|js)?(x)'],
  transform: {
    '\\.tsx?$': 'ts-jest',
  },
  coveragePathIgnorePatterns: ['/node_modules/', '/__tests__/', '/__stories__/', '__mocks__/', 'types.ts'],
  collectCoverageFrom: ['src/**/*.{ts,tsx}'],
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.build.json',
      diagnostics: {
        ignoreCodes: [151001],
      },
    },
  },
};
