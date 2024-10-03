import type { Config } from 'jest';

const config: Config = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	collectCoverage: false,
	coverageDirectory: './tests/coverage',
	coverageReporters: ['json', 'html', 'lcov'],
	collectCoverageFrom: ['./src/**/*.ts'],
};

export default config;
