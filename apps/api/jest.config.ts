import type { Config } from 'jest';

const config: Config = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	collectCoverage: false,
	testPathIgnorePatterns: [
		'<rootDir>/node_modules/',
		'<rootDir>/dist/',
		'<rootDir>/logs/',
		'<rootDir>/.turbo/',
	],
	projects: [
		{
			displayName: 'unit-tests',
			testRegex: '^(?!.*\\.db\\.test\\.ts$).*\\.test\\.ts$',
			testEnvironment: 'node',
			transform: {
				'^.+\\.ts$': 'ts-jest',
			},
		},
		{
			displayName: 'db-tests',
			testMatch: ['<rootDir>/tests/**/*.db.test.ts'],
			testEnvironment: 'node',
			globalSetup: '<rootDir>/jest.db.testSetup.ts',
			globalTeardown: '<rootDir>/jest.db.testTeardown.ts',
			transform: {
				'^.+\\.ts$': 'ts-jest',
			},
		}
	],
	moduleNameMapper: {
		"^db$": "<rootDir>/src/db",
	}
};

export default config;
