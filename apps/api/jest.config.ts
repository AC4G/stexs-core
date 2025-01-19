import type { Config } from 'jest';

const config: Config = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	collectCoverage: false,
	projects: [
		{
			displayName: 'db-tests',
			testMatch: ['**/*.db.test.ts'],
			testEnvironment: 'node',
			globalSetup: '<rootDir>/jest.testSetup.ts',
			globalTeardown: '<rootDir>/jest.testTeardown.ts',
			transform: {
				'^.+\\.ts$': 'ts-jest',
			},
		},
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
		}
	]
};

export default config;
