import type { Config } from 'jest';

const config: Config = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	collectCoverage: false,
	projects: [
		{
			displayName: 'unit-tests',
			testMatch: [
				'**/*.test.ts',
				'!**/*.db.test.ts'
			],
			testEnvironment: 'node',
			transform: {
				'^.+\\.ts$': 'ts-jest',
			},
		},
		{
			displayName: 'db-tests',
			testMatch: ['**/*.db.test.ts'],
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
