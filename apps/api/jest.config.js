/**
 * Jest configuration for apps/api.
 *
 * Unit tests live in test/ and are plain TypeScript files (no Nest
 * bootstrap needed for pure-function tests like quotes-compute.spec.ts).
 * ts-jest transforms on the fly; we don't ship a separate tsconfig for
 * tests because the root tsconfig.json already covers the relevant
 * globs via `include: ["src/**/*", "prisma/seed.ts"]` and ts-jest only
 * needs the compilerOptions anyway.
 */
/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  roots: ['<rootDir>/src', '<rootDir>/test'],
  testMatch: ['**/*.spec.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  moduleNameMapper: {
    // Map the workspace package so tests resolve it without a build step.
    '^@iw001/shared$': '<rootDir>/../../packages/shared/src/index.ts',
    '^@iw001/shared/(.*)$': '<rootDir>/../../packages/shared/src/$1',
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
};
