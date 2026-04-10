/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  roots: ['<rootDir>/src', '<rootDir>/test'],
  testMatch: ['**/*.spec.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  moduleNameMapper: {
    // Map the workspace package to its TS source so ts-jest can process it.
    '^@iw001/shared$': '<rootDir>/../../packages/shared/src/index.ts',
    '^@iw001/shared/(.*)$': '<rootDir>/../../packages/shared/src/$1',
    // Strip .js extensions from ESM-style relative imports so ts-jest
    // resolves ./foo.js to ./foo.ts. Needed because @iw001/shared uses
    // .js extensions (correct for ESM output) in its source imports.
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: {
          module: 'CommonJS',
          target: 'ES2022',
          esModuleInterop: true,
          experimentalDecorators: true,
          emitDecoratorMetadata: true,
          allowSyntheticDefaultImports: true,
          moduleResolution: 'node',
          strict: true,
        },
      },
    ],
  },
  // Transform @iw001/shared source files through ts-jest too (it lives
  // outside node_modules so the default ignore pattern already lets it
  // through, but this makes the intent explicit).
  transformIgnorePatterns: ['node_modules/(?!@iw001)'],
};
